import { Component, OnInit } from '@angular/core';
import { Asset, AssetCategory, AssetCondition, AssetStatus, AssetType } from '../../../core/models/asset.model';
import { AdminDataService, Project } from '../../../core/services/admin-data.service';
import { AssetService } from '../../../core/services/asset.service';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';

Chart.register(...registerables);

type MasterTab = 'types' | 'categories' | 'assets' | 'projects';
type AddAssetForm = {
  type: AssetType | '';
  category: string;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: AssetStatus | '';
};

@Component({
  selector: 'app-master-data',
  templateUrl: './master-data.component.html',
  styleUrls: ['./master-data.component.scss']
})
export class MasterDataComponent implements OnInit {
  activeTab: MasterTab = 'types';

  assetTypes: Array<{ type: AssetType; count: number; value: number }> = [];
  assetCategories: AssetCategory[] = [];
  assets: Asset[] = [];
  projects: Project[] = [];
  filteredAssets: Asset[] = [];

  assetTypeOptions = Object.values(AssetType);
  assetStatusOptions = Object.values(AssetStatus);
  assetSearchTerm = '';
  selectedAssetType = '';
  showAddAssetModal = false;
  selectedCategory = '';
  submittedAssetForm = false;
  newAsset: AddAssetForm = this.createEmptyAsset();

