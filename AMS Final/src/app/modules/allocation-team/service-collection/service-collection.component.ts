import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-service-collection',
  templateUrl: './service-collection.component.html',
  styleUrls: ['./service-collection.component.scss']
})
export class ServiceCollectionComponent implements OnInit {
  activeTab: 'pending' | 'history' = 'pending';
  isLoading = true;
  loadError = '';

  pendingApprovals: any[] = [];
  allMyApprovals: any[] = [];

  // Drawer
  drawerOpen = false;
  selectedItem: any = null;
  actionRemarks = '';
  isSaving = false;

  // Pagination
  currentPage = 1;
  pageSize = 5;

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = this.authService.getCurrentUser();
      const userId = currentUser?.id;
      if (!userId) {
        this.loadError = 'Current user is missing. Please log in again.';
        return;
      }

      const [pending, allApprovals] = await Promise.all([
        this.requestService.fetchPendingServiceApprovals(userId).catch(e => { console.error('Pending fetch failed:', e); return []; }),
        this.requestService.getAllServiceApprovals().catch(e => { console.error('All approvals fetch failed:', e); return []; })
      ]);

      // Only show Stage 2 pending approvals assigned to this user
      this.pendingApprovals = pending.filter((a: any) => a.stage === 'STAGE_2_ALLOCATION');

      // History: all completed approvals by this user
      this.allMyApprovals = allApprovals
        .filter((a: any) => a.approver_id === userId && a.status !== 'Pending')
        .sort((a: any, b: any) => {
          const da = a.action_date ? new Date(a.action_date).getTime() : 0;
          const db = b.action_date ? new Date(b.action_date).getTime() : 0;
          return db - da;
        });

      console.log(`[ServiceCollection] Loaded: ${this.pendingApprovals.length} pending, ${this.allMyApprovals.length} history`);
    } catch (err: any) {
      console.error('Failed to load service collection data:', err);
      this.loadError = err?.message || 'Failed to load data.';
    } finally {
      this.isLoading = false;
    }
  }

  switchTab(tab: 'pending' | 'history'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.closeDrawer();
  }

  get currentData(): any[] {
    return this.activeTab === 'pending' ? this.pendingApprovals : this.allMyApprovals;
  }

  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.currentData.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.currentData.length / this.pageSize)); }
  get pageNumbers(): number[] { const p = []; for (let i = 1; i <= this.totalPages; i++) p.push(i); return p; }
  setPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }

  // ─── Drawer ─────────────────────────────────────────────────────────────

  openDrawer(item: any): void {
    this.selectedItem = item;
    this.drawerOpen = true;
    this.actionRemarks = '';
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedItem = null;
    this.actionRemarks = '';
  }

  getStageLabel(stage: string): string {
    if (stage === 'STAGE_1_MANAGER') return 'Asset Manager (Stage 1)';
    if (stage === 'STAGE_2_ALLOCATION') return 'Allocation Team (Stage 2)';
    if (stage === 'STAGE_3_MANAGER_FINAL') return 'Asset Manager Final (Stage 3)';
    return stage || 'Unknown';
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('pending') || s === 'movetoallocationteam') return 'status-pending';
    if (s === 'onservice') return 'status-inprogress';
    if (s === 'serviced' || s === 'approved' || s === 'collected') return 'status-approved';
    if (s === 'closed' || s === 'completed') return 'status-completed';
    if (s.includes('rejected')) return 'status-rejected';
    return 'status-default';
  }

  // ─── Stage 2: Allocation Team Approves (Collected Asset) ────────────────

  async approveCollection(item: any): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      // 1. Update this approval to Approved (Collected)
      const updateApproval = {
        tuple: {
          old: { t_service_approvals: { approval_id: item.approval_id } },
          new: { t_service_approvals: { status: 'Approved', remarks: this.actionRemarks || 'Asset collected by allocation team' } }
        }
      };
      await this.requestService.createEntryForServiceApproval(updateApproval);

      // 2. Update service request status
      const updateRequest = {
        tuple: {
          old: { t_service_requests: { service_request_id: item.service_request_id } },
          new: { t_service_requests: { status: 'CollectedByTeam' } }
        }
      };
      await this.requestService.createEntryForServiceRequest(updateRequest);

      // 3. Create Stage 3 approval for Asset Manager Final
      // We need to find the Asset Manager - use the stage 1 approver
      const approvalChain = await this.requestService.getServiceRequestApprovalChain(item.service_request_id);
      const stage1 = approvalChain.find((a: any) => a.stage === 'STAGE_1_MANAGER');
      const managerId = stage1?.approver_id || '';

      if (managerId) {
        const createStage3 = {
          tuple: {
            new: {
              t_service_approvals: {
                service_request_id: item.service_request_id,
                approver_id: managerId,
                role: 'Asset Manager',
                stage: 'STAGE_3_MANAGER_FINAL',
                status: 'Pending',
                remarks: 'Waiting for final approval',
                action_date: new Date().toISOString(),
                temp1: item.asset_id || item.temp1 || ''
              }
            }
          }
        };
        await this.requestService.createEntryForServiceApproval(createStage3);
      }

      // 4. Complete BPM task
      await this.completeWorkflowTaskForApproval(item);

      this.notificationService.showToast(`Asset collected. Service request ${item.service_request_id} forwarded to Asset Manager for final approval.`, 'success');
      this.closeDrawer();
      await this.loadAllData();
    } catch (err) {
      console.error('Collection approval failed:', err);
      this.notificationService.showToast('Failed to approve collection.', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  // ─── Reject ────────────────────────────────────────────────────────────

  async rejectCollection(item: any): Promise<void> {
    if (this.isSaving) return;
    if (!this.actionRemarks || this.actionRemarks.trim() === '') {
      this.notificationService.showToast('Remarks are required for rejection.', 'error');
      return;
    }
    this.isSaving = true;
    try {
      const updateApproval = {
        tuple: {
          old: { t_service_approvals: { approval_id: item.approval_id } },
          new: { t_service_approvals: { status: 'Rejected', remarks: this.actionRemarks } }
        }
      };
      await this.requestService.createEntryForServiceApproval(updateApproval);

      const updateRequest = {
        tuple: {
          old: { t_service_requests: { service_request_id: item.service_request_id } },
          new: { t_service_requests: { status: 'Rejected' } }
        }
      };
      await this.requestService.createEntryForServiceRequest(updateRequest);

      await this.completeWorkflowTaskForApproval(item);

      this.notificationService.showToast(`Service request ${item.service_request_id} rejected.`, 'success');
      this.closeDrawer();
      await this.loadAllData();
    } catch (err) {
      console.error('Rejection failed:', err);
      this.notificationService.showToast('Failed to reject.', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  private async completeWorkflowTaskForApproval(item: any): Promise<void> {
    const taskId = item?.temp7 || await this.requestService.getServiceApprovalTaskId(item?.approval_id);

    if (!taskId) {
      console.warn(`[ServiceCollection] No workflow task id found for approval ${item?.approval_id}. PerformTaskAction skipped.`);
      return;
    }

    await this.requestService.completeUserTask({ TaskId: taskId, Action: 'COMPLETE' } as any);
  }
}
