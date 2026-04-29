import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest, ApprovalStage, RequestStatus, RequestUrgency, RequestType } from '../../../core/models/request.model';
import { AuthService } from '../../../core/services/auth.service';
import { AssetService } from '../../../core/services/asset.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-warranty-requests',
  templateUrl: './warranty-requests.component.html',
  styleUrls: ['./warranty-requests.component.scss']
})
export class WarrantyRequestsComponent implements OnInit {
  warrantyRequests: AssetRequest[] = [];
  filteredWarrantyRequests: AssetRequest[] = [];

  searchTerm = '';
  selectedStatus = '';
  selectedUrgency = '';

  activeTab: 'pending' | 'resolved' = 'pending';
  statuses = Object.values(RequestStatus);
  urgencies = Object.values(RequestUrgency);

  allWarrantyRequests: AssetRequest[] = [];

  allocationTeamMemberList: any[] = [];
  selectedAllocationMemberId = '';

  showDetailModal = false;
  showActionModal = false;
  detailRequest: AssetRequest | null = null;
  actionType: 'approve' | 'reject' | null = null;
  actionComments = '';

  isLoading = true;
  loadError = '';

  // Pagination
  currentPage = 1;
  pageSize = 5;
  protected readonly Math = Math;

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private assetService: AssetService,
    private userService: UserService,
    private notificationService: NotificationService,
    private mailService: MailService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = this.authService.getCurrentUser();
      const approverId = currentUser?.id || 'usr_004';
      console.log("user id", currentUser?.id)

      const [pendingReqs, allReqs, memberResult] = await Promise.all([
        this.requestService.fetchPendingWarrantyApprovalsFromService(approverId),
        this.requestService.fetchAllWarrantyRequests(),
        this.requestService.getAllocationTeamMemberAccordingtoManager(approverId)
      ]);

      this.warrantyRequests = pendingReqs;
      this.allWarrantyRequests = allReqs;
      
      console.log("warrantyReqs", pendingReqs);
      console.log("allWarrantyRequests", allReqs);

      // Normalize team members to a flat structure
      const rawMembers = Array.isArray(memberResult) ? memberResult : (memberResult ? [memberResult] : []);
      this.allocationTeamMemberList = rawMembers.map((m: any) => ({
        user_id: m?.old?.m_users?.user_id || m?.m_users?.user_id || m?.user_id || '',
        name: m?.old?.m_users?.name || m?.m_users?.name || m?.name || 'Unknown',
        email: m?.old?.m_users?.email || m?.m_users?.email || m?.email || ''
      }));

