import { Component, OnInit } from '@angular/core';
import { AssetRequest, ApprovalStage } from '../../../core/models/request.model';
import { HeroService } from '../../../core/services/hero.service';
import { RequestService } from '../../../core/services/request.service';
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
    private hs: HeroService,
    private requestService: RequestService
  ) { }

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
    this.hs.ajax('GetallpendingrequestsForParticularTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { Approver_id: this.userDetails.user_id }
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, "t_asset_requests");
      const rawData = Array.isArray(result) ? result : [result];



      // Map database fields to the AssetRequest interface
      this.pendingRequests = rawData
        .map((item: any) => {
          console.log("Item is ", item);
          // Based on API response: t_request_approvals contains joined objects
          const reqItem = item.t_asset_requests || {};
          const userInfo = item.m_users || {};
          const subCategory = item.m_asset_subcategories || {};
          console.log("Username is ", userInfo.name);
          return {
            approvalId: item.t_request_approvals.approval_id || '',
            id: reqItem.request_id || item.request_id,
            requestNumber: reqItem.request_id || item.request_id,
            requesterId: reqItem.user_id,
            requesterName: userInfo.name,
            requesterTeam: (userInfo.m_projects && userInfo.m_projects.project_name) ? userInfo.m_projects.project_name : (userInfo.team || ''),
            category: subCategory.sub_category || item.asset_type,
            assetType: subCategory.name,
            description: reqItem.purpose,
            urgency: item.urgency,
            status: item.t_request_approvals.status || 'Pending',
            reason: item.reason,
            remarks: item.t_request_approvals.remarks || 'No remarks',
            requestDate: reqItem.created_at || reqItem.request_date || new Date().toISOString(),
            currentStage: ApprovalStage.TEAM_LEAD,
            taskid: item.t_request_approvals.temp2
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
    console.log(this.selectedRequest);
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
  async handleApprove() {
    console.log(this.selectedRequest);
    if (!this.selectedRequest?.approvalId) {
      alert("No approval record found for this request");
      return;
    }

    try {
      this.isLoading = true;
      var req1 = {
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
      };

      var res2 = await this.requestService.updateEntryForTeamLead(req1 as any);
      var newrequestid = this.selectedRequest.requestNumber;
      console.log("Taskid response is", res2);
      
      var taskid = this.selectedRequest?.taskid;
      console.log("taskid", taskid);
      
      var request2 = {
        tuple: {
          new: {
            t_request_approvals: {
              request_id: `${newrequestid}`,
              approver_id: 'usr_004',
              role: 'Asset Manager',
              status: 'Pending'
            }
          }
        }
      };
      
      var res3 = await this.requestService.updateEntryForTeamLead(request2 as any);
      console.log("res3", res3);
      
      var req3 = {
        TaskId: `${taskid}`,
        Action: 'COMPLETE'
      };
      
      await this.requestService.completeUserTask(req3 as any);

      alert('Request Approved successfully');
      this.selectedRequest = null;
      this.tl_remarks = '';
      this.getallrequests();
    } catch (error) {
      console.error("Approval error:", error);
      alert("Failed to approve request. Please try again.");
      this.isLoading = false;
    }
  }

  async handleReject() {
    if (!this.selectedRequest?.approvalId) {
      alert("No approval record found for this request");
      return;
    }

    if (!this.tl_remarks || !this.tl_remarks.trim()) {
      alert("Please enter remarks before rejecting.");
      return;
    }

    try {
      this.isLoading = true;
      var req1 = {
        tuple: {
          old: {
            "t_request_approvals": {
              approval_id: this.selectedRequest.approvalId
            }
          },
          new: {
            "t_request_approvals": {
              status: "Rejected",
              remarks: this.tl_remarks
            }
          }
        }
      };

      await this.requestService.updateEntryForTeamLead(req1 as any);

      // Update the master asset request status to Rejected
      var req2 = {
        tuple: {
          old: {
            "t_asset_requests": {
              request_id: this.selectedRequest.requestNumber
            }
          },
          new: {
            "t_asset_requests": {
              status: "Rejected"
            }
          }
        }
      };
      await this.requestService.submitNewRequestForm(req2 as any);

      // Complete the BPM task
      var taskid = this.selectedRequest?.taskid;
      if (taskid) {
        var req3 = {
          TaskId: `${taskid}`,
          Action: 'COMPLETE'
        };
        await this.requestService.completeUserTask(req3 as any);
      }

      alert('Request Rejected successfully');
      this.selectedRequest = null;
      this.tl_remarks = '';
      this.getallrequests();
    } catch (error) {
      console.error("Rejection error:", error);
      alert("Failed to reject request. Please try again.");
      this.isLoading = false;
    }
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }

}
