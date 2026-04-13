import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest, ApprovalStage, RequestStatus, RequestUrgency } from '../../../core/models/request.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';

@Component({
  selector: 'app-asset-requests',
  templateUrl: './asset-requests.component.html',
  styleUrls: ['./asset-requests.component.scss']
})
export class AssetRequestsComponent implements OnInit {
  allRequests: AssetRequest[] = [];
  filteredRequests: AssetRequest[] = [];
  pendingRequests: AssetRequest[] = [];
  activeTab: 'pending' | 'all' = 'pending';
  searchTerm = '';
  selectedStatus = '';
  selectedUrgency = '';
  statuses = Object.values(RequestStatus);
  urgencies = Object.values(RequestUrgency);
  availableAssets: any[] = [];
  selectedAssetId = '';
  allocationTeamMemberList: any[] = [];
  selectedAllocationMemberId = '';
  showActionModal = false;
  selectedRequest: AssetRequest | null = null;
  actionType: 'approve' | 'reject' | null = null;
  actionComments = '';

  showDetailModal = false;
  detailRequest: AssetRequest | null = null;

  requestStats = { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, inProgress: 0 };

  // Loading & error state
  isLoading = true;
  loadError = '';

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private userService: UserService,
    private assetService: AssetService
  ) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = this.authService.getCurrentUser();
      const approverId = currentUser?.id || 'usr_004';

      // Fetch all three in parallel: all requests, pending requests, and available assets
      const [allReqs, pendingReqs] = await Promise.all([
        this.requestService.fetchAllRequestsFromService(approverId),
        this.requestService.fetchPendingRequestsFromService(approverId),
        this.loadAvailableAssets()
      ]);

      this.allRequests = allReqs;
      this.pendingRequests = pendingReqs;
      const memberResult = await this.requestService.getAllocationTeamMemberAccordingtoManager(approverId);
      this.allocationTeamMemberList = Array.isArray(memberResult) ? memberResult : (memberResult ? [memberResult] : []);
      console.log('Allocation Team Members:', this.allocationTeamMemberList);
      // Stats from all requests (total count across all statuses)
      this.requestStats = this.requestService.getAllRequestStats();

      this.applyFilters();
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      this.loadError = err?.message || err?.errorThrown || 'Failed to load request data. Please try again.';
      this.allRequests = [];
      this.filteredRequests = [];
      this.pendingRequests = [];
    } finally {
      this.isLoading = false;
    }
  }

  async loadAvailableAssets(): Promise<void> {
    try {
      const allAssets = await this.assetService.fetchAssetDetailsFromService();
      this.availableAssets = allAssets.filter(a => a.status === 'Available');
      console.log(`Loaded ${this.availableAssets.length} available assets for dropdown`);
    } catch (err) {
      console.error('Failed to load available assets:', err);
      this.availableAssets = [];
    }
  }

  switchTab(tab: 'pending' | 'all'): void {
    this.activeTab = tab;
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedUrgency = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const source = this.activeTab === 'pending' ? this.pendingRequests : this.allRequests;
    this.filteredRequests = source.filter(req => {
      const matchesSearch = !this.searchTerm ||
        req.requestNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.category.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.selectedStatus || req.status === this.selectedStatus;
      const matchesUrgency = !this.selectedUrgency || req.urgency === this.selectedUrgency;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  getUrgencyClass(urgency: RequestUrgency): string {
    switch (urgency) {
      case RequestUrgency.CRITICAL: return 'urgency-critical';
      case RequestUrgency.HIGH: return 'urgency-high';
      case RequestUrgency.MEDIUM: return 'urgency-medium';
      case RequestUrgency.LOW: return 'urgency-low';
      default: return '';
    }
  }

  openActionModal(request: AssetRequest, action: 'approve' | 'reject'): void {
    console.log("Request is ", request);
    this.selectedRequest = request;
    this.actionType = action;
    this.actionComments = '';
    this.showActionModal = true;
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.selectedRequest = null;
    this.actionType = null;
    this.actionComments = '';
  }

  async directConfirmAction(request: AssetRequest, action: 'approve' | 'reject'): Promise<void> {
    this.selectedRequest = request;
    this.actionType = action;
    this.actionComments = '';
    console.log('Selected Allocation Member ID:', this.selectedAllocationMemberId);
    await this.confirmAction();
    this.closeDetailModal();
  }

  async confirmAction(): Promise<void> {
    debugger;
    //On approval
    //update the request approvals table with Asset Manager status on approved
    //update the asset table for that particular asset id with status  "Move To Allocation Team"
    //create new entry in  request approvals table with asset id in it 

    //On reject
    ////update the request approvals table with Asset Manager status on rejected
    //update the asset_request table with status rejected 
    console.log("Selected request is ", this.selectedRequest);
    if (!this.selectedRequest || !this.actionType) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    if (this.actionType === 'approve') {
      var req1 = {
        tuple: {
          old: {
            t_request_approvals: {
              approval_id: this.selectedRequest.approvalId,

            }
          }
          ,
          new: {
            t_request_approvals: {
              status: "Approved",
              remarks: this.actionComments,
            }

          }

        }
      }
      console.log("First request is", req1)
      await this.requestService.updateEntryForAssetManager(req1 as any)
      var req2 = {
        tuple: {
          old: {
            m_assets: {
              asset_id: this.selectedRequest.assignedAssetId,

            }
          }
          ,
          new: {
            m_assets: {
              status: "MoveToAllocationTeam",


            }
          }

        }
      }
      console.log("Request2 is ", req2);
      await this.requestService.updateAssetStatus(req2 as any)
      var req3 = {
        tuple: {
          new: {
            t_request_approvals: {
              approver_id: this.selectedAllocationMemberId,
              request_id: this.selectedRequest.id,
              role: "Allocation Team Member",
              status: "Pending",
              remarks: this.actionComments,
              temp1: this.selectedRequest.assignedAssetId,

            }
          }
        }
      }
      console.log("Third request is ", req3);
      await this.requestService.createEntryForTeamAllocationMember(req3 as any);
      var taskid = this.selectedRequest?.taskid;
      console.log("Taskid is  ", taskid);
      var req4 = {
        TaskId: `${taskid}`,
        Action: 'COMPLETE'
      }
      await this.requestService.completeUserTask(req4 as any)
      // this.requestService.approveRequest(
      //   this.selectedRequest.id,
      //   currentUser.id,
      //   currentUser.name,
      //   this.actionComments,
      //   ApprovalStage.ASSET_MANAGER
      // );
    } else {
      this.requestService.rejectRequest(
        this.selectedRequest.id,
        currentUser.id,
        currentUser.name,
        this.actionComments,
        ApprovalStage.ASSET_MANAGER
      );
    }

    this.closeActionModal();
    this.loadAllData();
  }

  getTimeSince(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return `${Math.floor(diff / 30)} months ago`;
  }

  getRequesterEmail(req: AssetRequest): string {
    if (req.requesterEmail) return req.requesterEmail;
    const user = this.userService.getUserById(req.requesterId);
    return user ? user.email : '—';
  }

  openDetailModal(request: AssetRequest): void {
    this.detailRequest = request;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailRequest = null;
  }

  getApprovalStageClass(action: string): string {
    switch (action) {
      case 'Approved': return 'stage-approved';
      case 'Rejected': return 'stage-rejected';
      case 'Pending': return 'stage-pending';
      case 'Skipped': return 'stage-skipped';
      default: return '';
    }
  }

  getApprovalIcon(action: string): string {
    switch (action) {
      case 'Approved': return 'check_circle';
      case 'Rejected': return 'cancel';
      case 'Pending': return 'radio_button_unchecked';
      case 'Skipped': return 'remove_circle_outline';
      default: return 'help_outline';
    }
  }

  onAssetSelect(assetId: string): void {
    if (!this.detailRequest) return;

    if (!assetId) {
      this.detailRequest.assignedAssetId = '';
      this.detailRequest.assignedTypeId = '';
      this.detailRequest.assignedSubCategoryId = '';
      this.detailRequest.assignedSerial = '';
      this.detailRequest.assignedPurchaseDate = '';
      this.detailRequest.assignedWarrantyExpiry = '';
      return;
    }

    const asset = this.availableAssets.find(a => a.asset_id === assetId);
    if (asset) {
      this.detailRequest.assignedAssetId = asset.asset_id;
      this.detailRequest.assignedTypeId = asset.type_id;
      this.detailRequest.assignedSubCategoryId = asset.sub_category_id || '—';
      this.detailRequest.assignedSerial = asset.serial_number || '—';
      this.detailRequest.assignedPurchaseDate = asset.purchase_date || '—';
      this.detailRequest.assignedWarrantyExpiry = asset.warranty_expiry || '—';
    }
  }

  onMemberSelect(memberId: string): void {
    this.selectedAllocationMemberId = memberId;
    console.log('Allocation member selected:', this.selectedAllocationMemberId);
  }

  viewDocument(docName: string): void {
    // Mock implementation for viewing document
    alert(`Viewing document: ${docName}`);
  }

  downloadDocument(docName: string): void {
    // Mock implementation for downloading document
    alert(`Downloading document: ${docName}`);
  }
}
