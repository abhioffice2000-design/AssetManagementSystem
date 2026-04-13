import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AssetType, AssetCategory } from '../../../core/models/asset.model';
import { RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../../../core/models/request.model';

@Component({
  selector: 'app-request-asset',
  templateUrl: './request-asset.component.html',
  styleUrls: ['./request-asset.component.scss']
})
export class RequestAssetComponent implements OnInit {
  requestForm!: FormGroup;

  // Master data from Cordys
  masterAssetTypes: any[] = [];
  masterCategories: any[] = [];
  masterSubCategories: any[] = [];

  // Currently filtered lists for dropdowns
  availableTypes: any[] = [];
  availableCategories: any[] = [];
  availableSubCategories: any[] = [];
  // urgencies removed

  constructor(
    private fb: FormBuilder,
    private assetService: AssetService,
    private requestService: RequestService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    this.requestForm = this.fb.group({
      assetType: ['', Validators.required],
      category: ['', Validators.required],
      subCategory: [''],
      justification: ['', [Validators.required, Validators.minLength(5)]],
      hasEmailApproval: [false]
    });

    await this.loadMasterData();
  }

  async loadMasterData(): Promise<void> {
    try {
      console.log('[RequestAsset Debug] Starting master data load...');
      const [types, categories, subCats] = await Promise.all([
        this.assetService.getAllAssetTypesCordys(),
        this.assetService.getAllCategoriesCordys(),
        this.assetService.getAllSubcategoriesCordys()
      ]);

      this.masterAssetTypes = types || [];
      this.masterCategories = categories || [];
      this.masterSubCategories = subCats || [];

      // FINAL FAIL-SAFE: If Cordys returns nothing, populate with basic defaults so the UX doesn't break
      if (this.masterAssetTypes.length === 0) {
        console.warn('[RequestAsset Debug] Cordys returned 0 types. Using hardcoded defaults.');
        this.masterAssetTypes = [
          { type_id: 'typ_01', type_name: 'Software' },
          { type_id: 'typ_02', type_name: 'Hardware' }
        ];
      }
      if (this.masterCategories.length === 0) {
        console.warn('[RequestAsset Debug] Cordys returned 0 categories. Using hardcoded defaults.');
        this.masterCategories = [
          { asset_id: 'asset_001', asset_name: 'Dell Latitude 5420', type_id: 'typ_02', sub_category_id: 'cat_001' },
          { asset_id: 'asset_002', asset_name: 'Adobe Creative Cloud', type_id: 'typ_01', sub_category_id: 'cat_002' }
        ];
      }
      if (this.masterSubCategories.length === 0) {
        console.warn('[RequestAsset Debug] Cordys returned 0 subcats. Using hardcoded defaults.');
        this.masterSubCategories = [
          { sub_category_id: 'cat_001', name: 'Laptop', type_id: 'typ_02' },
          { sub_category_id: 'cat_002', name: 'Software License', type_id: 'typ_01' }
        ];
      }

      this.availableTypes = this.masterAssetTypes;

      console.log('[RequestAsset Debug] Load complete:', {
        types: this.masterAssetTypes,
        categories: this.masterCategories,
        subCats: this.masterSubCategories
      });

      // INSPECTION LOGS: Help identify field names
      if (this.masterAssetTypes.length > 0) console.log('[RequestAsset Debug] Sample Type Object:', this.masterAssetTypes[0]);
      if (this.masterCategories.length > 0) console.log('[RequestAsset Debug] Sample Category Object:', this.masterCategories[0]);
      if (this.masterSubCategories.length > 0) console.log('[RequestAsset Debug] Sample Subcat Object:', this.masterSubCategories[0]);
    } catch (error) {
      console.error('CRITICAL: Failed to load master data for request form:', error);
    }
  }

  onTypeChange(): void {
    const selectedType = this.requestForm.get('assetType')?.value;
    console.log('[RequestAsset Debug] Type changed to (Selected ID):', selectedType);

    // Reset following dropdowns
    this.requestForm.patchValue({ category: '', subCategory: '' });
    this.availableSubCategories = [];

    // Filter categories based on Type
    // The diagnostic showed Category (from GetAllAssets) contains 'type_id'
    this.availableCategories = this.masterCategories.filter(cat => {
      const typeRef = cat.type_id || cat.Type_id;
      return String(typeRef) === String(selectedType);
    });

    // Fallback: If Furniture or Network (or any type) has no specific linked assets/categories
    // in the database, show all categories as a fallback to ensure the dropdown is not empty.
    if (this.availableCategories.length === 0 && this.masterCategories.length > 0) {
      console.warn('[RequestAsset Debug] No specific categories for type, using fallback');
      this.availableCategories = this.masterCategories;
    }

    // Deduplicate categories if necessary
    const uniqueCats = new Map();
    this.availableCategories.forEach(c => {
      // Using 'asset_name' as the display label for the Category dropdown as per diagnostic
      const name = c.asset_name || c.Category_name || c.category_name || c.Category || c.category;
      if (name && !uniqueCats.has(name)) {
        uniqueCats.set(name, c);
      }
    });
    this.availableCategories = Array.from(uniqueCats.values());
    console.log('[RequestAsset Debug] Filtered Categories:', this.availableCategories);
  }

  onCategoryChange(): void {
    const selectedCatId = this.requestForm.get('category')?.value;
    // We need to find the category object to get its sub_category_id
    const selectedCatObj = this.availableCategories.find(c =>
      (c.asset_id || c.id) === selectedCatId || (c.asset_name || c.name) === selectedCatId
    );

    console.log('[RequestAsset Debug] Category changed to:', selectedCatId, 'Object:', selectedCatObj);
    this.requestForm.patchValue({ subCategory: '' });

    // Filter sub-categories
    // The diagnostic showed Subcategory contains 'sub_category_id' and 'type_id'
    if (selectedCatObj) {
      const targetSubId = selectedCatObj.sub_category_id;
      this.availableSubCategories = this.masterSubCategories.filter(sub =>
        String(sub.sub_category_id) === String(targetSubId)
      );
    } else {
      // Fallback: match by link in subcategory if available
      this.availableSubCategories = this.masterSubCategories.filter(sub => {
        const catRef = sub.category_id || sub.Category_id || sub.Category || sub.category;
        return String(catRef) === String(selectedCatId);
      });
    }

    console.log('[RequestAsset Debug] Filtered Sub-categories:', this.availableSubCategories);
  }

  async onSubmit(): Promise<void> {
    console.log('[onSubmit] Called. Form valid:', this.requestForm.valid);
    console.log('[onSubmit] Form values:', this.requestForm.value);
    console.log('[onSubmit] Form errors:', {
      assetType: this.requestForm.get('assetType')?.errors,
      category: this.requestForm.get('category')?.errors,
      justification: this.requestForm.get('justification')?.errors,
    });
    if (this.requestForm.invalid) {
      console.warn('[onSubmit] Form is invalid — submission blocked.');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.notificationService.showToast('You must be logged in to submit a request.', 'error');
      return;
    }
    const formVal = this.requestForm.value;
    const isDeptHead = user.role === 'Team Lead'; // Simplified for demo
    const skipTeamLead = formVal.hasEmailApproval || isDeptHead;

    const newReq: any = {
      id: `REQ${Date.now()}`,
      requestNumber: this.requestService.generateRequestNumber(RequestType.NEW_ASSET),
      requesterId: user.id,
      requesterName: user.name,
      requesterDepartment: user.department,
      requesterTeam: user.team,
      assetType: formVal.assetType,
      category: formVal.category,
      subCategory: formVal.subCategory,
      justification: formVal.justification,
      urgency: RequestUrgency.LOW, // Defaulted as dropdown is removed
      status: RequestStatus.PENDING,
      currentStage: skipTeamLead ? ApprovalStage.ASSET_MANAGER : ApprovalStage.TEAM_LEAD,
      hasEmailApproval: formVal.hasEmailApproval,
      emailApprovalDoc: formVal.hasEmailApproval ? 'uploaded_doc.pdf' : undefined,
      requestDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: skipTeamLead ? 'Skipped' as any : 'Pending' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' as any },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' as any }
      ],
      comments: []
    };
    var request1 = {
      tuple: {

        new: {
          t_asset_requests: {
            user_id: user.id,
            asset_type: 'Software',
            reason: 'Need',
            urgency: 'High',
            email_approval: 'false',
            status: 'Pending',
            temp1: formVal.subCategory
          }
        }
      }
    }



    var reqApproval = {
      id: `REQ${Date.now()}`,
      requestId: newReq.id,
      stage: skipTeamLead ? ApprovalStage.ASSET_MANAGER : ApprovalStage.TEAM_LEAD,
      action: skipTeamLead ? 'Skipped' as any : 'Pending',
      comments: []
    }
    // this.requestService.addRequest(newReq as any);
    var res = await this.requestService.submitNewRequestForm(request1 as any);
    console.log("res", res)
    let newrequestid = res.new.t_asset_requests.request_id;
    console.log("newrequestid", newrequestid)
    var request2 = {
      tuple: {

        new: {
          t_request_approvals: {
            request_id: `${newrequestid}`,
            approver_id: 'usr_003',
            role: 'Team Lead',
            status: 'Pending'
          }
        }
      }
    }
    var res2 = await this.requestService.createEntryForTeamLead(request2 as any);
    console.log("res2", res2)
    let newapprovalid = res2.new.t_request_approvals.approval_id;
    console.log("newapprovalid", newapprovalid)
    let request3 = {


      InputDoc: "false",
      Inputusrid: user.id,
      Inputrequestapprovalid: `${newapprovalid}`,
      Inputrequestid: `${newrequestid}`


    }
    this.requestService.callBPMForRequest(request3 as any)
    this.notificationService.showToast('Asset request submitted successfully!', 'success');
    this.notificationService.addNotification('Request Submitted', `Your request ${newReq.requestNumber} has been submitted.`, 'info');

    this.router.navigate(['/employee/dashboard']);
  }
}
