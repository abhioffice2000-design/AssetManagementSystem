import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { ApprovalStage, RequestStatus } from '../../../core/models/request.model';

@Component({
  selector: 'app-allocation-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class AllocationDashboardComponent implements OnInit {
  assignedTickets = 0;
  pendingAllocation = 0;
  completed = 0;

  constructor(private requestService: RequestService) {}

  ngOnInit(): void {
    const allTix = this.requestService.getAllocationTickets();
    this.assignedTickets = allTix.length;
    this.pendingAllocation = allTix.filter(t => t.status === RequestStatus.APPROVED).length;
    this.completed = this.requestService.getRequestsByStatus(RequestStatus.COMPLETED).length;
  }
}
