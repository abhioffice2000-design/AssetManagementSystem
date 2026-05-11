import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest, ApprovalStage, RequestStatus, RequestUrgency, RequestType } from '../../../core/models/request.model';
import { AuthService } from '../../../core/services/auth.service';
import { AssetService } from '../../../core/services/asset.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';
import { UserService } from '../../../core/services/user.service';
import { AdminDataService } from '../../../core/services/admin-data.service';

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
  statuses = [RequestStatus.APPROVED, RequestStatus.REJECTED];

  allWarrantyRequests: AssetRequest[] = [];

  allocationTeamMemberList: any[] = [];
  selectedAllocationMemberId = '';

  showDetailModal = false;
  detailRequest: AssetRequest | null = null;
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
    private adminService: AdminDataService,
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

      this.warrantyRequests = pendingReqs || [];
      
      // Enrich resolved requests to show 'Approved' even if main table is 'Pending'
      this.allWarrantyRequests = await Promise.all((allReqs || []).map(async (req) => {
        // If it's already Approved/Rejected/Completed, keep it
        if (req.status !== RequestStatus.PENDING) return req;
        
        // If it's Pending in main table, check if THIS manager already approved it
        try {
          const progress = await this.requestService.getWarrantyProgress(req.id);
          const myAction = progress.find(p => p.approverId === approverId && (p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'rejected'));
          if (myAction) {
            req.status = myAction.status === 'Approved' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
          }
        } catch (e) { /* ignore */ }
        return req;
      }));

      // 🚀 BPM Discovery Fallback: If taskid is missing from DB, find it in active tasks
      try {
        const activeTasks = await this.requestService.fetchActiveTasks();
        if (activeTasks && activeTasks.length > 0) {
          [...this.warrantyRequests, ...this.allWarrantyRequests].forEach(req => {
            if (!req.taskid) {
              const matchingTask = activeTasks.find(t => {
                const dataStr = JSON.stringify(t.data || {}).toLowerCase();
                const subjectStr = (t.subject || '').toLowerCase();
                const reqIdLower = (req.id || '').toLowerCase();
                return reqIdLower && (dataStr.includes(reqIdLower) || subjectStr.includes(reqIdLower));
              });
              if (matchingTask) {
                console.log(`[WarrantyRequests] Discovered missing taskId ${matchingTask.taskId} for request ${req.id}`);
                req.taskid = matchingTask.taskId;
              }
            }
          });
        }
      } catch (e) {
        console.warn('[WarrantyRequests] Task discovery failed:', e);
      }

      const teamTuples = memberResult ? (Array.isArray(memberResult) ? memberResult : [memberResult]) : [];
      
      this.allocationTeamMemberList = teamTuples.map((t: any) => {
        const user = t?.old?.m_users || t?.m_users || t;
        return {
          id: user.user_id,
          name: user.user_name || user.name
        };
      });

      this.filterRequests();
    } catch (err) {
      console.error('Failed to load warranty requests:', err);
      this.loadError = 'Failed to load requests. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  filterRequests(): void {
    let requests = this.activeTab === 'pending' ? this.warrantyRequests : this.allWarrantyRequests.filter(r => r.status !== RequestStatus.PENDING);

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      requests = requests.filter(r => 
        r.id.toLowerCase().includes(term) ||
        r.requesterName.toLowerCase().includes(term) ||
        r.assetName?.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus) {
      requests = requests.filter(r => r.status === this.selectedStatus);
    }

    if (this.selectedUrgency) {
      requests = requests.filter(r => r.urgency === this.selectedUrgency);
    }

    this.filteredWarrantyRequests = requests.sort((a, b) => {
      const idA = (a.id || '').toLowerCase();
      const idB = (b.id || '').toLowerCase();
      return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
    });
    this.currentPage = 1;
  }

  setTab(tab: 'pending' | 'resolved'): void {
    this.activeTab = tab;
    this.filterRequests();
  }

  async openDetailModal(req: AssetRequest): Promise<void> {
    this.detailRequest = req;
    this.showDetailModal = true;
    this.actionComments = '';
    this.selectedAllocationMemberId = '';
    
    // Dynamically load allocation members based on THIS request's asset type
    try {
      const assetType = req.assetType || 'Hardware';
      const assignment = await this.adminService.getAssignmentByAssetType(assetType);
      
      if (assignment && assignment.teamMembers) {
        const memberIds = assignment.teamMembers.split(',').map(id => id.trim());
        const allUsers = await this.adminService.GetAllUserRoleProjectDetails();
        
        this.allocationTeamMemberList = allUsers
          .filter((u: any) => memberIds.includes(u.id))
          .map((u: any) => ({
            id: u.id,
            name: u.name
          }));
          
        console.log(`[WarrantyRequests] Loaded ${this.allocationTeamMemberList.length} allocation members for ${assetType}`);
      } else {
        // Fallback to manager-level members if type-specific lookup fails
        const currentUser = this.authService.getCurrentUser();
        const memberResult = await this.requestService.getAllocationTeamMemberAccordingtoManager(currentUser?.id || 'usr_004');
        const teamTuples = memberResult ? (Array.isArray(memberResult) ? memberResult : [memberResult]) : [];
        this.allocationTeamMemberList = teamTuples.map((t: any) => {
          const user = t?.old?.m_users || t?.m_users || t;
          return { id: user.user_id, name: user.user_name || user.name };
        });
      }

      // Final fallback: if list is still empty, load ALL users with 'Asset Allocation Team' role
      if (!this.allocationTeamMemberList || this.allocationTeamMemberList.length === 0) {
        console.warn('[WarrantyRequests] No specific allocation members found. Loading all users with Allocation Team role.');
        const allUsers = await this.adminService.GetAllUserRoleProjectDetails();
        this.allocationTeamMemberList = allUsers
          .filter((u: any) => (u.role || '').toLowerCase().includes('allocation'))
          .map((u: any) => ({
            id: u.id,
            name: u.name
          }));
      }
    } catch (err) {
      console.error('Failed to load dynamic allocation members:', err);
    }
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailRequest = null;
    this.actionComments = '';
  }

  async handleAction(action: 'approve' | 'reject'): Promise<void> {
    if (!this.detailRequest) return;

    if (action === 'approve' && !this.selectedAllocationMemberId) {
      this.notificationService.showToast('Please select an allocation team member.', 'warning');
      return;
    }

    if (!this.actionComments || this.actionComments.trim() === '') {
      const actionText = action === 'approve' ? 'Approval' : 'Rejection';
      this.notificationService.showToast(`${actionText} remarks are mandatory.`, 'warning');
      return;
    }

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

        // 2. Update master request status to 'Approved'
        await this.requestService.updateExtendAssetRequest(this.detailRequest.id, 'Approved');

        // 2. Update status of the asset in m_assets table to MoveToAllocationTeam
        const req2 = {
          tuple: {
            old: { m_assets: { asset_id: this.detailRequest.assignedAssetId } },
            new: { m_assets: { status: "MoveToAllocationTeam" } }
          }
        };
        await this.requestService.updateAssetStatus(req2 as any);

        // 3. Create new entry in t_extend_request_approvals for the Allocation Team
        const newApprovalResp = await this.requestService.createNewWarrantyApprovalEntry(
          this.detailRequest.id,
          this.selectedAllocationMemberId,
          "Asset Allocation Team",
          this.actionComments,
          this.detailRequest.assignedAssetId as string
        );

        // Extract the new approval ID to pass it to the BPM
        const newapprovalid = newApprovalResp?.tuple?.new?.t_extend_request_approvals?.approval_id || 
                             newApprovalResp?.t_extend_request_approvals?.approval_id;
        
        console.log('New Approval Record Created:', newapprovalid);

        // 4. Complete BPM task
        if (this.detailRequest.taskid) {
          const TaskId = this.detailRequest.taskid;
          await this.requestService.completeUserTask({ 
            TaskId: TaskId, 
            Action: 'COMPLETE',
            Variables: {
              Status: "Approved",
              NextApproverId: this.selectedAllocationMemberId,
              NextApprovalId: newapprovalid || '',
              Remarks: this.actionComments
            }
          });
        }

        this.notificationService.showToast('Request approved and moved to allocation team.', 'success');
        
        // 5. Send Email
        this.mailService.sendWarrantyManagerApprovalNotification({
          employeeName: this.detailRequest.requesterName,
          assetName: this.detailRequest.assetName || 'Asset',
          requestId: this.detailRequest.id,
          managerName: currentUser.name,
          remarks: this.actionComments,
          allocationMemberName: this.allocationTeamMemberList.find(m => m.id === this.selectedAllocationMemberId)?.name || 'Allocation Team Member'
        });

      } else {
        console.log('Rejecting warranty request:', this.detailRequest);
        // 1. Update existing manager approval entry
        await this.requestService.updateWarrantyRequestApproval(
          this.detailRequest.approvalId as string,
          'Rejected',
          this.actionComments,
          this.detailRequest.assignedAssetId as string
        );

        // 2. Update master request status
        await this.requestService.updateExtendAssetRequest(this.detailRequest.id, 'Rejected');

        // 3. Complete BPM task (to end the flow)
        if (this.detailRequest.taskid) {
          const TaskId = this.detailRequest.taskid;
          await this.requestService.completeUserTask({ 
            TaskId: TaskId, 
            Action: 'COMPLETE',
            Variables: {
              Status: "Rejected",
              Remarks: this.actionComments
            }
          });
        }

        this.notificationService.showToast('Request rejected successfully.', 'success');

        // 4. Send Email
        this.mailService.sendWarrantyRejectionNotification({
          employeeName: this.detailRequest.requesterName,
          assetName: this.detailRequest.assetName || 'Asset',
          requestId: this.detailRequest.id,
          managerName: currentUser.name,
          remarks: this.actionComments
        });
      }

      this.closeDetailModal();
      this.loadData();
    } catch (err) {
      console.error('Failed to process warranty action:', err);
      this.notificationService.showToast('Failed to process action. Please try again.', 'error');
    }
  }

  get resolvedWarrantyRequests(): AssetRequest[] {
    return this.allWarrantyRequests.filter(r => r.status !== RequestStatus.PENDING);
  }

  onSearchChange(): void {
    this.filterRequests();
  }

  onFilterChange(): void {
    this.filterRequests();
  }

  get paginationDisplayRange(): string {
    if (this.filteredWarrantyRequests.length === 0) return '0-0 of 0';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredWarrantyRequests.length);
    return `${start}-${end} of ${this.filteredWarrantyRequests.length}`;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.goToPage(page);
    }
  }

  getSelectedAllocationMemberName(): string {
    const member = this.allocationTeamMemberList.find(m => m.id === this.selectedAllocationMemberId);
    return member ? member.name : 'Not assigned';
  }

  confirmAction(action: 'approve' | 'reject'): void {
    this.handleAction(action);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredWarrantyRequests.length / this.pageSize);
  }

  get paginatedRequests(): AssetRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredWarrantyRequests.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  getUrgencyClass(urgency: RequestUrgency): string {
    switch (urgency) {
      case RequestUrgency.HIGH: return 'text-red-600 bg-red-100';
      case RequestUrgency.MEDIUM: return 'text-amber-600 bg-amber-100';
      case RequestUrgency.LOW: return 'text-emerald-600 bg-emerald-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  }

  getStatusClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.APPROVED: return 'text-emerald-600 bg-emerald-100';
      case RequestStatus.REJECTED: return 'text-red-600 bg-red-100';
      case RequestStatus.COMPLETED: return 'text-blue-600 bg-blue-100';
      case RequestStatus.PENDING: return 'text-amber-600 bg-amber-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  }
}
