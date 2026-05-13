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
  assignedAllocationMemberName = ''; // Name of the AT member who approved (for resolved tab)

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

      const [pendingReqs, allReqs, memberResult, allUsers, assignments] = await Promise.all([
        this.requestService.fetchPendingWarrantyApprovalsFromService(approverId),
        this.requestService.fetchAllWarrantyRequests(),
        this.requestService.getAllocationTeamMemberAccordingtoManager(approverId),
        this.adminService.GetAllUserRoleProjectDetails(),
        this.adminService.getAssetTypeAssignmentDetails()
      ]);

      // Resolve the manager's assigned asset types
      const myAssignments = assignments.filter((a: any) => a.assetManagerId === approverId);
      const myAssetTypes = myAssignments.map((a: any) => a.name.toLowerCase());
      
      this.warrantyRequests = pendingReqs || [];

      // Filter and Enrich ALL requests (Resolved tab)
      const filteredAllReqs = (allReqs || []).filter(req => {
        const type = (req.assetType || '').toLowerCase();
        return myAssetTypes.length === 0 || myAssetTypes.includes(type);
      });

      this.allWarrantyRequests = await Promise.all(filteredAllReqs.map(async (req) => {
        try {
          // ── ENRICHMENT: Resolve Requester Name/Email if missing (common in Resolved tab) ──
          if (!req.requesterName || req.requesterName === 'Unknown' || !req.requesterEmail) {
            const requester = allUsers.find((u: any) => u.id === req.requesterId || (u as any).user_id === req.requesterId);
            if (requester) {
              req.requesterName = requester.name || req.requesterName;
              req.requesterEmail = requester.email || req.requesterEmail;
            }
          }

          const progress = await this.requestService.getWarrantyProgress(req.id);
          
          // 1. Check manager action
          const myAction = progress.find((p: any) => p.approverId === approverId && 
            (p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'rejected'));
          if (myAction && req.status === RequestStatus.PENDING) {
            req.status = myAction.status === 'Approved' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
          }

          // 2. Resolve AT Member
          const atEntry = progress.find((p: any) => (p.stage || '').toLowerCase().includes('allocation'));
          if (atEntry) {
            req.assignedAllocationTeamId = atEntry.approverId;
            (req as any).assignedAllocationTeamName = atEntry.approverName;
          }

          // 3. Asset Type fallback for AT Member
          if (!(req as any).assignedAllocationTeamName && req.assetType) {
            const assignment = await this.adminService.getAssignmentByAssetType(req.assetType);
            if (assignment && assignment.teamMembers) {
              const memberId = assignment.teamMembers.split(',')[0].trim();
              const matched = allUsers.find((u: any) => u.id === memberId);
              if (matched) {
                req.assignedAllocationTeamId = matched.id;
                (req as any).assignedAllocationTeamName = matched.name;
              }
            }
          }
        } catch (e) { /* ignore */ }
        return req;
      }));

      // Enrich pending requests too
      await Promise.all(this.warrantyRequests.map(async (req) => {
        // Also ensure requester info is present here
        if (!req.requesterName || req.requesterName === 'Unknown') {
          const requester = allUsers.find((u: any) => u.id === req.requesterId || (u as any).user_id === req.requesterId);
          if (requester) {
            req.requesterName = requester.name || req.requesterName;
            req.requesterEmail = requester.email || req.requesterEmail;
          }
        }
        
        if ((req as any).assignedAllocationTeamName) return;
        try {
          const progress = await this.requestService.getWarrantyProgress(req.id);
          const atEntry = progress.find((p: any) => (p.stage || '').toLowerCase().includes('allocation'));
          if (atEntry) {
            req.assignedAllocationTeamId = atEntry.approverId;
            (req as any).assignedAllocationTeamName = atEntry.approverName;
          }
        } catch (e) { /* ignore */ }
      }));

      // BPM Task Discovery
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
                req.taskid = matchingTask.taskId;
              }
            }
          });
        }
      } catch (e) { console.warn('[WarrantyRequests] Task discovery failed:', e); }

      const teamTuples = memberResult ? (Array.isArray(memberResult) ? memberResult : [memberResult]) : [];
      this.allocationTeamMemberList = teamTuples.map((t: any) => {
        const user = t?.old?.m_users || t?.m_users || t;
        return { id: user.user_id, name: user.name };
      });

      this.filterRequests();
    } catch (err) {
      console.error('Failed to load warranty requests:', err);
      this.loadError = 'Failed to load requests.';
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
    this.selectedAllocationMemberId = req.assignedAllocationTeamId || '';
    this.assignedAllocationMemberName = (req as any).assignedAllocationTeamName || '';

    // ── NEW SOURCE: Resolve AT member from the GetTeamAllocationMemberByAssetManager service ──
    try {
      const currentUser = this.authService.getCurrentUser();
      const managerId = currentUser?.id || 'usr_004';
      const members = await this.requestService.getTeamAllocationMemberByAssetManager(managerId);
      
      if (members && members.length > 0) {
        // Check if any member specifically matches this request's asset type (via temp1 or similar if available)
        // Otherwise, take the first one as the primary contact
        const member = members[0];
        this.assignedAllocationMemberName = member.name || '';
        this.selectedAllocationMemberId = member.user_id || member.id || '';
        console.log(`[WarrantyRequests] Resolved AT from Service Response: "${this.assignedAllocationMemberName}"`);
      }
    } catch (e) {
      console.warn('[WarrantyRequests] Failed to resolve AT from specific service:', e);
    }

    if (this.assignedAllocationMemberName) {
       console.log(`[WarrantyRequests] Modal opened for ${req.id} | AT resolved: ${this.assignedAllocationMemberName}`);
       return; 
    }

    // ── FALLBACK 1: Resolve by Asset Type Assignment ──
    let allUsers: any[] = [];
    try {
      allUsers = await this.adminService.GetAllUserRoleProjectDetails();
      const assetType = req.assetType || 'Hardware';
      const assignment = await this.adminService.getAssignmentByAssetType(assetType);
      
      if (assignment && assignment.teamMembers) {
        const memberIds = assignment.teamMembers.split(',').map((id: string) => id.trim());
        const matched = allUsers.find(u => memberIds.includes(u.id));
        if (matched) {
          this.assignedAllocationMemberName = matched.name;
          this.selectedAllocationMemberId = matched.id;
        }
      }
    } catch (e) { /* ignore */ }

    // ── FALLBACK 2: Resolve from Progress Tracker ──
    if (!this.assignedAllocationMemberName) {
      try {
        const progress = await this.requestService.getWarrantyProgress(req.id);
        const atEntry = progress.find((p: any) => (p.stage || '').toLowerCase().includes('allocation'));
        if (atEntry?.approverId) {
          this.assignedAllocationMemberName = atEntry.approverName || 'Assigned Member';
          this.selectedAllocationMemberId = atEntry.approverId;
        }
      } catch (e) { /* ignore */ }
    }
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailRequest = null;
    this.actionComments = '';
    this.assignedAllocationMemberName = '';
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
