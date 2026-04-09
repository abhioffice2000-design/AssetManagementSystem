import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { Asset, AssetType, AssetStatus, AssetCondition } from '../../../core/models/asset.model';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  assetStats: any = {};
  requestStats: any = {};
  assets: Asset[] = [];
  teamHoldings: any[] = [];

  typeDistribution: { type: string; count: number; value: number; percentage: number }[] = [];
  statusDistribution: { status: string; count: number; percentage: number; color: string }[] = [];
  warrantyAlerts: Asset[] = [];

  totalAssetValue = 0;
  avgAssetCost = 0;

  // Monthly & Yearly Report data
  activeReportTab: 'monthly' | 'yearly' = 'monthly';
  selectedYear = 2026;
  availableYears = [2024, 2025, 2026];

  monthlyData: MonthlyReportRow[] = [];
  yearlyData: YearlyReportRow[] = [];

  monthlyTotals = { requested: 0, approved: 0, rejected: 0 };
  yearlyTotals = { requested: 0, approved: 0, rejected: 0 };

  // Team-wise Asset Holding
  teamAssetHoldings: TeamAssetHolding[] = [];
  teamHoldingTotal = { assets: 0, value: 0 };

  constructor(
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.assets = this.assetService.getAssets();
    
    // Inject Dummy Data if empty
    if (this.assets.length === 0) {
      this.assets = this.getDummyAssets();
    }

    this.assetStats = {
      total: this.assets.length,
      allocated: this.assets.filter(a => a.status === AssetStatus.ALLOCATED).length,
      available: this.assets.filter(a => a.status === AssetStatus.AVAILABLE).length,
      inRepair: this.assets.filter(a => a.status === AssetStatus.IN_REPAIR).length,
      retired: this.assets.filter(a => a.status === AssetStatus.RETIRED).length
    };

    // If requestStats total is 0, give dummy data
    this.requestStats = this.requestService.getRequestStats();
    if (this.requestStats.total === 0) {
       this.requestStats = {
         total: 24,
         pending: 5,
         approved: 8,
         rejected: 2,
         completed: 7,
         inProgress: 2
       };
    }
    this.teamHoldings = this.assetService.getTeamWiseHolding();
    this.buildReportData();
    this.loadMonthlyYearlyData();
    this.loadTeamAssetHoldings();
  }

  buildReportData(): void {
    this.totalAssetValue = this.assets.reduce((sum, a) => sum + a.cost, 0);
    this.avgAssetCost = this.assets.length > 0 ? Math.round(this.totalAssetValue / this.assets.length) : 0;

    const types = Object.values(AssetType);
    const totalCount = this.assets.length || 1;
    this.typeDistribution = types.map(type => {
      const items = this.assets.filter(a => a.type === type);
      return {
        type,
        count: items.length,
        value: items.reduce((s, a) => s + a.cost, 0),
        percentage: Math.round((items.length / totalCount) * 100)
      };
    }).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

    const statusColors: Record<string, string> = {
      'Available': '#10b981', 'Allocated': '#3b82f6', 'In Repair': '#f59e0b',
      'Retired': '#6b7280', 'Reserved': '#8b5cf6'
    };
    const statuses = Object.values(AssetStatus);
    this.statusDistribution = statuses.map(status => {
      const count = this.assets.filter(a => a.status === status).length;
      return { status, count, percentage: Math.round((count / totalCount) * 100), color: statusColors[status] || '#6b7280' };
    }).filter(s => s.count > 0);

    const now = new Date();
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    this.warrantyAlerts = this.assets.filter(a => {
      const expiry = new Date(a.warrantyExpiry);
      const diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff < sixMonths;
    }).sort((a, b) => new Date(a.warrantyExpiry).getTime() - new Date(b.warrantyExpiry).getTime());
  }

  // ===== Monthly & Yearly Report — Hardcoded Data =====
  loadMonthlyYearlyData(): void {
    // Monthly data (for selected year)
    this.monthlyData = [
      { month: 'Jan', requested: 12, approved: 8, rejected: 2 },
      { month: 'Feb', requested: 9, approved: 7, rejected: 1 },
      { month: 'Mar', requested: 15, approved: 10, rejected: 3 },
      { month: 'Apr', requested: 11, approved: 9, rejected: 2 },
      { month: 'May', requested: 8, approved: 6, rejected: 1 },
      { month: 'Jun', requested: 14, approved: 11, rejected: 2 },
      { month: 'Jul', requested: 10, approved: 7, rejected: 3 },
      { month: 'Aug', requested: 13, approved: 9, rejected: 2 },
      { month: 'Sep', requested: 7, approved: 5, rejected: 1 },
      { month: 'Oct', requested: 16, approved: 12, rejected: 3 },
      { month: 'Nov', requested: 11, approved: 8, rejected: 2 },
      { month: 'Dec', requested: 6, approved: 4, rejected: 1 }
    ];

    this.monthlyTotals = {
      requested: this.monthlyData.reduce((s, r) => s + r.requested, 0),
      approved: this.monthlyData.reduce((s, r) => s + r.approved, 0),
      rejected: this.monthlyData.reduce((s, r) => s + r.rejected, 0)
    };

    // Yearly data
    this.yearlyData = [
      { year: 2024, requested: 98, approved: 72, rejected: 18 },
      { year: 2025, requested: 124, approved: 95, rejected: 21 },
      { year: 2026, requested: 132, approved: 96, rejected: 23 }
    ];

    this.yearlyTotals = {
      requested: this.yearlyData.reduce((s, r) => s + r.requested, 0),
      approved: this.yearlyData.reduce((s, r) => s + r.approved, 0),
      rejected: this.yearlyData.reduce((s, r) => s + r.rejected, 0)
    };
  }

  switchReportTab(tab: 'monthly' | 'yearly'): void {
    this.activeReportTab = tab;
  }

  getMaxRequested(): number {
    if (this.activeReportTab === 'monthly') {
      return Math.max(...this.monthlyData.map(r => r.requested), 1);
    }
    return Math.max(...this.yearlyData.map(r => r.requested), 1);
  }

  getBarWidth(value: number): number {
    return Math.round((value / this.getMaxRequested()) * 100);
  }

  getApprovalRate(approved: number, requested: number): number {
    if (requested === 0) return 0;
    return Math.round((approved / requested) * 100);
  }

  // ===== Team-wise Asset Holding — Hardcoded Data =====
  loadTeamAssetHoldings(): void {
    this.teamAssetHoldings = [
      {
        team: 'Frontend', department: 'Engineering', lead: 'Arjun Reddy',
        totalAssets: 12, hardware: 8, software: 3, peripheral: 1,
        totalValue: 485000, members: 6
      },
      {
        team: 'Backend', department: 'Engineering', lead: 'Suresh Patel',
        totalAssets: 10, hardware: 6, software: 3, peripheral: 1,
        totalValue: 420000, members: 5
      },
      {
        team: 'UX Design', department: 'Design', lead: 'Meera Nair',
        totalAssets: 8, hardware: 4, software: 4, peripheral: 0,
        totalValue: 360000, members: 4
      },
      {
        team: 'DevOps', department: 'Engineering', lead: 'Vikram Singh',
        totalAssets: 6, hardware: 3, software: 2, peripheral: 1,
        totalValue: 280000, members: 3
      },
      {
        team: 'QA', department: 'Engineering', lead: 'Priya Sharma',
        totalAssets: 5, hardware: 3, software: 2, peripheral: 0,
        totalValue: 210000, members: 3
      },
      {
        team: 'HR Operations', department: 'Human Resources', lead: 'Ananya Desai',
        totalAssets: 4, hardware: 2, software: 1, peripheral: 1,
        totalValue: 150000, members: 3
      }
    ];

    this.teamHoldingTotal = {
      assets: this.teamAssetHoldings.reduce((s, t) => s + t.totalAssets, 0),
      value: this.teamAssetHoldings.reduce((s, t) => s + t.totalValue, 0)
    };
  }

  getTeamPercentage(teamAssets: number): number {
    if (this.teamHoldingTotal.assets === 0) return 0;
    return Math.round((teamAssets / this.teamHoldingTotal.assets) * 100);
  }

  getAssetsPerMember(totalAssets: number, members: number): string {
    if (members === 0) return '0';
    return (totalAssets / members).toFixed(1);
  }

  // ===== Existing Helper Methods =====
  formatCurrency(value: number): string {
    return '₹' + value.toLocaleString('en-IN');
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case AssetType.HARDWARE: return 'computer';
      case AssetType.SOFTWARE: return 'code';
      case AssetType.NETWORK: return 'router';
      case AssetType.PERIPHERAL: return 'mouse';
      case AssetType.FURNITURE: return 'chair';
      default: return 'category';
    }
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'Hardware': '#3b82f6', 'Software': '#8b5cf6', 'Network': '#f59e0b',
      'Peripheral': '#10b981', 'Furniture': '#ec4899'
    };
    return colors[type] || '#6b7280';
  }

  getDaysUntilExpiry(dateStr: string): number {
    const expiry = new Date(dateStr);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  getExpiryUrgency(dateStr: string): string {
    const days = this.getDaysUntilExpiry(dateStr);
    if (days <= 30) return 'expiry-critical';
    if (days <= 90) return 'expiry-warning';
    return 'expiry-info';
  }

  getDummyAssets(): Asset[] {
    const now = new Date();
    const expDate1 = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString(); // 1 month
    const expDate2 = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)).toISOString(); // 3 months
    
    return [
      { id: '1', assetTag: 'HW-001', name: 'MacBook Pro 16"', type: AssetType.HARDWARE, status: AssetStatus.ALLOCATED, vendor: 'Apple', cost: 185000, purchaseDate: '2023-01-15', warrantyExpiry: expDate2, location: 'HQ', category: 'Laptop', subCategory: '', serialNumber: '', condition: AssetCondition.GOOD },
      { id: '2', assetTag: 'HW-002', name: 'Dell XPS 15', type: AssetType.HARDWARE, status: AssetStatus.AVAILABLE, vendor: 'Dell', cost: 145000, purchaseDate: '2023-03-20', warrantyExpiry: expDate1, location: 'HQ', category: 'Laptop', subCategory: '', serialNumber: '', condition: AssetCondition.NEW },
      { id: '3', assetTag: 'HW-003', name: 'Lenovo ThinkPad', type: AssetType.HARDWARE, status: AssetStatus.IN_REPAIR, vendor: 'Lenovo', cost: 120000, purchaseDate: '2022-11-10', warrantyExpiry: expDate1, location: 'Remote', category: 'Laptop', subCategory: '', serialNumber: '', condition: AssetCondition.DAMAGED },
      { id: '4', assetTag: 'SW-001', name: 'Adobe Creative Cloud', type: AssetType.SOFTWARE, status: AssetStatus.ALLOCATED, vendor: 'Adobe', cost: 45000, purchaseDate: '2024-01-01', warrantyExpiry: '2025-01-01', location: 'Cloud', category: 'License', subCategory: '', serialNumber: '', condition: AssetCondition.GOOD },
      { id: '5', assetTag: 'SW-002', name: 'Microsoft 365', type: AssetType.SOFTWARE, status: AssetStatus.AVAILABLE, vendor: 'Microsoft', cost: 15000, purchaseDate: '2024-02-15', warrantyExpiry: '2025-02-15', location: 'Cloud', category: 'License', subCategory: '', serialNumber: '', condition: AssetCondition.NEW },
      { id: '6', assetTag: 'NW-001', name: 'Cisco Router 4000', type: AssetType.NETWORK, status: AssetStatus.ALLOCATED, vendor: 'Cisco', cost: 85000, purchaseDate: '2022-05-12', warrantyExpiry: expDate2, location: 'Server Room 1', category: 'Networking', subCategory: '', serialNumber: '', condition: AssetCondition.GOOD },
      { id: '7', assetTag: 'PR-001', name: 'Logitech MX Master 3', type: AssetType.PERIPHERAL, status: AssetStatus.AVAILABLE, vendor: 'Logitech', cost: 8500, purchaseDate: '2023-08-22', warrantyExpiry: '2025-08-22', location: 'HQ', category: 'Mouse', subCategory: '', serialNumber: '', condition: AssetCondition.NEW },
      { id: '8', assetTag: 'PR-002', name: 'Dell UltraSharp 27"', type: AssetType.PERIPHERAL, status: AssetStatus.ALLOCATED, vendor: 'Dell', cost: 35000, purchaseDate: '2023-06-10', warrantyExpiry: '2026-06-10', location: 'HQ', category: 'Monitor', subCategory: '', serialNumber: '', condition: AssetCondition.GOOD },
      { id: '9', assetTag: 'FN-001', name: 'Herman Miller Chair', type: AssetType.FURNITURE, status: AssetStatus.RESERVED, vendor: 'Herman Miller', cost: 110000, purchaseDate: '2021-12-05', warrantyExpiry: '2033-12-05', location: 'HQ', category: 'Office Chair', subCategory: '', serialNumber: '', condition: AssetCondition.GOOD },
      { id: '10', assetTag: 'FN-002', name: 'Standing Desk', type: AssetType.FURNITURE, status: AssetStatus.ALLOCATED, vendor: 'Uplift', cost: 55000, purchaseDate: '2022-09-18', warrantyExpiry: '2029-09-18', location: 'HQ', category: 'Desk', subCategory: '', serialNumber: '', condition: AssetCondition.GOOD }
    ];
  }
}

interface MonthlyReportRow {
  month: string;
  requested: number;
  approved: number;
  rejected: number;
}

interface YearlyReportRow {
  year: number;
  requested: number;
  approved: number;
  rejected: number;
}

interface TeamAssetHolding {
  team: string;
  department: string;
  lead: string;
  totalAssets: number;
  hardware: number;
  software: number;
  peripheral: number;
  totalValue: number;
  members: number;
}
