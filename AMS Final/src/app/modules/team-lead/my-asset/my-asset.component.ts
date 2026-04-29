import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { HeroService } from '../../../core/services/hero.service';
import { Asset } from '../../../core/models/asset.model';
import { AssetRequest } from '../../../core/models/request.model';
import { NotificationService } from '../../../core/services/notification.service';


@Component({
  selector: 'app-my-asset',
  templateUrl: './my-asset.component.html',
  styleUrls: ['./my-asset.component.scss']
})
export class MyAssetComponent implements OnInit {
  myAssets: Asset[] = [];
  pendingRequests: AssetRequest[] = [];
  expiringWarrantyCount: number = 0;
  expiredWarrantyCount: number = 0;
  isLoading = false;
  isLoadingRequests = false;
  activeTab: 'assets' | 'requests' = 'assets';
  selectedRequest: AssetRequest | null = null;
  approvalChain: any[] = [];
  loadingProgress = false;
  showTrackingModal = false;
  showConfirmModal = false;
  confirmationRemarks = '';
  selectedConfirmRequest: AssetRequest | null = null;
  
  // Re-edit Rejected Requests
  showEditModal = false;
  isSubmittingEdit = false;
  editForm = {
    urgency: '',
    justification: '',
    assetType: '',
    category: '',
    requestId: ''
  };

  responseData = '';
  approval_id = '';
  task_id = '';

  // Assets Pagination
  assetsCurrentPage = 1;
  assetsPageSize = 5;

  // Requests Pagination
  requestsCurrentPage = 1;
  requestsPageSize = 5;

  get paginatedAssets(): Asset[] {
    const startIndex = (this.assetsCurrentPage - 1) * this.assetsPageSize;
    return this.myAssets.slice(startIndex, startIndex + this.assetsPageSize);
  }

  get totalAssetsPages(): number {
    return Math.ceil(this.myAssets.length / this.assetsPageSize) || 1;
  }

  changeAssetsPage(page: number): void {
    if (page >= 1 && page <= this.totalAssetsPages) {
      this.assetsCurrentPage = page;
    }
  }

  get paginatedRequests(): AssetRequest[] {
    const startIndex = (this.requestsCurrentPage - 1) * this.requestsPageSize;
    return this.pendingRequests.slice(startIndex, startIndex + this.requestsPageSize);
  }

  get totalRequestsPages(): number {
    return Math.ceil(this.pendingRequests.length / this.requestsPageSize) || 1;
  }

  changeRequestsPage(page: number): void {
    if (page >= 1 && page <= this.totalRequestsPages) {
      this.requestsCurrentPage = page;
    }
  }

  constructor(
    private authService: AuthService,
    private assetService: AssetService,
    private requestService: RequestService,
    private hs: HeroService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.isLoading = true;

    // Fetch current assets from Cordys
    this.getAssetsByUser(user.id);

    // Fetch pending requests from Cordys
    this.PendingRequestsForTeamLead(user.id);
  }

