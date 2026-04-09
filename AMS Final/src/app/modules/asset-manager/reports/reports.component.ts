import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { Asset, AssetType, AssetStatus } from '../../../core/models/asset.model';

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
  topAssets: Asset[] = [];
  warrantyAlerts: Asset[] = [];

  totalAssetValue = 0;
  avgAssetCost = 0;

  constructor(
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.assets = this.assetService.getAssets();
    this.assetStats = this.assetService.getAssetStats();
    this.requestStats = this.requestService.getRequestStats();
    this.teamHoldings = this.assetService.getTeamWiseHolding();
    this.buildReportData();
  }

  buildReportData(): void {
    // Total value
    this.totalAssetValue = this.assets.reduce((sum, a) => sum + a.cost, 0);
    this.avgAssetCost = Math.round(this.totalAssetValue / this.assets.length);

    // Type distribution
    const types = Object.values(AssetType);
    const totalCount = this.assets.length;
    this.typeDistribution = types.map(type => {
      const items = this.assets.filter(a => a.type === type);
      return {
        type,
        count: items.length,
        value: items.reduce((s, a) => s + a.cost, 0),
        percentage: Math.round((items.length / totalCount) * 100)
      };
    }).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

    // Status distribution
    const statusColors: Record<string, string> = {
      'Available': '#10b981',
      'Allocated': '#3b82f6',
      'In Repair': '#f59e0b',
      'Retired': '#6b7280',
      'Reserved': '#8b5cf6'
    };
    const statuses = Object.values(AssetStatus);
    this.statusDistribution = statuses.map(status => {
      const count = this.assets.filter(a => a.status === status).length;
      return {
        status,
        count,
        percentage: Math.round((count / totalCount) * 100),
        color: statusColors[status] || '#6b7280'
      };
    }).filter(s => s.count > 0);

    // Top 5 most expensive assets
    this.topAssets = [...this.assets].sort((a, b) => b.cost - a.cost).slice(0, 5);

    // Warranty expiring within 6 months
    const now = new Date();
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    this.warrantyAlerts = this.assets.filter(a => {
      const expiry = new Date(a.warrantyExpiry);
      const diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff < sixMonths;
    }).sort((a, b) => new Date(a.warrantyExpiry).getTime() - new Date(b.warrantyExpiry).getTime());
  }

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
      'Hardware': '#3b82f6',
      'Software': '#8b5cf6',
      'Network': '#f59e0b',
      'Peripheral': '#10b981',
      'Furniture': '#ec4899'
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
}
