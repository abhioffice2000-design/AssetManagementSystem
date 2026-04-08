import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApprovalStage } from '../../../core/models/request.model';

@Component({
  selector: 'app-lead-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class LeadDashboardComponent implements OnInit {
  teamSize = 0;
  teamAssets = 0;
  pendingApprovals = 0;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    
    this.teamSize = this.userService.getUsersByTeam(user.team).length;
    this.teamAssets = this.assetService.getAssetsByTeam(user.team).length;
    this.pendingApprovals = this.requestService.getPendingApprovals(user.id, ApprovalStage.TEAM_LEAD).length;
  }
}
