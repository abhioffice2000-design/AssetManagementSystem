import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssetRequest, RequestStatus } from '../../../core/models/request.model';

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
    private authService: AuthService
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
      
      const stages = [
        { name: 'Team Lead', roles: ['team lead', 'approver'] },
        { name: 'Asset Manager', roles: ['asset manager', 'mgr'] },
        { name: 'Asset Allocation Team', roles: ['asset allocation', 'allocation', 'team'] },
        { name: 'Asset Manager', roles: ['asset manager', 'mgr'] }
      ];
      
      let availableProgress = [...progressData];

      this.trackingSteps = stages.map((stage, index) => {
        const foundIndex = availableProgress.findIndex(p => 
          stage.roles.some(role => p.stage.toLowerCase().includes(role))
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
        
        return {
          name: stage.name + (index === 3 ? ' (Distribution)' : ''),
          status: data ? data.status : (isCompleted ? 'Approved' : 'Pending'),
          approverName: data?.approverName || 'Assigned Approver',
          timestamp: data?.timestamp,
          isCompleted: isCompleted,
          isCurrent: isCurrent,
          comments: data?.comments
        };
      });

      // Special pass to handle pending states based on the previous step
      for (let i = 0; i < this.trackingSteps.length; i++) {
        if (!this.trackingSteps[i].isCompleted && !this.trackingSteps[i].isCurrent) {
          // If the previous step is completed, this one is likely current
          if (i > 0 && this.trackingSteps[i-1].isCompleted) {
             this.trackingSteps[i].isCurrent = true;
             break; // only one current step
          } else if (i === 0) {
             this.trackingSteps[0].isCurrent = true;
          }
        } else if (this.trackingSteps[i].isCurrent) {
          break; // Stop at the first current step
        }
      }

      this.overallProgress = this.calculateOverallProgress(request.status);
    } catch (error) {
      console.error('Error tracking request:', error);
    } finally {
      this.loadingProgress = false;
    }
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
