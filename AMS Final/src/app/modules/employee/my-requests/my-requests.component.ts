import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { AssetRequest, RequestStatus, RequestType } from '../../../core/models/request.model';

@Component({
  selector: 'app-my-requests',
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.scss']
})
export class MyRequestsComponent implements OnInit {
  requests: AssetRequest[] = [];
  loading = true;
  Math = Math;

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalRequests = 0;

  // Tracking Modal
  showTrackingModal = false;
  selectedRequest: AssetRequest | null = null;
  loadingProgress = false;
  trackingSteps: any[] = [];
  overallProgress = 0;

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private adminService: AdminDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    this.loading = true;
    const user = this.authService.getCurrentUser();
    if (user) {
      try {
        this.requests = await this.requestService.getRequestsByUserIdFromCordys(user.id);
        // Sort by date descending
        this.requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        this.totalRequests = this.requests.length;
      } catch (error) {
        console.error('Error loading requests:', error);
      }
    }
    this.loading = false;
  }

  get paginatedRequests(): AssetRequest[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.requests.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.totalRequests / this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  private getStagesForRequest(request: AssetRequest): Array<{name: string, roles: string[]}> {
    const type = request.requestType;
    const isSkippedTl = request.hasEmailApproval || request.requesterRole?.toLowerCase().includes('lead') || request.requesterRole?.toLowerCase().includes('manager');

    switch (type) {
      case RequestType.RETURN_ASSET:
        return [
          { name: 'Asset Manager', roles: ['asset manager', 'mgr'] },
          { name: 'Asset Allocation Team', roles: ['asset allocation', 'allocation', 'team'] },
          { name: 'Asset Manager', roles: ['asset manager', 'mgr'] }
        ];

      case RequestType.EXTEND_WARRANTY:
        return [
          { name: 'Asset Manager', roles: ['asset manager', 'mgr'] }
        ];

      default: // NEW_ASSET
        const newAssetStages = [
          { name: 'Team Lead', roles: ['team lead', 'approver'] },
          { name: 'Asset Manager', roles: ['asset manager', 'mgr'] },
          { name: 'Asset Allocation Team', roles: ['asset allocation', 'allocation', 'team'] },
          { name: 'Asset Manager', roles: ['asset manager', 'mgr'] }
        ];

        return isSkippedTl ? newAssetStages.slice(1) : newAssetStages;
    }
  }

  async trackRequest(request: AssetRequest): Promise<void> {
    this.selectedRequest = request;
    this.showTrackingModal = true;
    this.loadingProgress = true;
    this.trackingSteps = [];
    this.overallProgress = 0;
    
    try {
      const progressData = await this.requestService.getRequestProgress(request.id);
      
      // Sort to ensure chronological order for multi-stage roles like Asset Manager
      progressData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const stages = this.getStagesForRequest(request);
      
      let availableProgress = [...progressData];
      const resolvedNames = await this.resolveApproverNames(request);

      this.trackingSteps = stages.map((stage, index) => {
        const isDistributionStep = index === (stages.length - 1) && stage.name === 'Asset Manager' && stages.length > 2;

        const foundIndex = availableProgress.findIndex(p => 
          stage.roles.some(role => p.stage?.toLowerCase().includes(role))
        );
        
        let data = null;
        if (foundIndex !== -1) {
          data = availableProgress[foundIndex];
          // Remove it so the second Asset Manager matches the next DB entry
          availableProgress.splice(foundIndex, 1);
        }
        
        let isCompleted = false;
        let isCurrent = false;

        if (data) {
          isCompleted = data.status === 'Approved' || data.status === 'Completed';
          isCurrent = data.status === 'Pending';
        } else {
          // Fallback guessing based on request status
          isCompleted = request.status === 'Completed' || request.status === 'Approved';
        }
        
        // Correctly handle 'Assigned Approver' or empty placeholders from the DB and lookups
        const dbName = data?.approverName?.trim();
        const genericPlaceholders = ['assigned approver', 'pending', 'to be assigned', 'null', 'undefined', '', 'assignedapprover'];
        const isPlaceholder = (val: string | undefined) => !val || genericPlaceholders.includes(val.toLowerCase().trim());
        
        let resolvedName = !isPlaceholder(dbName) ? dbName : resolvedNames[stage.name];
        
        // Final sanity check on resolved name
        if (isPlaceholder(resolvedName)) {
           resolvedName = undefined;
        }

        return {
          name: resolvedName || (isCompleted ? 'System Approved' : 'To be Assigned'),
          roleName: stage.name + (isDistributionStep ? ' (Distribution)' : ''),
          status: data ? data.status : (isCompleted ? 'Approved' : 'Pending'),
          timestamp: data?.timestamp,
          isCompleted: isCompleted,
          isCurrent: isCurrent,
          comments: data?.comments
        };
      });

      // 4. Special pass to handle pending states based on the previous step
      let currentStepFound = false;
      for (let i = 0; i < this.trackingSteps.length; i++) {
        const step = this.trackingSteps[i];
        
        // Reset flags that might have been guessed in the map pass
        if (step.status === 'Pending') {
          step.isCurrent = false;
        }

        if (!currentStepFound && !step.isCompleted) {
          step.isCurrent = true;
          currentStepFound = true;
        }
      }

      this.overallProgress = this.calculateOverallProgress(request.status);
    } catch (error) {
      console.error('Error tracking request:', error);
    } finally {
      this.loadingProgress = false;
    }
  }

  private async resolveApproverNames(request: AssetRequest): Promise<Record<string, string>> {
    const resolvedNames: Record<string, string> = {};
    let user = this.authService.getCurrentUser();
    
    try {
      // 1. Force refresh user details if projectId is missing to ensure fresh data
      if (user && !user.projectId) {
         const freshUser = await this.authService.getUserDetails(user.id);
         if (freshUser) {
           user = freshUser;
         }
      }

      // 2. Resolve Team Lead from current user's project
      if (user?.projectId && user.projectId !== 'null') {
        const project = await this.adminService.getProjectById(user.projectId);
        if (project?.teamLead) {
          resolvedNames['Team Lead'] = project.teamLead;
        }
      }

      // 3. Resolve Asset Manager & Allocation Team for this Asset Type
      if (request.assetType) {
        const assignment = await this.adminService.getAssignmentByAssetType(request.assetType);
        if (assignment) {
          resolvedNames['Asset Manager'] = assignment.assetManager;
          resolvedNames['Asset Allocation Team'] = assignment.teamMembers;
        }
      }
    } catch (err) {
      console.error('Failed to resolve approver names:', err);
    }

    return resolvedNames;
  }

  calculateOverallProgress(requestStatus: string): number {
    const status = requestStatus.toLowerCase();
    if (status === 'completed') return 100;
    if (status === 'rejected') return 0;
    
    const completedCount = this.trackingSteps.filter(s => s.isCompleted).length;
    
    if (completedCount === 0) return 10;
    if (completedCount === 1) return 33;
    if (completedCount === 2) return 66;
    if (completedCount === 3) return 90;
    return 100;
  }

  // Confirmation Modal Variables
  showConfirmModal = false;
  confirmationRemarks = '';
  
  openConfirmForm() {
    this.showConfirmModal = true;
  }

  closeConfirmForm() {
    this.showConfirmModal = false;
    this.confirmationRemarks = '';
  }

  async submitConfirmation() {
    if (!this.selectedRequest) return;
    
    try {
      // Assuming a method like confirmAssetReceipt exists or could be added
      // await this.requestService.confirmAssetReceipt(this.selectedRequest.id, this.confirmationRemarks);
      console.log('Sending Confirmation for:', this.selectedRequest.id, 'with remarks:', this.confirmationRemarks);
      
      // Update UI optimistically
      this.selectedRequest.status = RequestStatus.COMPLETED;
      this.closeConfirmForm();
      this.closeTrackingModal();
    } catch (error) {
      console.error('Error submitting confirmation:', error);
    }
  }

  closeTrackingModal(): void {
    this.showTrackingModal = false;
    this.selectedRequest = null;
  }

  getStatusClass(status: RequestStatus | string): string {
    const s = status.toString();
    if (s.includes('Pending')) return 'status-pending';
    if (s.includes('Approved')) return 'status-approved';
    if (s.includes('Rejected')) return 'status-rejected';
    if (s.includes('Completed')) return 'status-completed';
    if (s.includes('Progress')) return 'status-progress';
    return '';
  }

  getAssetIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('soft')) return 'terminal';
    if (t.includes('hard') || t.includes('comp') || t.includes('laptop')) return 'laptop';
    if (t.includes('net') || t.includes('wifi') || t.includes('router')) return 'router';
    if (t.includes('periph') || t.includes('mouse') || t.includes('key')) return 'keyboard';
    return 'inventory_2';
  }
}
