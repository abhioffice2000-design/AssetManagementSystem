import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AssetType, AssetCategory } from '../../../core/models/asset.model';
import { RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../../../core/models/request.model';
import { HeroService } from '../../../core/services/hero.service';

@Component({
  selector: 'app-tl-request-asset',
  templateUrl: './request-asset.component.html',
  styleUrls: ['./request-asset.component.scss']
})
export class RequestAssetComponent implements OnInit {
  requestForm!: FormGroup;
  isSubmitting = false;
  
  // Master data from Cordys
  masterAssetTypes: any[] = [];
  masterCategories: any[] = [];
  masterSubCategories: any[] = [];

  // Currently filtered lists for dropdowns
  availableTypes: any[] = [];
  availableCategories: any[] = [];
  availableSubCategories: any[] = [];
  selectedTypeName = ''; // Stores the type_name of the selected asset type

  constructor(
    private fb: FormBuilder,
    private assetService: AssetService,
    private requestService: RequestService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private hs: HeroService
  ) {}

  async ngOnInit(): Promise<void> {
    this.requestForm = this.fb.group({
      assetType: ['', Validators.required],
      category: ['', Validators.required],
      subCategory: [''],
      urgency: ['Low', Validators.required],
      justification: ['', [Validators.required, Validators.minLength(10)]]
    });

    await this.loadMasterData();
  }

  // Helper to extract values from objects that might have different keys or xsi:nil
  private getVal(obj: any, keys: string[]): any {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        // Handle Cordys nil objects
        if (typeof obj[key] === 'object' && (obj[key]['@nil'] === 'true' || obj[key]['@null'] === 'true')) continue;
        return obj[key];
      }
    }
    return undefined;
  }

  // Helper for UI to check error status
  isFieldInvalid(fieldName: string): boolean {
    const field = this.requestForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async loadMasterData(): Promise<void> {
    try {
      const [types, categories, subCats] = await Promise.all([
        this.assetService.getAllAssetTypesCordys(),
        this.assetService.getAllCategoriesCordys(),
        this.assetService.getAllSubcategoriesCordys()
      ]);

      this.masterAssetTypes = types || [];
      this.masterCategories = categories || [];
      this.masterSubCategories = subCats || [];

      // Fallback logic if Cordys returns nothing
      if (this.masterAssetTypes.length === 0) {
        this.masterAssetTypes = [
          { type_id: 'typ_01', type_name: 'Software' },
          { type_id: 'typ_02', type_name: 'Hardware' }
        ];
      }
      if (this.masterCategories.length === 0) {
        this.masterCategories = [
          { asset_id: 'asset_001', asset_name: 'Dell Latitude 5420', type_id: 'typ_02', sub_category_id: 'cat_001' },
          { asset_id: 'asset_002', asset_name: 'Adobe Creative Cloud', type_id: 'typ_01', sub_category_id: 'cat_002' }
        ];
      }

      this.availableTypes = this.masterAssetTypes;
    } catch (error) {
      console.error('Failed to load master data for request form:', error);
    }
  }

  // Logic to return normalized ID for options
  getObjectId(obj: any, type: 'type' | 'category' | 'subcategory'): string {
    const keys = type === 'type' ? ['type_id', 'Type_id', 'id'] : 
                 type === 'category' ? ['asset_id', 'Asset_id', 'id', 'category_id'] :
                 ['sub_category_id', 'Sub_category_id', 'id'];
    return this.getVal(obj, keys) || '';
  }

  // Logic to return normalized Name for options
  getObjectName(obj: any, type: 'type' | 'category' | 'subcategory'): string {
    const keys = type === 'type' ? ['type_name', 'Type_name', 'name'] : 
                 type === 'category' ? ['asset_name', 'Asset_name', 'name', 'category_name'] :
                 ['name', 'Sub_category_name'];
    return this.getVal(obj, keys) || 'Unknown';
  }

  onTypeChange(): void {
    const selectedType = this.requestForm.get('assetType')?.value;
    this.requestForm.patchValue({ category: '', subCategory: '' });
    this.availableSubCategories = [];

    // Capture the type_name for the SOAP payload
    const selectedTypeObj = this.masterAssetTypes.find(t => this.getObjectId(t, 'type') === selectedType);
    this.selectedTypeName = selectedTypeObj ? (this.getObjectName(selectedTypeObj, 'type') || '') : '';

    this.availableCategories = this.masterCategories.filter(cat => {
      const typeRef = this.getVal(cat, ['type_id', 'Type_id', 'id']);
      return String(typeRef) === String(selectedType);
    });

    if (this.availableCategories.length === 0 && this.masterCategories.length > 0) {
      this.availableCategories = this.masterCategories;
    }
    
    // Deduplicate categories by name for cleaner UI
    const uniqueCats = new Map();
    this.availableCategories.forEach(c => {
      const name = this.getObjectName(c, 'category');
      if (name && !uniqueCats.has(name)) {
        uniqueCats.set(name, c);
      }
    });
    this.availableCategories = Array.from(uniqueCats.values());
  }

  onCategoryChange(): void {
    const selectedCatId = this.requestForm.get('category')?.value;
    const selectedCatObj = this.availableCategories.find(c => 
      this.getObjectId(c, 'category') === selectedCatId || this.getObjectName(c, 'category') === selectedCatId
    );
    
    this.requestForm.patchValue({ subCategory: '' });

    if (selectedCatObj) {
      const targetSubId = this.getVal(selectedCatObj, ['sub_category_id', 'id']);
      this.availableSubCategories = this.masterSubCategories.filter(sub => 
        String(this.getObjectId(sub, 'subcategory')) === String(targetSubId)
      );
    } else {
      this.availableSubCategories = this.masterSubCategories.filter(sub => {
        const catRef = this.getVal(sub, ['category_id', 'Category_id', 'id']);
        return String(catRef) === String(selectedCatId);
      });
    }
  }

  onSubmit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.notificationService.showToast('You must be logged in to submit a request.', 'error');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.requestForm.value;

    const soapData = {
      tuple: {
        new: {
          t_asset_requests: {
            user_id: user.id,
            asset_type: this.selectedTypeName, // type_name from m_asset_types
            temp1: formVal.category,
            reason: formVal.justification,
            urgency: formVal.urgency,
            status: "Pending",
            created_at: new Date().toISOString()
          }
        }
      }
    };

    console.log('[RequestAsset] Submitting to Cordys:', soapData);

    this.hs.ajax('UpdateT_asset_requests', 'http://schemas.cordys.com/AMS_Database_Metadata', soapData)
      .then((resp: any) => {
        console.log('[RequestAsset] t_asset_requests insert response:', resp);

        // Extract the new request_id from the Cordys response
        const responseData = this.hs.xmltojson(resp, 't_asset_requests');
        const requestId = responseData?.request_id ||
                          (Array.isArray(responseData) ? responseData[0]?.request_id : undefined);

        console.log('[RequestAsset] New request_id:', requestId);

        if (!requestId) {
          console.warn('[RequestAsset] No request_id returned; skipping t_request_approvals insert.');
          this.notificationService.showToast('Request saved but approval record could not be created.', 'error');
          this.isSubmitting = false;
          this.router.navigate(['/team-lead/my-asset']);
          return;
        }

        // Now insert into t_request_approvals
        const approvalData = {
          tuple: {
            new: {
              t_request_approvals: {
                request_id: requestId,
                approver_id: 'usr_004',
                role: 'Asset Manager',
                status: 'Pending',
                temp1: formVal.category  // asset_name
              }
            }
          }
        };

        console.log('[RequestAsset] Inserting approval record:', approvalData);

        return this.hs.ajax('UpdateT_request_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', approvalData);
      })
      .then((approvalResp: any) => {
        if (approvalResp) {
          console.log('[RequestAsset] t_request_approvals insert response:', approvalResp);
        }
        this.notificationService.showToast('Asset request submitted successfully!', 'success');
        this.notificationService.addNotification('Request Submitted', 'Your request has been saved and sent for approval.', 'info');

        // Also update local array for current session consistency
        const newReq = { ...this.requestForm.value, id: `REQ${Date.now()}`, requesterId: this.authService.getCurrentUser()?.id, status: RequestStatus.PENDING };
        this.requestService.addRequest(newReq as any);

        this.isSubmitting = false;
        this.router.navigate(['/team-lead/my-asset']);
      })
      .catch((err: any) => {
        console.error('[RequestAsset] Submission failed:', err);
        this.notificationService.showToast('Failed to save request to database. Please try again.', 'error');
        this.isSubmitting = false;
      });
  }
}
