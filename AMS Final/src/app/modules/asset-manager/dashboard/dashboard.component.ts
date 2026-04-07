import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { ApprovalStage } from '../../../core/models/request.model';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class ManagerDashboardComponent implements OnInit {
  assetStats: any = {};
  pendingRequests = 0;

  constructor(
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.assetStats = this.assetService.getAssetStats();
    this.pendingRequests = this.requestService.getRequestsByStage(ApprovalStage.ASSET_MANAGER).length;
  }
}