  summaryCards: Array<{ label: string; value: number | string; icon: string; color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' }> = [];
  assetTypeChartData: ChartData<'bar', number[], string> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  assetTypeChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.16)'
        }
      },
      y: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const item = this.assetTypes[context.dataIndex];
            const valueLabel = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0
            }).format(item?.value || 0);
            return ` ${context.raw} assets | ${valueLabel}`;
          }
        }
      }
    }
  };

  constructor(
    private assetService: AssetService,
    private adminDataService: AdminDataService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const assetStats = this.assetService.getAssetStats();

    this.assetTypes = assetStats.byType;
    this.assetCategories = this.assetService.getCategories();
    this.assets = this.assetService.getAssets();
    this.projects = this.adminDataService.getProjects();
    this.filterAssets();

    this.summaryCards = [
      { label: 'Asset Types', value: this.assetTypes.length, icon: 'category', color: 'blue' },
      { label: 'Asset Sub Categories', value: this.assetCategories.length, icon: 'dashboard', color: 'purple' },
      { label: 'Assets', value: this.assets.length, icon: 'inventory_2', color: 'green' },
      { label: 'Projects', value: this.projects.length, icon: 'folder_open', color: 'amber' }
    ];

    this.assetTypeChartData = {
      labels: this.assetTypes.map(item => item.type),
      datasets: [
        {
          data: this.assetTypes.map(item => item.count),
          backgroundColor: ['#2563eb', '#22c55e', '#f59e0b', '#14b8a6', '#94a3b8'],
          borderRadius: 10,
          barThickness: 18,
          maxBarThickness: 18
        }
      ]
    };
  }

  get totalAssetTypeValue(): number {
    return this.assetTypes.reduce((sum, item) => sum + item.value, 0);
  }

  get totalAssetTypeCount(): number {
    return this.assetTypes.reduce((sum, item) => sum + item.count, 0);
  }

  getAssetTypeShare(count: number): number {
    return this.totalAssetTypeCount ? Math.round((count / this.totalAssetTypeCount) * 100) : 0;
  }

  setTab(tab: MasterTab): void {
    this.activeTab = tab;
  }

  openAddAssetModal(): void {
    this.showAddAssetModal = true;
    this.newAsset = this.createEmptyAsset();
    this.selectedCategory = '';
    this.submittedAssetForm = false;
  }

  closeAddAssetModal(): void {
    this.showAddAssetModal = false;
    this.submittedAssetForm = false;
  }

  onAssetTypeChange(type: AssetType | ''): void {
    this.newAsset.type = type;
    this.selectedCategory = '';
    this.newAsset.category = '';
  }

  getCategoriesForSelectedType(): AssetCategory[] {
    return this.newAsset.type
      ? this.assetCategories.filter(category => category.type === this.newAsset.type)
      : this.assetCategories;
  }

  get categoryDisabled(): boolean {
    return !this.newAsset.type;
  }

  get categoryHelperText(): string {
    if (!this.newAsset.type) {
      return 'Choose an asset type first to see matching categories.';
    }
    const categories = this.getCategoriesForSelectedType();
    return categories.length ? 'Select a category that belongs to the chosen type.' : 'No categories are mapped for the selected type.';
  }

  onAssetCategoryChange(categoryName: string): void {
    this.newAsset.category = categoryName;
    this.selectedCategory = categoryName;
  }

  saveAsset(): void {
    this.submittedAssetForm = true;
    if (!this.newAsset.type || !this.newAsset.category || !this.newAsset.name || !this.newAsset.serialNumber || !this.newAsset.purchaseDate || !this.newAsset.warrantyExpiry || !this.newAsset.status) {
      return;
    }

    const selectedCategory = this.assetCategories.find(category => category.name === this.newAsset.category);
    const nextId = `AST${String(this.assets.length + 1).padStart(3, '0')}`;
    const nextTag = `${this.newAsset.type.slice(0, 2).toUpperCase()}-${this.newAsset.name.replace(/\s+/g, '-').slice(0, 8).toUpperCase()}-${String(this.assets.length + 1).padStart(3, '0')}`;

    const asset: Asset = {
      id: nextId,
      assetTag: nextTag,
      name: this.newAsset.name,
      type: this.newAsset.type,
      category: this.newAsset.category,
      subCategory: selectedCategory?.subCategories[0] || 'Standard',
      status: this.newAsset.status,
      location: 'To Be Assigned',
      purchaseDate: this.newAsset.purchaseDate,
      warrantyExpiry: this.newAsset.warrantyExpiry,
      vendor: 'Internal',
      serialNumber: this.newAsset.serialNumber,
      cost: 0,
      condition: AssetCondition.GOOD
    };

    this.assetService.addAsset(asset);
    this.closeAddAssetModal();
    this.loadData();
    this.activeTab = 'assets';
  }

  isFieldInvalid(field: keyof typeof this.newAsset): boolean {
    return this.submittedAssetForm && !this.newAsset[field];
  }

  filterAssets(): void {
    this.filteredAssets = this.assets.filter(asset => {
      const search = this.assetSearchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        asset.name.toLowerCase().includes(search) ||
        asset.assetTag.toLowerCase().includes(search) ||
        asset.category.toLowerCase().includes(search) ||
        asset.vendor.toLowerCase().includes(search);
      const matchesType = !this.selectedAssetType || asset.type === this.selectedAssetType;
      return matchesSearch && matchesType;
    });
  }

  getTypeBadgeClass(type: AssetType): string {
    const map: Record<string, string> = {
      [AssetType.HARDWARE]: 'badge-blue',
      [AssetType.SOFTWARE]: 'badge-green',
      [AssetType.NETWORK]: 'badge-amber',
      [AssetType.PERIPHERAL]: 'badge-teal',
      [AssetType.FURNITURE]: 'badge-default'
    };
    return map[type] || 'badge-default';
  }

  getStatusBadgeClass(status: AssetStatus): string {
    const map: Record<string, string> = {
      [AssetStatus.AVAILABLE]: 'badge-green',
      [AssetStatus.ALLOCATED]: 'badge-blue',
      [AssetStatus.IN_REPAIR]: 'badge-amber',
      [AssetStatus.RETIRED]: 'badge-default',
      [AssetStatus.RESERVED]: 'badge-teal'
    };
    return map[status] || 'badge-default';
  }

  getConditionBadgeClass(condition: AssetCondition): string {
    const map: Record<string, string> = {
      [AssetCondition.NEW]: 'badge-blue',
      [AssetCondition.GOOD]: 'badge-green',
      [AssetCondition.FAIR]: 'badge-amber',
      [AssetCondition.POOR]: 'badge-default',
      [AssetCondition.DAMAGED]: 'badge-red'
    };
    return map[condition] || 'badge-default';
  }

  getProjectBadgeClass(status: Project['status']): string {
    const map: Record<string, string> = {
      Active: 'badge-green',
      Completed: 'badge-blue',
      'On Hold': 'badge-amber',
      Cancelled: 'badge-default'
    };
    return map[status] || 'badge-default';
  }

  formatAssetStatus(status: AssetStatus): string {
    return status === AssetStatus.IN_REPAIR ? 'Maintenance' : status;
  }

  private createEmptyAsset(): AddAssetForm {
    return {
      type: '',
      category: '',
      name: '',
      serialNumber: '',
      purchaseDate: '',
      warrantyExpiry: '',
      status: ''
    };
  }
}
