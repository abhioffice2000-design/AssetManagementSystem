import { Component, HostListener, OnInit } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { WarrantySchedulerService } from '../../../core/services/warranty-scheduler.service';
import { AssetService } from '../../../core/services/asset.service';

@Component({
  selector: 'app-warranty-scheduler',
  templateUrl: './warranty-scheduler.component.html',
  styleUrls: ['./warranty-scheduler.component.scss']
})
export class WarrantySchedulerComponent implements OnInit {
  // Existing scheduler config (kept for backwards compatibility)
  selectedDays: number = 7;
  selectedTime: string = '09:00';
  isSaving: boolean = false;

  dayOptions = [7, 15, 30];
  timeOptions: string[] = [];

  // UI state
  isTimeDropdownOpen = false;

  // New admin manual workflow state
  assetTypes: Array<{ id: string; name: string }> = [];
  subCategories: Array<{ id: string; name: string; typeId: string }> = [];
  filteredSubCategories: Array<{ id: string; name: string; typeId: string }> = [];

  selectedTypeId: string = '';
  selectedSubCatId: string = '';

  manualDaysToExtend = 7;
  lastInstanceId: string = '';

  constructor(
    private notificationService: NotificationService,
    private schedulerService: WarrantySchedulerService,
    private assetService: AssetService
  ) {
    this.generateTimeOptions();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // close when clicking outside of our dropdown container
    if (!target.closest('.time-dropdown')) {
      this.isTimeDropdownOpen = false;
    }
  }

  async ngOnInit(): Promise<void> {
    this.isSaving = true;
    try {
      const config = await this.schedulerService.getConfiguration();
      if (config) {
        this.selectedDays = config.days;
        this.selectedTime = config.time;
      }
      await this.loadTypeAndSubCategoryOptions();
    } catch (error) {
      console.error('Failed to load scheduler configuration:', error);
      // Fallback to local storage if DB fails
      const savedDays = localStorage.getItem('warranty_scheduler_days');
      const savedTime = localStorage.getItem('warranty_scheduler_time');
      if (savedDays) this.selectedDays = parseInt(savedDays, 10);
      if (savedTime) this.selectedTime = savedTime;
      await this.loadTypeAndSubCategoryOptions();
    } finally {
      this.isSaving = false;
    }
  }

  private async loadTypeAndSubCategoryOptions(): Promise<void> {
    try {
      const dbTypes = await this.assetService.getAllAssetTypesCordys();
      const dbSubCats = await this.assetService.getAllSubcategoriesCordys();

      this.assetTypes = (dbTypes || [])
        .map((t: any) => ({
          id: String(t.type_id || t.Type_id || t.TYPE_ID || t.id || '').trim(),
          name: String(t.type_name || t.TYPE_NAME || t.name || '').trim()
        }))
        .filter(t => t.id && t.name)
        .sort((a, b) => a.name.localeCompare(b.name));

      this.subCategories = (dbSubCats || [])
        .map((c: any) => ({
          id: String(c.sub_category_id || c.SUB_CATEGORY_ID || c.id || '').trim(),
          name: String(c.name || c.sub_category_name || c.SUB_CATEGORY_NAME || '').trim(),
          typeId: String(c.type_id || c.Type_id || c.TYPE_ID || '').trim()
        }))
        .filter(c => c.id && c.name && c.typeId)
        .sort((a, b) => a.name.localeCompare(b.name));

      this.filteredSubCategories = [];
    } catch (e) {
      console.warn('[WarrantyScheduler] Failed to load type/subcategory options:', e);
      this.assetTypes = [];
      this.subCategories = [];
      this.filteredSubCategories = [];
    }
  }

  generateTimeOptions() {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, '0');
        const min = m.toString().padStart(2, '0');
        this.timeOptions.push(`${hour}:${min}`);
      }
    }
  }

  toggleTimeDropdown() {
    this.isTimeDropdownOpen = !this.isTimeDropdownOpen;
  }

  selectTime(time: string) {
    this.selectedTime = time;
    this.isTimeDropdownOpen = false;
  }

  onTypeChange() {
    this.selectedSubCatId = '';
    this.filteredSubCategories = this.selectedTypeId
      ? this.subCategories.filter(sc => sc.typeId === this.selectedTypeId)
      : [];

    this.lastInstanceId = '';
  }

  async onSelectionChange() {
    this.lastInstanceId = '';
  }

  async saveSchedule() {
    this.isSaving = true;
    
    try {
      // 1. Persist to Database via Service
      await this.schedulerService.saveConfiguration(this.selectedDays, this.selectedTime);
      
      // 2. Persist to local storage for quick access
      localStorage.setItem('warranty_scheduler_days', this.selectedDays.toString());
      localStorage.setItem('warranty_scheduler_time', this.selectedTime);

      this.notificationService.showToast('Warranty scheduler configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save scheduler configuration:', error);
      this.notificationService.showToast('Failed to save configuration to database. Local settings updated.', 'warning');
    } finally {
      this.isSaving = false;
    }
  }

  async runNow() {
    // New behavior: manual extend warranty by 7 days using Type + Subcategory
    if (!this.selectedTypeId || !this.selectedSubCatId) {
      this.notificationService.showToast('Please select Type and Subcategory first.', 'warning');
      return;
    }

    this.isSaving = true;
    try {
      const resp = await this.schedulerService.extendWarrantyFinalScheduler({
        days: this.manualDaysToExtend,
        typeId: this.selectedTypeId,
        subCatId: this.selectedSubCatId
      });
      this.lastInstanceId = resp?.instanceId || '';
      this.notificationService.showToast(
        this.lastInstanceId
          ? `Warranty extend triggered. Instance: ${this.lastInstanceId}`
          : 'Warranty extend triggered successfully!',
        'success'
      );
    } catch (error) {
      this.notificationService.showToast('Failed to trigger warranty extend BPM. Please check console.', 'error');
    } finally {
      this.isSaving = false;
    }
  }
}
