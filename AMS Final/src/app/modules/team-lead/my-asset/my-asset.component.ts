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
  expiredWarrantyCount: number = 0;
  isLoading = false;
  isLoadingRequests = false;
  activeTab: 'assets' | 'requests' = 'assets';

  // Assets Pagination
  assetsCurrentPage = 1;
  assetsPageSize = 5;

  // Requests Pagination
  requestsCurrentPage = 1;
  requestsPageSize = 5;

  get paginatedAssets(): Asset[] {
    const startIndex = (this.assetsCurrentPage - 1) * this.assetsPageSize;
    return this.myAssets.slice(startIndex, startIndex + this.assetsPageSize);
  }

  get totalAssetsPages(): number {
    return Math.ceil(this.myAssets.length / this.assetsPageSize) || 1;
  }

  changeAssetsPage(page: number): void {
    if (page >= 1 && page <= this.totalAssetsPages) {
      this.assetsCurrentPage = page;
    }
  }

  get paginatedRequests(): AssetRequest[] {
    const startIndex = (this.requestsCurrentPage - 1) * this.requestsPageSize;
    return this.pendingRequests.slice(startIndex, startIndex + this.requestsPageSize);
  }

  get totalRequestsPages(): number {
    return Math.ceil(this.pendingRequests.length / this.requestsPageSize) || 1;
  }

  changeRequestsPage(page: number): void {
    if (page >= 1 && page <= this.totalRequestsPages) {
      this.requestsCurrentPage = page;
    }
  }

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
    
    this.expiringWarrantyCount = 0;
    this.expiredWarrantyCount = 0;
    
    this.myAssets.forEach(a => {
      if (!a.warrantyExpiry) return;
      const expiry = new Date(a.warrantyExpiry);
      
      if (expiry < now) {
        this.expiredWarrantyCount++;
      } else if (expiry <= ninetyDaysFromNow) {
        this.expiringWarrantyCount++;
      }
    });
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

      this.assetsCurrentPage = 1; // Reset pagination
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

      this.requestsCurrentPage = 1; // Reset pagination
      console.log('[MyAsset] Pending requests from Cordys:', this.pendingRequests);
      this.isLoadingRequests = false;
    }).catch((err: any) => {
      console.error('[MyAsset] Error fetching pending requests:', err);
      this.isLoadingRequests = false;
    });
  }

  async returnAsset(asset: Asset) {
    if (!confirm(`Are you sure you want to return ${asset.name}?`)) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      alert("User session not found.");
      return;
    }

    this.isLoading = true;
    try {
      const returnPayload = {
        tuple: {
          new: {
            t_asset_returns: {
              requested_by: user.id,
              status: "Pending",
              remarks: "Returned by user"
            }
          }
        }
      };

      const res1 = await this.hs.ajax('UpdateT_asset_returns', 'http://schemas.cordys.com/AMS_Database_Metadata', returnPayload);
      
      // Attempt to extract the newly generated ID from the first insert, fallback to asset.id if not found
      const returnData = this.hs.xmltojson(res1, 't_asset_returns');
      const newReturnId = (returnData && (returnData.id || returnData.return_id)) ? (returnData.id || returnData.return_id) : asset.id;
      
      const approvalPayload = {
        tuple: {
          new: {
            t_asset_return_approvals: {
              request_id: newReturnId,
              approver_id: 'usr_004',
              role: 'Asset Manager',
              status: "Pending"
            }
          }
        }
      };
      await this.hs.ajax('UpdateT_asset_return_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', approvalPayload);
      
      alert('Asset return requested successfully');
      
      this.getAssetsByUser(user.id);
      this.PendingRequestsForTeamLead(user.id); // Refresh pending requests occasionally
    } catch (err) {
      console.error("Return error:", err);
      alert("Failed to return asset. Please check the network payload.");
      this.isLoading = false;
    }
  }

  async extendWarranty(asset: Asset) {
    if (!confirm(`Are you sure you want to request a warranty extension for ${asset.name}?`)) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      alert("User session not found.");
      return;
    }

    this.isLoading = true;
    try {
      const extensionPayload = {
        tuple: {
          new: {
            t_asset_returns: { // Assuming same table based on your instructions, if different update here
              asset_id: asset.id,
              requested_by: user.id,
              status: "Pending",
              request_type: "Extend Warranty",
              remarks: "Warranty Extension Requested"
            }
          }
        }
      };
      
      const res1 = await this.hs.ajax('UpdateT_asset_returns', 'http://schemas.cordys.com/AMS_Database_Metadata', extensionPayload);
      
      const returnData = this.hs.xmltojson(res1, 't_asset_returns');
      const newReturnId = (returnData && (returnData.id || returnData.return_id)) ? (returnData.id || returnData.return_id) : asset.id;

      const approvalPayload = {
        tuple: {
          new: {
            t_asset_return_approvals: { 
              request_id: newReturnId,
              approver_id: 'usr_004',
              role: 'Asset Manager',
              status: "Pending"
            }
          }
        }
      };
      await this.hs.ajax('UpdateT_asset_return_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', approvalPayload);

      alert('Warranty extension requested successfully');
      
      this.getAssetsByUser(user.id);
      this.PendingRequestsForTeamLead(user.id);
    } catch (err) {
      console.error("Extend Warranty error:", err);
      alert("Failed to request warranty extension. Please check the network payload.");
      this.isLoading = false;
    }
  }

}

