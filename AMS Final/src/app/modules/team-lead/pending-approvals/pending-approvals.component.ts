import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssetRequest, ApprovalStage } from '../../../core/models/request.model';

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.scss']
})
export class PendingApprovalsComponent implements OnInit {
  pendingRequests: AssetRequest[] = [];
  selectedRequest: AssetRequest | null = null;

  // Pagination & Filtering
  currentPage = 1;
  pageSize = 5;
  searchTerm = '';

  constructor(
    private authService: AuthService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.refreshApprovals();
  }

  refreshApprovals() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.pendingRequests = this.requestService.getPendingApprovals(user.id, ApprovalStage.TEAM_LEAD);
    } else {
      this.pendingRequests = [];
    }
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
  }

  cancelSelection(): void {
    this.selectedRequest = null;
  }

  markAsAccept(): void {
    if (this.selectedRequest) {
      const user = this.authService.getCurrentUser();
      if (user) {
        // Actually accept the request using the RequestService
        this.requestService.approveRequest(this.selectedRequest.id, user.id, user.name, "Approved by Team Lead", ApprovalStage.TEAM_LEAD);
      }
      
      this.selectedRequest = null;
      this.refreshApprovals(); // Refresh table to remove the accepted item
    }
  }

  markAsReject(): void {
    if (this.selectedRequest) {
      const user = this.authService.getCurrentUser();
      if (user) {
        // Actually reject the request using the RequestService
        this.requestService.rejectRequest(this.selectedRequest.id, user.id, user.name, "Rejected by Team Lead", ApprovalStage.TEAM_LEAD);
      }
      
      this.selectedRequest = null;
      this.refreshApprovals(); // Refresh table to remove the rejected item
    }
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }
}
