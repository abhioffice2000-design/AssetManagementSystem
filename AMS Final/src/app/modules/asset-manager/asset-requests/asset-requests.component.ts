import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest, ApprovalStage, RequestStatus, RequestUrgency } from '../../../core/models/request.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';
import { Asset, AssetStatus } from '../../../core/models/asset.model';

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
  availableAssets: Asset[] = [];
  selectedAssetId = '';

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
  ) {}

  ngOnInit(): void {
    this.loadRequests();
    this.availableAssets = this.assetService.getAssetsByStatus(AssetStatus.AVAILABLE);
  }

  async loadRequests(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const requests = await this.requestService.fetchPendingRequestsFromService();
      this.allRequests = requests;
      this.requestStats = this.requestService.getRequestStats();
      this.pendingRequests = this.requestService.getPendingApprovals('', ApprovalStage.ASSET_MANAGER);
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

  confirmAction(): void {
    if (!this.selectedRequest || !this.actionType) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    if (this.actionType === 'approve') {
      this.requestService.approveRequest(
        this.selectedRequest.id,
        currentUser.id,
        currentUser.name,
        this.actionComments,
        ApprovalStage.ASSET_MANAGER
      );
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
    this.loadRequests();
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

    const asset = this.availableAssets.find(a => a.id === assetId);
    if (asset) {
      this.detailRequest.assignedAssetId = asset.assetTag;
      this.detailRequest.assignedTypeId = asset.type;
      this.detailRequest.assignedSubCategoryId = asset.subCategory || '—';
      this.detailRequest.assignedSerial = asset.serialNumber;
      this.detailRequest.assignedPurchaseDate = asset.purchaseDate || '—';
      this.detailRequest.assignedWarrantyExpiry = asset.warrantyExpiry || '—';
    }
  }
}
