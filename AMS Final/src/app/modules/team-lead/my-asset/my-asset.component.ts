import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { HeroService } from '../../../core/services/hero.service';
import { Asset } from '../../../core/models/asset.model';
import { AssetRequest } from '../../../core/models/request.model';

@Component({
  selector: 'app-my-asset',
  templateUrl: './my-asset.component.html',
  styleUrls: ['./my-asset.component.scss']
})
export class MyAssetComponent implements OnInit {
  myAssets: Asset[] = [];
  pendingRequests: AssetRequest[] = [];
  expiringWarrantyCount: number = 0;
  isLoading = false;
  isLoadingRequests = false;
  activeTab: 'assets' | 'requests' = 'assets';

  constructor(
    private authService: AuthService,
    private assetService: AssetService,
    private requestService: RequestService,
    private hs: HeroService
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.isLoading = true;
    try {
      // Fetch assets from Cordys
      this.myAssets = await this.assetService.getAssetsByUserIdFromCordys(user.id);
      
      // Fallback to mock data if empty
      if (this.myAssets.length === 0) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
      }
    } catch (error) {
      console.error('Failed to fetch assets from Cordys', error);
      this.myAssets = this.assetService.getAssetsByUser(user.id);
    }
    
    this.calculateExpiringWarranty();
    this.isLoading = false;

    // Also load pending requests from Cordys
    this.loadPendingRequests(user.id);
  }

  loadPendingRequests(userId: string): void {
    this.isLoadingRequests = true;
    this.hs.ajax('GetRequestsByUserId', 'http://schemas.cordys.com/AMS_Database_Metadata', {
      user_id: userId
    }).then((resp: any) => {
      const result = this.hs.xmltojson(resp, 't_asset_requests');
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];

      this.pendingRequests = rawData
        .filter((item: any) => item.status === 'Pending')
        .map((item: any) => ({
          id: item.request_id || '',
          requestNumber: item.request_id || '',
          assetType: item.asset_type || '',
          category: item.temp1 || '',
          urgency: item.urgency || 'Low',
          status: item.status || 'Pending',
          requestDate: item.created_at || new Date().toISOString(),
          description: item.reason || ''
        } as any));

      console.log('[MyAsset] Pending requests from Cordys:', this.pendingRequests);
      this.isLoadingRequests = false;
    }).catch((err: any) => {
      console.error('[MyAsset] Failed to load pending requests:', err);
      this.isLoadingRequests = false;
    });
  }

  switchTab(tab: 'assets' | 'requests'): void {
    this.activeTab = tab;
  }

  private calculateExpiringWarranty(): void {
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);
    
    this.expiringWarrantyCount = this.myAssets.filter(a => {
      if (!a.warrantyExpiry) return false;
      const expiry = new Date(a.warrantyExpiry);
      return expiry > now && expiry <= ninetyDaysFromNow;
    }).length;
  }
}
