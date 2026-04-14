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

    // Fetch current assets from Cordys
    this.getAssetsByUser(user.id);

    // Fetch pending requests from Cordys
    this.PendingRequestsForTeamLead(user.id);
  }

  switchTab(tab: 'assets' | 'requests'): void {
    this.activeTab = tab;
    // Refresh pending requests when clicking the tab
    if (tab === 'requests') {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.PendingRequestsForTeamLead(user.id);
      }
    }
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

  getAssetsByUser(userId?: string): void {
    this.isLoading = true;
    this.hs.ajax('GetAssetsByUser', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { userId: userId || '' }
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, 'm_assets');
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];

      // Map m_assets fields to the Asset interface used by the table
      this.myAssets = rawData.map((item: any) => ({
        id: item.asset_id || item.id || '',
        assetTag: item.serial_number || item.asset_tag || item.asset_id || '',
        name: item.asset_name || item.name || '',
        category: item.m_asset_subcategories?.name || item.m_asset_subcategories?.Name || item.category || item.asset_type || '',
        condition: item.condition || 'Good',
        status: item.status || 'Allocated',
        warrantyExpiry: item.warranty_expiry || item.warrantyExpiry || '',
        assignedTo: item.user_id || userId || ''
      } as any));

      console.log('[MyAsset] My assets from Cordys:', this.myAssets);
      this.calculateExpiringWarranty();
      this.isLoading = false;
    }).catch((err: any) => {
      console.error('[MyAsset] Error fetching assets:', err);
      // Fallback to local mock data
      const user = this.authService.getCurrentUser();
      if (user) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
        this.calculateExpiringWarranty();
      }
      this.isLoading = false;
    });
  }

  PendingRequestsForTeamLead(userId?: string): void {
    this.isLoadingRequests = true;
    this.hs.ajax('GetPendinRequestForTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { project_id: userId || '' }
    ).then((resp: any) => {
      // Extract from t_asset_requests (or the expected returning XML tag)
      const result = this.hs.xmltojson(resp, 't_asset_requests');
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];

      // Map to AssetRequest interface for the pending requests array
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
      console.error('[MyAsset] Error fetching pending requests:', err);
      this.isLoadingRequests = false;
    });
  }

}

