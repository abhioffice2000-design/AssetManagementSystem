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

  constructor(
    private requestService: RequestService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.requests = this.requestService.getRequestsByUser(user.id);
      // Sort by date descending
      this.requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }
    this.loading = false;
  }

  getStatusClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.PENDING: return 'status-pending';
      case RequestStatus.APPROVED: return 'status-approved';
      case RequestStatus.REJECTED: return 'status-rejected';
      case RequestStatus.COMPLETED: return 'status-completed';
      case RequestStatus.IN_PROGRESS: return 'status-progress';
      default: return '';
    }
  }
}
