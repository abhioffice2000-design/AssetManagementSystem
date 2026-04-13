import { Component, OnInit } from '@angular/core';
import { AssetRequest, ApprovalStage } from '../../../core/models/request.model';
import { HeroService } from '../../../core/services/hero.service';

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.scss']
})
export class PendingApprovalsComponent implements OnInit {
  pendingRequests: AssetRequest[] = [];
  selectedRequest: AssetRequest | null = null;
  user: any;
  userDetails: any;
  isLoading = false;

  // Pagination & Filtering
  currentPage = 1;
  pageSize = 5;
  searchTerm = '';
  tl_remarks = '';

  constructor(
    private hs: HeroService
  ) {}

  ngOnInit(): void {
    this.getuser();
  }

  getuser() {
    this.isLoading = true;
    this.hs.ajax('GetUserDetails', 'http://schemas.cordys.com/UserManagement/1.0/User', {}
    ).then((resp: any) => {
      this.user = this.hs.xmltojson(resp, "User");
      this.getuserdetails();
    }).catch(err => {
      console.error("Error fetching user details in getuser:", err);
      this.isLoading = false;
    });
  }

  getuserdetails() {
    const targetUsername = this.user?.UserName || this.user?.username || '';
    
    this.hs.ajax('Getuserbyusername', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { username: targetUsername }
    ).then((resp: any) => {
      this.userDetails = this.hs.xmltojson(resp, "m_users");
      this.getallrequests();
    }).catch(err => {
      console.error("Error fetching detailed user info in getuserdetails:", err);
      this.isLoading = false;
    });
  }

  getallrequests() {
    this.isLoading = true;
    this.hs.ajax('GetPendingRequestsForTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata',
      {}
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, "t_request_approvals");
      const rawData = Array.isArray(result) ? result : [result];

      // Map database fields to the AssetRequest interface
      this.pendingRequests = rawData
        .map((item: any) => {
          // Based on API response: t_request_approvals contains joined objects
          const reqItem = item.t_asset_requests || {}; 
          const userInfo = item.m_users || {};
          const subCategory = item.m_asset_subcategories || {};

          return {
            approvalId: item.approval_id || '',
            id: reqItem.request_id || item.request_id,
            requestNumber: reqItem.request_id || item.request_id,
            requesterId: reqItem.user_id,
            requesterName: userInfo.name || 'Unknown',
            requesterTeam: userInfo.team || 'General',
            category: reqItem.asset_type || 'General',
            assetType: subCategory.name || reqItem.asset_name || '', 
            description: reqItem.purpose || '',
            urgency: reqItem.urgency || 'Medium',
            status: item.status || 'Pending', // Restored column mapping
            requestDate: reqItem.created_at || reqItem.request_date || new Date().toISOString(),
            currentStage: ApprovalStage.TEAM_LEAD
          } as unknown as AssetRequest;
        }).sort((a: any, b: any) => b.requestNumber.localeCompare(a.requestNumber));

      this.isLoading = false;
    }).catch(err => {
      console.error("Error fetching requests:", err);
      this.isLoading = false;
    });
  }

  get filteredRequests(): AssetRequest[] {
    if (!this.searchTerm.trim()) return this.pendingRequests;
    const term = this.searchTerm.toLowerCase();
    return this.pendingRequests.filter(req => 
      req.requestNumber.toLowerCase().includes(term) ||
      req.requesterName.toLowerCase().includes(term) ||
      req.category.toLowerCase().includes(term) ||
      req.assetType.toLowerCase().includes(term) ||
      req.status.toLowerCase().includes(term)
    );
  }

  get paginatedRequests(): AssetRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.selectedRequest = null;
    }
  }

  selectRequest(req: AssetRequest): void {
    this.selectedRequest = req;
  }

  cancelSelection(): void {
    this.selectedRequest = null;
  }

  markAsAccept(): void {
    if (this.selectedRequest) {
      this.handleApprove();
    }
  }

  markAsReject(): void {
    if (this.selectedRequest) {
      this.handleReject();
    }
  }

  handleApprove() {
    if (!this.selectedRequest?.approvalId) {
      alert("No approval record found for this request");
      return;
    }

    if (!this.tl_remarks || !this.tl_remarks.trim()) {
      alert("Please enter remarks before approving.");
      return;
    }

    this.isLoading = true;
    
    // Step 1: Update current Team Lead approval record to 'Approved'
    this.hs.ajax('UpdateT_request_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', {
      tuple: {
        old: {
          "t_request_approvals": {
            approval_id: this.selectedRequest.approvalId
          }
        },
        new: {
          "t_request_approvals": {
            status: "Approved",
            remarks: this.tl_remarks || 'Approved by Team Lead'
          }
        }
      }
    }).then(() => {
      // Step 2: Insert new record for the next approval stage (Asset Manager)
      const requestId = this.selectedRequest?.requestNumber || this.selectedRequest?.id;
      
      const nextStageParams = {
        tuple: {
          new: {
            "t_request_approvals": {
              "request_id": requestId,
              "approver_id": "usr_004", // Hardcoded as per sample request
              "role": "Asset Manager",  // Hardcoded as per sample request
              "status": "Pending",      // Hardcoded as per sample request
              "remarks": ""
            }
          }
        }
      };

      return this.hs.ajax('UpdateT_request_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', nextStageParams);
    }).then(() => {
      alert('Request Approved and forwarded to Asset Manager successfully');
      this.selectedRequest = null;
      this.tl_remarks = '';
      this.getallrequests();
    }).catch(err => {
      console.error("Approval flow error:", err);
      alert("Failed to complete approval process. Please try again.");
      this.isLoading = false;
    });
  }

  handleReject() {
    if (!this.selectedRequest?.approvalId) {
      alert("No approval record found for this request");
      return;
    }

    if (!this.tl_remarks || !this.tl_remarks.trim()) {
      alert("Please enter remarks before rejecting.");
      return;
    }

    this.isLoading = true;
    this.hs.ajax('UpdateT_request_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', {
      tuple: {
        old: {
          "t_request_approvals": {
            approval_id: this.selectedRequest.approvalId
          }
        },
        new: {
          "t_request_approvals": {
            status: "Rejected",
            remarks: this.tl_remarks || 'Rejected by Team Lead'
          }
        }
      }
    }).then(() => {
      alert('Request Rejected successfully');
      this.selectedRequest = null;
      this.tl_remarks = '';
      this.getallrequests();
    }).catch(err => {
      console.error("Rejection error:", err);
      alert("Failed to reject request. Please try again.");
      this.isLoading = false;
    });
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }

}
