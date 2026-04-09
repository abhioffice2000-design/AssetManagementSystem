import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { Asset, AssetType, AssetStatus, AssetCondition } from '../../../core/models/asset.model';

@Component({
  selector: 'app-asset-inventory',
  templateUrl: './asset-inventory.component.html',
  styleUrls: ['./asset-inventory.component.scss']
})
export class AssetInventoryComponent implements OnInit {
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  searchTerm = '';
  selectedType = '';
  selectedStatus = '';
  assetTypes = Object.values(AssetType);
  assetStatuses = Object.values(AssetStatus);
  selectedAsset: Asset | null = null;
  showDetailModal = false;

  // Loading & error state
  isLoading = true;
  loadError = '';

  constructor(private assetService: AssetService) {}

  ngOnInit(): void {
    this.loadAssets();
  }

  async loadAssets(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      this.assets = await this.assetService.fetchAssetsFromService();
      this.filteredAssets = [...this.assets];
    } catch (err: any) {
      console.error('Failed to load assets:', err);
      this.loadError = err?.message || err?.errorThrown || 'Failed to load asset data. Please try again.';
      this.assets = [];
      this.filteredAssets = [];
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    this.filteredAssets = this.assets.filter(asset => {
      const matchesSearch = !this.searchTerm ||
        asset.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        asset.assetTag.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (asset.assignedToName && asset.assignedToName.toLowerCase().includes(this.searchTerm.toLowerCase()));
      const matchesType = !this.selectedType || asset.type === this.selectedType;
      const matchesStatus = !this.selectedStatus || asset.status === this.selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.filteredAssets = [...this.assets];
  }

  viewAssetDetail(asset: Asset): void {
    this.selectedAsset = asset;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedAsset = null;
  }

  getConditionClass(condition: AssetCondition): string {
    switch (condition) {
      case AssetCondition.NEW: return 'condition-new';
      case AssetCondition.GOOD: return 'condition-good';
      case AssetCondition.FAIR: return 'condition-fair';
      case AssetCondition.POOR: return 'condition-poor';
      case AssetCondition.DAMAGED: return 'condition-damaged';
      default: return '';
    }
  }

  getTypeIcon(type: AssetType): string {
    switch (type) {
      case AssetType.HARDWARE: return 'computer';
      case AssetType.SOFTWARE: return 'code';
      case AssetType.NETWORK: return 'router';
      case AssetType.PERIPHERAL: return 'mouse';
      case AssetType.FURNITURE: return 'chair';
      default: return 'category';
    }
  }

  formatCurrency(value: number): string {
    return '₹' + value.toLocaleString('en-IN');
  }
}
