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
  allocationTeamAssets = 0;
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

  // Known mapping of subcategory names → type key (lowercase)
  // Used to assign subcategory counts from GetDashboardData to their parent type
  private subCategoryTypeMapping: Record<string, string> = {
    'laptop': 'hardware', 'monitor': 'hardware', 'desktop': 'hardware',
    'server': 'hardware', 'workstation': 'hardware', 'tablet': 'hardware',
    'productivity suite': 'software', 'development tools': 'software',
    'design tools': 'software', 'software license': 'software',
    'ide license': 'software', 'license': 'software',
    'antivirus': 'software', 'ms office': 'software',
    'router': 'network', 'switch': 'network', 'access point': 'network',
    'firewall': 'network',
    'keyboard': 'peripheral', 'mouse': 'peripheral', 'headphones': 'peripheral',
    'webcam': 'peripheral', 'printer': 'peripheral',
    'desk': 'furniture', 'chair': 'furniture', 'cabinet': 'furniture'
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
      // Fetch everything we need in parallel for efficiency
      const [typeCounts, allAssets, allocatedAssets, allocationTeamAssets] = await Promise.all([
        this.assetService.fetchAssetTypeWiseCount(),
        this.assetService.fetchAssetsFromService(),
        this.assetService.fetchAllocatedAssetsFromService(),
        this.assetService.fetchAllocationTeamAssetsFromService()
      ]);

      // 1. Calculate Top-Level Stat Cards
      this.totalInventory = allAssets.length;
      this.allocatedAssets = allocatedAssets.length;
      this.allocationTeamAssets = allocationTeamAssets.length;
      
      // Calculate Available from the full asset list
      this.availableAssets = allAssets.filter(
        a => a.status && a.status.toLowerCase() === 'available'
      ).length;

      // 2. Build the Breakdown Data
      // Group assets by type and then by subcategory for the breakdown section
      const breakdownMap: Record<string, { count: number, subCats: Record<string, number> }> = {};
      
      allAssets.forEach(asset => {
        const type = (asset.type || 'Other').toString();
        const typeKey = type.toLowerCase().trim();
        const subCat = asset.subCategory || 'Uncategorized';

        if (!breakdownMap[typeKey]) {
          breakdownMap[typeKey] = { count: 0, subCats: {} };
        }
        
        breakdownMap[typeKey].count++;
        breakdownMap[typeKey].subCats[subCat] = (breakdownMap[typeKey].subCats[subCat] || 0) + 1;
      });

      // 3. Map to TypeBreakdown array using typeCounts from DB as the master list
      let fallbackIndex = 0;
      this.typeBreakdown = typeCounts.map(tc => {
        const typeName = tc.type_name;
        const key = typeName.toLowerCase().trim();
        const style = this.typeStyleMap[key] || this.fallbackColors[fallbackIndex++ % this.fallbackColors.length];
        
        // Use data from our calculated breakdownMap if available
        const calculatedData = breakdownMap[key];
        
        // Convert subCats record to an array of {name, count}
        const subCategoriesArray = calculatedData 
          ? Object.keys(calculatedData.subCats).map(name => ({
              name: name,
              count: calculatedData.subCats[name]
            })).sort((a, b) => b.count - a.count)
          : [];

        return {
          type: typeName,
          icon: style.icon,
          color: style.color,
          bgColor: style.bgColor,
          count: tc.asset_count, // Use DB aggregate for header total
          subCategories: subCategoriesArray
        };
      });

      // Sort types by count descending
      this.typeBreakdown.sort((a, b) => b.count - a.count);
      this.grandTotal = this.totalInventory;

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      this.loadError = err?.message || err?.errorThrown || 'Failed to load dashboard data. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Attempts to guess the parent type from a subcategory name if not in the mapping.
   */
  private guessTypeFromName(name: string): string {
    // Default to 'hardware' if we can't determine the type
    return 'hardware';
  }

  getTypePercentage(count: number): number {
    if (this.grandTotal === 0) return 0;
    return Math.round((count / this.grandTotal) * 100);
  }

  // ===== Interactive Pie Chart Hover =====
  hoveredTypeIndex: number = -1;

  onTypeHover(index: number): void {
    this.hoveredTypeIndex = index;
  }

  onTypeLeave(): void {
    this.hoveredTypeIndex = -1;
  }

  /**
   * Generates an SVG arc path for a donut slice at the given index.
   * Center: (120,120), outer radius: 110, inner radius: 66
   */
  getSlicePath(index: number): string {
    if (this.grandTotal === 0) return '';

    const cx = 120, cy = 120;
    const outerR = 110, innerR = 66;

    // Calculate start angle (cumulative of all previous slices)
    let startAngleDeg = -90; // Start from 12 o'clock
    for (let i = 0; i < index; i++) {
      startAngleDeg += (this.typeBreakdown[i].count / this.grandTotal) * 360;
    }
    const sliceAngleDeg = (this.typeBreakdown[index].count / this.grandTotal) * 360;
    const endAngleDeg = startAngleDeg + sliceAngleDeg;

    const startRad = (startAngleDeg * Math.PI) / 180;
    const endRad = (endAngleDeg * Math.PI) / 180;

    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const x3 = cx + innerR * Math.cos(endRad);
    const y3 = cy + innerR * Math.sin(endRad);
    const x4 = cx + innerR * Math.cos(startRad);
    const y4 = cy + innerR * Math.sin(startRad);

    const largeArc = sliceAngleDeg > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
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