      this.applyFilters();
    } catch (err: any) {
      console.error('Failed to load warranty requests:', err);
      this.loadError = 'Failed to load request data. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    const source = this.activeTab === 'pending' ? this.warrantyRequests : this.resolvedWarrantyRequests;

    this.filteredWarrantyRequests = source.filter(req => {
      const matchesSearch = !this.searchTerm ||
        req.requestNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.assetName?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.selectedStatus || req.status === this.selectedStatus;
      const matchesUrgency = !this.selectedUrgency || req.urgency === this.selectedUrgency;
      return matchesSearch && matchesStatus && matchesUrgency;
    }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    this.currentPage = 1;
  }

  get resolvedWarrantyRequests(): AssetRequest[] {
    return this.allWarrantyRequests.filter(req => 
      req.status === RequestStatus.COMPLETED || 
      req.status === RequestStatus.REJECTED || 
      req.status === RequestStatus.CANCELLED
    );
  }

  setTab(tab: 'pending' | 'resolved'): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  get paginatedRequests(): AssetRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredWarrantyRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredWarrantyRequests.length / this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get paginationDisplayRange(): string {
    if (this.filteredWarrantyRequests.length === 0) return '0 - 0 of 0';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredWarrantyRequests.length);
    return `${start} - ${end} of ${this.filteredWarrantyRequests.length}`;
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

  async openDetailModal(request: AssetRequest): Promise<void> {
    this.detailRequest = { ...request };
    this.actionComments = '';
    this.selectedAllocationMemberId = '';

    try {
      // Fetch fresh data using user-provided SOAP request logic
      const rawData = await this.requestService.getWarrantyRequestById(request.id);
      if (rawData) {
        this.detailRequest.assetName = rawData.temp1 || this.detailRequest.assetName;
        this.detailRequest.assignedSerial = rawData.temp2 || this.detailRequest.assignedSerial;
        this.detailRequest.assignedWarrantyExpiry = rawData.temp3 || this.detailRequest.assignedWarrantyExpiry;
        this.detailRequest.assignedAssetId = rawData.asset_id || this.detailRequest.assignedAssetId;
        this.detailRequest.justification = rawData.reason || this.detailRequest.justification;
      }
    } catch (err) {
      console.warn('Error fetching fresh warranty details:', err);
    }

    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailRequest = null;
  }

  openActionModal(request: AssetRequest, action: 'approve' | 'reject'): void {
    this.detailRequest = request;
    this.actionType = action;
    this.actionComments = '';
    this.selectedAllocationMemberId = '';
    this.showActionModal = true;
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.actionType = null;
    this.actionComments = '';
  }

  async directConfirmAction(request: AssetRequest | null, action: 'approve' | 'reject' | null): Promise<void> {
    if (!request || !action) return;

    if (!this.actionComments || this.actionComments.trim() === '') {
      alert('Approver remarks are required.');
      return;
    }

    if (action === 'approve' && !this.selectedAllocationMemberId) {
      alert('Please assign an Allocation Team Member before approving.');
      return;
    }

    this.detailRequest = request;
    await this.confirmAction(action);
  }

  async confirmAction(action: 'approve' | 'reject'): Promise<void> {
    if (!this.detailRequest) return;
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    try {
      if (action === 'approve') {
        
        console.log('Approving warranty request:', this.detailRequest);
        // 1. Update existing manager approval entry in t_extend_request_approvals
        await this.requestService.updateWarrantyRequestApproval(
          this.detailRequest.approvalId as string,
          'Approved',
          this.actionComments,
          this.detailRequest.assignedAssetId as string
        );

        // 2. Update status of the asset in m_assets table
        const req2 = {
          tuple: {
            old: { m_assets: { asset_id: this.detailRequest.assignedAssetId } },
            new: { m_assets: { status: "MoveToAllocationTeam" } }
          }
        };
        await this.requestService.updateAssetStatus(req2 as any);

        // 3. Create new entry in t_extend_request_approvals for the Allocation Team
        await this.requestService.createNewWarrantyApprovalEntry(
          this.detailRequest.id,
          this.selectedAllocationMemberId,
          "Asset Allocation Team",
          this.actionComments,
          this.detailRequest.assignedAssetId as string
        );

        // 4. Complete BPM task
        if (this.detailRequest.taskid) {
          await this.requestService.completeUserTask({ TaskId: this.detailRequest.taskid, Action: 'COMPLETE' } as any);
        }

        const member = this.allocationTeamMemberList.find(m => m.user_id === this.selectedAllocationMemberId);
        this.mailService.sendAssetManagerStatusUpdate({
          requestId: this.detailRequest.id,
          employeeName: this.detailRequest.requesterName,
          status: 'Approved',
          managerName: currentUser.name,
          remarks: this.actionComments,
          allocationMemberName: member ? member.name : 'Allocation Team',
          assetName: this.detailRequest.assetName || this.detailRequest.category
        });

        this.notificationService.showToast(`Warranty request approved.`, 'success');
      } else {
        // Handle Rejection using the same specialized warranty table
        await this.requestService.updateWarrantyRequestApproval(
          this.detailRequest.approvalId as string,
          'Rejected',
          this.actionComments,
          this.detailRequest.assignedAssetId as string
        );

        if (this.detailRequest.taskid) {
          await this.requestService.completeUserTask({ TaskId: this.detailRequest.taskid, Action: 'COMPLETE' } as any);
        }

        this.notificationService.showToast(`Warranty request rejected.`, 'info');
      }

      this.closeActionModal();
      this.closeDetailModal();
      this.loadData();
    } catch (error) {
      console.error('Action failed:', error);
      this.notificationService.showToast('Action failed. Please try again.', 'error');
    }
  }

  getTimeSince(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  }
}
