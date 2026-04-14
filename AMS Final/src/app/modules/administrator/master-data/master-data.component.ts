import { Component, OnInit } from '@angular/core';
import { Asset, AssetCategory, AssetCondition, AssetStatus, AssetType } from '../../../core/models/asset.model';
import { AdminDataService, Project } from '../../../core/services/admin-data.service';
import { AssetService } from '../../../core/services/asset.service';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';

Chart.register(...registerables);

type MasterTab = 'types' | 'categories' | 'assets';
type AddAssetForm = {
  type: AssetType | '';
  category: string;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: AssetStatus | '';
};
type AssetCategoryGroup = {
  type: AssetType;
  icon: string;
  categories: AssetCategory[];
  assetCount: number;
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
  assetCategoryGroups: AssetCategoryGroup[] = [];
  assets: Asset[] = [];
  projects: Project[] = [];
  filteredAssets: Asset[] = [];

  assetTypeOptions: AssetType[] = [];
  assetStatusOptions: string[] = [];
  assetSearchTerm = '';
  selectedAssetType = '';
  selectedAssetSubCategory = '';
  selectedAssetStatus = '';
  assetSubCategoryOptions: string[] = [];
  currentPage = 1;
  pageSize = 5;
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

  assetDoughnutChartData: ChartData<'doughnut', number[], string> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  assetDoughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((Number(context.raw) / total) * 100);
            return `${context.label}: ${context.raw} (${percentage}%)`;
          }
        }
      }
    }
  };

  constructor(
    private assetService: AssetService,
    private adminDataService: AdminDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    await this.loadAssetsFromService();
    const assetStats = this.assetService.getAssetStats();

    this.assetTypes = assetStats.byType;
    this.assetCategories = this.assetService.getCategories();
    this.assets = this.assetService.getAssets();
    this.assetCategoryGroups = this.buildAssetCategoryGroups();
    this.assetTypeOptions = this.assetTypes.map(item => item.type);
    this.assetSubCategoryOptions = Array.from(new Set(this.assets.map(a => a.subCategory))).filter(Boolean).sort();
    this.assetStatusOptions = Array.from(new Set(this.assets.map(a => a.status))).filter(Boolean).sort();
    this.projects = await this.getResolvedProjects();
    this.filterAssets();

    this.summaryCards = [
      { label: 'Asset Types', value: this.assetTypes.length, icon: 'category', color: 'blue' },
      { label: 'Asset Sub Categories', value: this.assetCategories.length, icon: 'dashboard', color: 'purple' },
      { label: 'Assets', value: this.assets.length, icon: 'inventory_2', color: 'green' }
    ];

    this.assetTypeChartData = {
      labels: this.assetTypes.map(item => item.type),
      datasets: [
        {
          data: this.assetTypes.map(item => item.count),
          backgroundColor: this.assetTypes.map(item => this.getAssetTypeColor(item.type)),
          borderRadius: 10,
          barThickness: 18,
          maxBarThickness: 18
        }
      ]
    };

    this.assetDoughnutChartData = {
      labels: this.assetTypes.map(item => item.type),
      datasets: [
        {
          data: this.assetTypes.map(item => item.count),
          backgroundColor: this.assetTypes.map(item => this.getAssetTypeColor(item.type)),
          borderWidth: 0,
          hoverOffset: 4
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

  getCategoryAssetCount(category: AssetCategory): number {
    return this.assets.filter(asset => asset.type === category.type && asset.category === category.name).length;
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
    void this.loadData();
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
      const matchesSubCategory = !this.selectedAssetSubCategory || asset.subCategory === this.selectedAssetSubCategory;
      const matchesStatus = !this.selectedAssetStatus || asset.status === this.selectedAssetStatus;
      return matchesSearch && matchesType && matchesSubCategory && matchesStatus;
    });
    this.currentPage = 1;
  }

  get paginatedAssets() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredAssets.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredAssets.length / this.pageSize);
  }

  get pageNumbers() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    this.currentPage++;
  }

  prevPage() {
    this.currentPage--;
  }

  getAssetTypeIcon(type: AssetType): string {
    const icons: Record<string, string> = {
      [AssetType.HARDWARE]: 'laptop',
      [AssetType.SOFTWARE]: 'code',
      [AssetType.NETWORK]: 'router',
      [AssetType.PERIPHERAL]: 'mouse',
      [AssetType.FURNITURE]: 'chair'
    };
    return icons[type] || 'category';
  }

  getAssetTypeColor(type: AssetType): string {
    const colors: Record<string, string> = {
      [AssetType.HARDWARE]: '#3b82f6',
      [AssetType.SOFTWARE]: '#8b5cf6',
      [AssetType.NETWORK]: '#f59e0b',
      [AssetType.PERIPHERAL]: '#14b8a6',
      [AssetType.FURNITURE]: '#ec4899'
    };
    return colors[type] || '#94a3b8';
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

  getStatusBadgeClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('available')) return 'badge-green';
    if (s.includes('allocated')) return 'badge-blue';
    if (s.includes('repair') || s.includes('maintenance')) return 'badge-amber';
    if (s.includes('retired')) return 'badge-default';
    if (s.includes('reserved') || s.includes('team')) return 'badge-teal';
    return 'badge-default';
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

  formatAssetStatus(status: string): string {
    if (status === 'MoveToAllocationTeam') return 'Allocation Team';
    return status;
  }

  private async getResolvedProjects(): Promise<Project[]> {
    try {
      return await this.adminDataService.getProjectsFromDB();
    } catch (error) {
      console.error('Unable to load DB projects for master data.', error);
      return [];
    }
  }

  private async loadAssetsFromService(): Promise<void> {
    try {
      await this.assetService.fetchAssetsFromService();
    } catch (error) {
      console.error('Unable to load DB assets for master data.', error);
    }
  }

  private buildAssetCategoryGroups(): AssetCategoryGroup[] {
    const categoryMap = new Map<AssetType, AssetCategory[]>();

    this.assetCategories.forEach(category => {
      const categories = categoryMap.get(category.type) || [];
      categories.push(category);
      categoryMap.set(category.type, categories);
    });

    return this.assetTypes
      .filter(item => categoryMap.has(item.type))
      .map(item => ({
        type: item.type,
        icon: categoryMap.get(item.type)?.[0]?.icon || 'category',
        categories: categoryMap.get(item.type) || [],
        assetCount: item.count
      }));
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
