import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class ManagerDashboardComponent implements OnInit {
  // Top-level stats
  totalInventory = 0;
  allocatedAssets = 0;
  pendingRequests = 0;
  availableAssets = 0;

  // Type breakdown
  typeBreakdown: TypeBreakdown[] = [];

  // Total for percentage calculation
  grandTotal = 0;

  // Loading state
  isLoading = true;
  loadError = '';

  // Icon & color mapping for known types
  private typeStyleMap: Record<string, { icon: string; color: string; bgColor: string }> = {
    'hardware':   { icon: 'computer',   color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
    'software':   { icon: 'code',       color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
    'network':    { icon: 'router',     color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
    'peripheral': { icon: 'mouse',      color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
    'furniture':  { icon: 'chair',      color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.1)' }
  };

  // Fallback colors for unknown types
  private fallbackColors = [
    { icon: 'category', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)' },
    { icon: 'widgets',  color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.1)' },
    { icon: 'inventory_2', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' }
  ];

  // Hardcoded sub-categories per type (replace with service later)
  private subCategoryMap: Record<string, { name: string; count: number }[]> = {
    'hardware': [
      { name: 'Laptop', count: 5 },
      { name: 'Monitor', count: 2 },
      { name: 'Desktop', count: 1 }
    ],
    'software': [
      { name: 'Productivity Suite', count: 1 },
      { name: 'Development Tools', count: 1 },
      { name: 'Design Tools', count: 1 }
    ],
    'network': [
      { name: 'Router', count: 1 }
    ],
    'peripheral': [
      { name: 'Keyboard', count: 1 },
      { name: 'Mouse', count: 1 }
    ],
    'furniture': [
      { name: 'Desk', count: 1 }
    ]
  };

  constructor(
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      // Fetch type-wise counts from the SOAP service
      const typeCounts = await this.assetService.fetchAssetTypeWiseCount();

      // Build typeBreakdown from service response
      let fallbackIndex = 0;
      this.typeBreakdown = typeCounts.map(item => {
        const key = (item.type_name || '').toLowerCase();
        const style = this.typeStyleMap[key] || this.fallbackColors[fallbackIndex++ % this.fallbackColors.length];

        return {
          type: item.type_name,
          icon: style.icon,
          color: style.color,
          bgColor: style.bgColor,
          count: item.asset_count,
          subCategories: this.subCategoryMap[key] || []
        };
      });

      // Sort by count descending
      this.typeBreakdown.sort((a, b) => b.count - a.count);

      // Calculate totals
      this.grandTotal = this.typeBreakdown.reduce((sum, t) => sum + t.count, 0);
      this.totalInventory = this.grandTotal;

      this.allocatedAssets = 0;
      this.availableAssets = 0;
      
      try {
        const [pendingReqs, assetDetails, allocatedAssets] = await Promise.all([
          this.requestService.fetchPendingRequestsFromService(),
          this.assetService.fetchAssetDetailsFromService(),
          this.assetService.fetchAllocatedAssetsFromService()
        ]);
        
        this.pendingRequests = pendingReqs.length;
        
        // Calculate Available from Getassetdetails
        this.availableAssets = assetDetails.filter(
          (a) => a.status && a.status.toLowerCase() === 'available'
        ).length;
        
        // Use Getallocatedasset for Allocated Assets
        this.allocatedAssets = allocatedAssets.length;
      } catch (err) {
        console.error('Failed to load stat card counts:', err);
        this.pendingRequests = 0;
        this.availableAssets = 0;
        this.allocatedAssets = 0;
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      this.loadError = err?.message || err?.errorThrown || 'Failed to load dashboard data. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  getTypePercentage(count: number): number {
    if (this.grandTotal === 0) return 0;
    return Math.round((count / this.grandTotal) * 100);
  }

  getPieChartGradient(): string {
    if (this.grandTotal === 0 || this.typeBreakdown.length === 0) {
      return 'conic-gradient(var(--border-color) 0% 100%)';
    }
    
    let gradientParts = [];
    let cumulativePercent = 0;
    
    for (let i = 0; i < this.typeBreakdown.length; i++) {
      const item = this.typeBreakdown[i];
      const start = cumulativePercent;
      let pct = (item.count / this.grandTotal) * 100;
      let end = cumulativePercent + pct;
      
      if (i === this.typeBreakdown.length - 1) {
        end = 100;
      }
      
      gradientParts.push(`${item.color} ${start}% ${end}%`);
      cumulativePercent += pct;
    }
    return `conic-gradient(${gradientParts.join(', ')})`;
  }

  getSubCatPercentage(subCount: number, typeCount: number): number {
    if (typeCount === 0) return 0;
    return Math.round((subCount / typeCount) * 100);
  }
}

interface SubCategory {
  name: string;
  count: number;
}

interface TypeBreakdown {
  type: string;
  icon: string;
  color: string;
  bgColor: string;
  count: number;
  subCategories: SubCategory[];
}
