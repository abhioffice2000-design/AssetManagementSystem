import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { Asset } from '../../../core/models/asset.model';
import { HeroService } from 'src/app/core/services/hero.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-allocation-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class AllocationInventoryComponent implements OnInit {
  allAssets: Asset[] = [];
  filteredAssets: Asset[] = [];
  loading = true;
  searchText = '';
  statusFilter = '';
  
  viewMode: 'summary' | 'details' = 'summary';
  typeSummaries: any[] = [];

  // Warranty Update Modal
  isWarrantyModalOpen = false;
  selectedAsset: Asset | null = null;
  warrantyForm!: FormGroup;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  paginatedAssets: Asset[] = [];
  totalPages = 1;

  constructor(
    private assetService: AssetService,
    private hs: HeroService,
    private notification: NotificationService,
    private fb: FormBuilder
  ) {
    this.warrantyForm = this.fb.group({
      newExpiry: ['', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadInventory();
  }

  async loadInventory(): Promise<void> {
    this.loading = true;
    try {
      this.allAssets = await this.assetService.fetchAssetsFromService();
      await this.calculateSummary();
      this.applyFilters();
    } catch (error) {
      console.error('Failed to load inventory', error);
      this.notification.showToast('Failed to load inventory data', 'error');
    } finally {
      this.loading = false;
    }
  }

  async calculateSummary(): Promise<void> {
    const typesMap = new Map<string, any>();
    
    try {
      // First, try to get all known asset types to ensure even empty categories show up
      const counts = await this.assetService.fetchAssetTypeWiseCount();
      counts.forEach(c => {
        if (!typesMap.has(c.type_name)) {
          typesMap.set(c.type_name, {
            name: c.type_name,
            total: 0,
            available: 0,
            assigned: 0,
            other: 0,
            subCategories: new Map<string, any>()
          });
        }
      });
    } catch (err) {
      console.warn('Failed to fetch asset types, falling back to local asset list only');
    }
    
    this.finalProcessSummary(typesMap);
  }

  private finalProcessSummary(typesMap: Map<string, any>): void {
    this.allAssets.forEach(asset => {
      const type = asset.type as string || 'Other';
      const subCat = asset.category || 'Uncategorized';
      const statusValue = (asset.status || '').toLowerCase().trim();
      
      const isAvailable = statusValue === 'available' || statusValue === 'movetoallocationteam';
      const isAssigned = statusValue === 'allocated' || statusValue === 'assigned';

      if (!typesMap.has(type)) {
        typesMap.set(type, {
          name: type,
          total: 0,
          available: 0,
          assigned: 0,
          other: 0,
          subCategories: new Map<string, any>()
        });
      }

      const typeData = typesMap.get(type);
      typeData.total++;
      if (isAvailable) typeData.available++;
      else if (isAssigned) typeData.assigned++;
      else typeData.other++;

      if (!typeData.subCategories.has(subCat)) {
        typeData.subCategories.set(subCat, {
          name: subCat,
          total: 0,
          available: 0,
          assigned: 0,
          other: 0
        });
      }

      const subData = typeData.subCategories.get(subCat);
      subData.total++;
      if (isAvailable) subData.available++;
      else if (isAssigned) subData.assigned++;
      else subData.other++;
    });

    // Convert Map to array for template and assign dynamic pastel gradients
    const gradients = [
      'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', // Pastel Blue
      'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', // Pastel Emerald/Sage
      'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', // Pastel Lavender
      'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', // Pastel Rose
      'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'  // Pastel Amber
    ];

    this.typeSummaries = Array.from(typesMap.values())
      .sort((a: any, b: any) => a.name.localeCompare(b.name)) // Sort alphabetically
      .map((type, index) => ({
        ...type,
        subCategories: Array.from(type.subCategories.values()).sort((a: any, b: any) => a.name.localeCompare(b.name)),
        gradient: gradients[index % gradients.length]
      }));
  }

  selectSubCategory(subCat: string): void {
    this.searchText = subCat;
    this.statusFilter = '';
    this.viewMode = 'details';
    this.currentPage = 1; // Reset to page 1
    this.applyFilters();
  }

  applyFilters(): void {
    let results = [...this.allAssets];

    if (this.statusFilter) {
      if (this.statusFilter === 'Available') {
        results = results.filter(a => a.status === 'Available' || a.status === 'MoveToAllocationTeam');
      } else {
        results = results.filter(a => a.status === this.statusFilter);
      }
    }

    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase().trim();
      results = results.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.assignedToName || '').toLowerCase().includes(q)
      );
    }

    this.filteredAssets = results;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredAssets.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedAssets = this.filteredAssets.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.updatePagination();
    }
  }

  getPaginationRange(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredAssets.length);
    return `${start} to ${end} of ${this.filteredAssets.length}`;
  }

  getPageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page on filter
    this.applyFilters();
  }

  openWarrantyModal(asset: Asset): void {
    this.selectedAsset = asset;
    // Format existing date if present to YYYY-MM-DD
    const existingDate = asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '';
    this.warrantyForm.patchValue({ newExpiry: existingDate });
    this.isWarrantyModalOpen = true;
  }

  closeWarrantyModal(): void {
    this.isWarrantyModalOpen = false;
    this.selectedAsset = null;
  }

  async updateWarranty(): Promise<void> {
    if (this.warrantyForm.invalid || !this.selectedAsset) return;

    const newExpiry = this.warrantyForm.value.newExpiry;
    
    // SOAP call to update M_assets
    const updateSoap = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <UpdateM_assets xmlns="http://schemas.cordys.com/AMS_Database_Metadata" reply="yes" commandUpdate="no" preserveSpace="no" batchUpdate="no">
      <tuple>
        <old>
          <m_assets qConstraint="0">
            <asset_id>${this.selectedAsset.id}</asset_id>
          </m_assets>
        </old>
        <new>
          <m_assets qAccess="0" qConstraint="0" qInit="0" qValues="">
            <warranty_expiry>${newExpiry}</warranty_expiry>
          </m_assets>
        </new>
      </tuple>
    </UpdateM_assets>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      this.loading = true;
      await this.hs.ajax(null, null, {}, updateSoap);
      this.notification.showToast('Warranty expiry updated successfully', 'success');
      this.closeWarrantyModal();
      await this.loadInventory(); // Refresh list
    } catch (error) {
      console.error('Update warranty failed', error);
      this.notification.showToast('Failed to update warranty', 'error');
    } finally {
      this.loading = false;
    }
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('available') || s.includes('movetoallocationteam')) return 'status-available';
    if (s.includes('allocated') || s.includes('assigned')) return 'status-allocated';
    if (s.includes('repair')) return 'status-maintenance';
    return 'status-other';
  }
}
