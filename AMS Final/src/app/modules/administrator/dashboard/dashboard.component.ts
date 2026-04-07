import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  userStats: any = {};
  assetStats: any = {};
  reqStats: any = {};

  constructor(
    private userService: UserService,
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.userStats = this.userService.getUserStats();
    this.assetStats = this.assetService.getAssetStats();
    this.reqStats = this.requestService.getRequestStats();
  }
}