  switchTab(tab: 'assets' | 'requests'): void {
    this.activeTab = tab;
    // Refresh pending requests when clicking the tab
    if (tab === 'requests') {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.PendingRequestsForTeamLead(user.id);
      }
    }
  }

  private calculateExpiringWarranty(): void {
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);
    
    this.expiringWarrantyCount = 0;
    this.expiredWarrantyCount = 0;
    
    this.myAssets.forEach(a => {
      if (!a.warrantyExpiry) return;
      const expiry = new Date(a.warrantyExpiry);
      
      if (expiry < now) {
        this.expiredWarrantyCount++;
      } else if (expiry <= ninetyDaysFromNow) {
        this.expiringWarrantyCount++;
      }
    });
  }

  getAssetsByUser(userId?: string): void {
    this.isLoading = true;
    this.hs.ajax('GetAssetsByUser', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { userId: userId || '' }
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, 'm_assets');
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];

      // Map m_assets fields to the Asset interface used by the table
      this.myAssets = rawData.map((item: any) => ({
        id: item.asset_id || item.id || '',
        assetTag: item.serial_number || item.asset_tag || item.asset_id || '',
        name: item.asset_name || item.name || '',
        category: item.m_asset_subcategories?.name || item.m_asset_subcategories?.Name || item.category || item.asset_type || '',
        condition: item.condition || 'Good',
        status: item.status || 'Allocated',
        warrantyExpiry: item.warranty_expiry || item.warrantyExpiry || '',
        assignedTo: item.user_id || userId || ''
      } as any));

      this.assetsCurrentPage = 1; // Reset pagination
      console.log('[MyAsset] My assets from Cordys:', this.myAssets);
      this.calculateExpiringWarranty();
      this.isLoading = false;
    }).catch((err: any) => {
      console.error('[MyAsset] Error fetching assets:', err);
      // Fallback to local mock data
      const user = this.authService.getCurrentUser();
      if (user) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
        this.calculateExpiringWarranty();
      }
      this.isLoading = false;
    });
  }

  PendingRequestsForTeamLead(userId?: string): void {
    if (!userId) return;
    this.isLoadingRequests = true;

    // Fetch requests for the logged-in user
    this.requestService.getAllRequestsBasedOnLoggedInUser(userId)
      .then((requests: AssetRequest[]) => {
        // Include 'Approved' status as well, as these are ready for confirmation
        this.pendingRequests = requests.filter((req: AssetRequest) =>
          req.status === 'Pending' ||
          req.status === 'In Progress' ||
          req.status === 'Approved'
        );
        this.requestsCurrentPage = 1;
        console.log('[MyAsset] PendingRequestsForTeamLead count:', this.pendingRequests.length);
        this.isLoadingRequests = false;
      }).catch(() => this.isLoadingRequests = false);
  }

  async returnAsset(asset: Asset) {
    if (!confirm(`Are you sure you want to return ${asset.name}?`)) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.notificationService.showToast("User session not found.", "error");
      return;
    }


    this.isLoading = true;
    try {
      const returnPayload = {
        tuple: {
          new: {
            t_asset_returns: {
              requested_by: user.id,
              status: "Pending",
              return_date: new Date().toISOString().split('T')[0],
              remarks: "Returned by user",
              temp1: asset.id
            }
          }
        }
      };

      const res1 = await this.hs.ajax('UpdateT_asset_returns', 'http://schemas.cordys.com/AMS_Database_Metadata', returnPayload);
      
      // Attempt to extract the newly generated ID from the first insert, fallback to asset.id if not found
      const returnData = this.hs.xmltojson(res1, 't_asset_returns');
      const newReturnId = (returnData && (returnData.id || returnData.return_id)) ? (returnData.id || returnData.return_id) : asset.id;
      
      const approvalPayload = {
        tuple: {
          new: {
            t_asset_return_approvals: {
              request_id: newReturnId,
              approver_id: 'usr_004',
              role: 'Asset Manager',
              status: "Pending"
            }
          }
        }
      };
      await this.hs.ajax('UpdateT_asset_return_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', approvalPayload);
      
      this.notificationService.showToast('Asset return requested successfully', 'success');

      
      this.getAssetsByUser(user.id);
      this.PendingRequestsForTeamLead(user.id); // Refresh pending requests occasionally
    } catch (err) {
      console.error("Return error:", err);
      this.notificationService.showToast("Failed to return asset. Please check the network payload.", "error");
      this.isLoading = false;
    }

  }

  async extendWarranty(asset: Asset) {
    if (!confirm(`Are you sure you want to request a warranty extension for ${asset.name}?`)) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.notificationService.showToast("User session not found.", "error");
      return;
    }


    this.isLoading = true;
    try {
      const extensionPayload = {
        tuple: {
          new: {
            t_asset_returns: { // Assuming same table based on your instructions, if different update here
              asset_id: asset.id,
              requested_by: user.id,
              status: "Pending",
              request_type: "Extend Warranty",
              remarks: "Warranty Extension Requested"
            }
          }
        }
      };
      
      const res1 = await this.hs.ajax('UpdateT_asset_returns', 'http://schemas.cordys.com/AMS_Database_Metadata', extensionPayload);
      
      const returnData = this.hs.xmltojson(res1, 't_asset_returns');
      const newReturnId = (returnData && (returnData.id || returnData.return_id)) ? (returnData.id || returnData.return_id) : asset.id;

      const approvalPayload = {
        tuple: {
          new: {
            t_asset_return_approvals: { 
              request_id: newReturnId,
              approver_id: 'usr_004',
              role: 'Asset Manager',
              status: "Pending"
            }
          }
        }
      };
      await this.hs.ajax('UpdateT_asset_return_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', approvalPayload);

      this.notificationService.showToast('Warranty extension requested successfully', 'success');

      
      this.getAssetsByUser(user.id);
      this.PendingRequestsForTeamLead(user.id);
    } catch (err) {
      console.error("Extend Warranty error:", err);
      this.notificationService.showToast("Failed to request warranty extension. Please check the network payload.", "error");
      this.isLoading = false;
    }

  }

  // --- Tracking Logic ---
  async trackRequest(req: AssetRequest) {
    this.selectedRequest = req;
    this.showTrackingModal = true;
    this.loadingProgress = true;
    this.approvalChain = [];
    
    try {
      const progressData = await this.requestService.getRequestProgress(req.id);
      
      // Sort to ensure chronological order
      progressData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const stages = [
        { name: 'Team Lead Approval', roles: ['team lead', 'approver'] },
        { name: 'Asset Manager Approval', roles: ['asset manager', 'mgr'] },
        { name: 'Asset Allocation', roles: ['asset allocation', 'allocation', 'team'] }
      ];
      
      let availableProgress = [...progressData];

      this.approvalChain = stages.map((stage, index) => {
        const foundIndex = availableProgress.findIndex(p => 
          stage.roles.some(role => p.stage.toLowerCase().includes(role))
        );
        
        let data = null;
        if (foundIndex !== -1) {
          data = availableProgress[foundIndex];
          availableProgress.splice(foundIndex, 1);
        }
        
        let isCompleted = false;
        let isCurrent = false;

        if (data) {
          isCompleted = data.status === 'Approved' || data.status === 'Completed';
          isCurrent = data.status === 'Pending';
        } else {
          isCompleted = false;
        }
        
        return {
          stage: stage.name,
          status: data ? data.status : (isCompleted ? 'Approved' : 'Pending'),
          approverName: data?.approverName || 'Assigned Approver',
          timestamp: data?.timestamp,
          isCompleted: isCompleted,
          isCurrent: isCurrent,
          comments: data?.comments
        };
      });

      // Handle current stage logic
      for (let i = 0; i < this.approvalChain.length; i++) {
        if (!this.approvalChain[i].isCompleted && !this.approvalChain[i].isCurrent) {
          if (i > 0 && this.approvalChain[i-1].isCompleted) {
             this.approvalChain[i].isCurrent = true;
             break;
          } else if (i === 0) {
             this.approvalChain[0].isCurrent = true;
             break;
          }
        }
      }

    } catch (err) {
      console.error('[MyAsset] Failed to load progress:', err);
    } finally {
      this.loadingProgress = false;
    }
  }

  closeTrackingModal() {
    this.showTrackingModal = false;
    this.selectedRequest = null;
  }

  getApprovalStageClass(status: string): string {
    switch (status) {
      case 'Approved': case 'Completed': return 'stage-approved';
      case 'Rejected': return 'stage-rejected';
      case 'Pending': return 'stage-pending';
      case 'Skipped': return 'stage-skipped';
      default: return '';
    }
  }

  getApprovalIcon(status: string): string {
    switch (status) {
      case 'Approved': case 'Completed': return 'check_circle';
      case 'Rejected': return 'cancel';
      case 'Pending': return 'radio_button_unchecked';
      case 'Skipped': return 'remove_circle_outline';
      default: return 'help_outline';
    }
  }

  // --- Confirmation Logic ---
  openConfirmModal(req: AssetRequest) {
    this.selectedConfirmRequest = req;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.selectedConfirmRequest = null;
    this.confirmationRemarks = '';
  }

  Getassetidbyapprovalid(request_id: any) {
    return this.hs.ajax('Getassetidbyapprovalid', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { Request_id: request_id }
    ).then((resp: any) => {
      this.responseData = resp.tuple.old.t_request_approvals.temp1;
      this.approval_id = resp.tuple.old.t_request_approvals.approval_id;
      this.task_id = resp.tuple.old.t_request_approvals.temp2;
      console.log("approval id.......................", this.approval_id);
    });
  }

  async submitConfirmation() {
    if (!this.selectedConfirmRequest) return;
    
    console.log('[MyAsset] Confirmation process started for:', this.selectedConfirmRequest);
    this.isLoading = true;
    try {
      const requestId = this.selectedConfirmRequest.requestNumber;
      
      // Fetch dynamic details first (like asset_id, approval_id, task_id)
      await this.Getassetidbyapprovalid(requestId);

      const updateReq = {
        tuple: {
          old: { t_asset_requests: { request_id: requestId } },
          new: { t_asset_requests: { status: 'Approved' } }
        }
      };

      console.log('[MyAsset] Updating request status to Approved:', requestId);
      await this.requestService.submitNewRequestForm(updateReq);
      
      // Update the master asset status to Allocated
      if (this.responseData) {
        const assetUpdateReq = {
          tuple: {
            old: { m_assets: { asset_id: this.responseData } },
            new: { m_assets: { status: 'Allocated', temp1: this.authService.getCurrentUser()?.id } }
          }
        };
        console.log('[MyAsset] Updating master asset status to Allocated for Asset ID:', this.responseData);
        await this.requestService.updateAssetStatus(assetUpdateReq);
      }

      // Update the approval record status to Completed (equivalent to Employee's createEntryForRequestor logic)
      if (this.approval_id) {
        const updateReq2 = {
          tuple: {
            old: { t_request_approvals: { approval_id: this.approval_id } },
            new: { t_request_approvals: { status: 'Approved' } }
          }
        };
        console.log('[MyAsset] Updating approval record to Approved:', this.approval_id);
        await this.requestService.updateEntryForTeamLead(updateReq2);
      }


      // Complete the BPM task
      if (this.task_id) {
        const req3 = {
          TaskId: `${this.task_id}`,
          Action: 'COMPLETE'
        };
        console.log('[MyAsset] Completing BPM Task:', this.task_id);
        await this.requestService.completeUserTask(req3 as any);
      }

      alert('Asset receipt confirmed successfully!');
      this.closeConfirmModal();
      this.closeTrackingModal();
      
      // Refresh list
      const user = this.authService.getCurrentUser();
      if (user) {
        this.PendingRequestsForTeamLead(user.id);
      }
    } catch (err) {
      console.error('[MyAsset] Confirmation error:', err);
      alert('Failed to confirm asset receipt. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  // --- Re-Edit / Resubmit Logic ---
  openEditModal(req: AssetRequest) {
    this.selectedRequest = req;
    this.editForm = {
      urgency: req.urgency,
      justification: req.justification || '',
      assetType: req.assetType,
      category: req.category,
      requestId: req.requestNumber
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  async resubmitRequest() {
    if (!this.selectedRequest) return;
    
    this.isSubmittingEdit = true;
    try {
      const updatePayload = {
        tuple: {
          old: { t_asset_requests: { request_id: this.editForm.requestId } },
          new: { 
            t_asset_requests: { 
              status: 'Pending', // Reset to pending for re-approval
              urgency: this.editForm.urgency,
              justification: this.editForm.justification,
              asset_type: this.editForm.assetType,
              category: this.editForm.category,
              updated_at: new Date().toISOString()
            } 
          }
        }
      };

      await this.requestService.submitNewRequestForm(updatePayload);
      
      alert('Request resubmitted successfully! It will now go through the approval process again.');
      this.closeEditModal();
      this.PendingRequestsForTeamLead(this.authService.getCurrentUser()?.id);
    } catch (err) {
      console.error('[MyAsset] Resubmit error:', err);
      alert('Failed to resubmit request.');
    } finally {
      this.isSubmittingEdit = false;
    }
  }

  async withdrawRequest() {
    if (!this.selectedRequest || !confirm('Are you sure you want to withdraw this request? This action cannot be undone.')) return;
    
    this.isSubmittingEdit = true;
    try {
      const updatePayload = {
        tuple: {
          old: { t_asset_requests: { request_id: this.selectedRequest.requestNumber } },
          new: { t_asset_requests: { status: 'Cancelled' } }
        }
      };

      await this.requestService.submitNewRequestForm(updatePayload);
      
      alert('Request withdrawn successfully.');
      this.closeEditModal();
      this.PendingRequestsForTeamLead(this.authService.getCurrentUser()?.id);
    } catch (err) {
      console.error('[MyAsset] Withdraw error:', err);
      alert('Failed to withdraw request.');
    } finally {
      this.isSubmittingEdit = false;
    }
  }

}

