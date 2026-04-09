import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { Asset } from '../../../core/models/asset.model';
import { AssetRequest } from '../../../core/models/request.model';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit {
  myAssets: Asset[] = [];
  pendingRequests: AssetRequest[] = [];
  expiringWarrantyCount: number = 0;

  constructor(
    private authService: AuthService,
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    // Fetch assets from Cordys
    try {
      this.myAssets = await this.assetService.getAssetsByUserIdFromCordys(user.id);
      
      // If Cordys returns nothing, fallback to mock data to ensure the UI isn't empty during testing
      if (this.myAssets.length === 0) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
      }
    } catch (error) {
      console.error('Failed to fetch assets from Cordys', error);
      this.myAssets = this.assetService.getAssetsByUser(user.id);
    }

    this.pendingRequests = this.requestService.getRequestsByUser(user.id).filter(r => r.status === 'Pending' || r.status === 'In Progress');
    this.calculateExpiringWarranty();
  }

  private calculateExpiringWarranty(): void {
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);
    
    this.expiringWarrantyCount = this.myAssets.filter(a => {
      const expiry = new Date(a.warrantyExpiry);
      return expiry > now && expiry <= ninetyDaysFromNow;
    }).length;
  }
}
