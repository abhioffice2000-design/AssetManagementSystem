import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';
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
  masterSubCategories: any[] = [];

  // Currently filtered lists for dropdowns
  availableTypes: any[] = [];
  availableSubCategories: any[] = [];
  
  // File upload state
  selectedFileBase64: string | null = null;
  selectedFileName: string | null = null;
  
  // urgencies removed

  constructor(
    private fb: FormBuilder,
    private assetService: AssetService,
    private requestService: RequestService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private mailService: MailService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    this.requestForm = this.fb.group({
      assetType: ['', Validators.required],
      subCategory: ['', Validators.required],
      urgency: ['Medium', Validators.required],
      justification: ['', [Validators.required, Validators.minLength(5)]],
      hasEmailApproval: [false]
    });

    await this.loadMasterData();
  }

  async loadMasterData(): Promise<void> {
    try {
      console.log('[RequestAsset Debug] Starting master data load...');
      const [types, subCats] = await Promise.all([
        this.assetService.getAllAssetTypesCordys(),
        this.assetService.getAllSubcategoriesCordys()
      ]);

      this.masterAssetTypes = types || [];
      this.masterSubCategories = subCats || [];

      // FINAL FAIL-SAFE: If Cordys returns nothing, populate with basic defaults so the UX doesn't break
      if (this.masterAssetTypes.length === 0) {
        console.warn('[RequestAsset Debug] Cordys returned 0 types. Using hardcoded defaults.');
        this.masterAssetTypes = [
          { type_id: 'typ_01', type_name: 'Software' },
          { type_id: 'typ_02', type_name: 'Hardware' }
        ];
      }

      if (this.masterSubCategories.length === 0) {
        console.warn('[RequestAsset Debug] Cordys returned 0 sub-categories. Using hardcoded defaults.');
        this.masterSubCategories = [
          { sub_category_id: 'cat_001', name: 'Laptop', type_id: 'typ_02' },
          { sub_category_id: 'cat_002', name: 'Software License', type_id: 'typ_01' },
          { sub_category_id: 'cat_003', name: 'Monitor', type_id: 'typ_02' },
          { sub_category_id: 'cat_004', name: 'Hardware Accessory', type_id: 'typ_02' }
        ];
      }

      this.availableTypes = this.masterAssetTypes;
    } catch (error) {
      console.error('CRITICAL: Failed to load master data for request form:', error);
    }
  }

  onTypeChange(): void {
    const selectedType = this.requestForm.get('assetType')?.value;
    console.log('[RequestAsset Debug] Type changed to (Selected ID):', selectedType);

    // Reset following dropdowns
    this.requestForm.patchValue({ subCategory: '' });

    // Filter sub-categories DIRECTLY based on Asset Type
    this.availableSubCategories = this.masterSubCategories.filter(sub =>
      String(sub.type_id) === String(selectedType)
    );

    // Fallback: If no subcategories found for type, show all to avoid empty dropdown
    if (this.availableSubCategories.length === 0 && this.masterSubCategories.length > 0) {
      this.availableSubCategories = this.masterSubCategories;
    }

    console.log('[RequestAsset Debug] Filtered Sub-categories:', this.availableSubCategories);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        // Includes the data URI scheme e.g. "data:image/jpeg;base64,..."
        this.selectedFileBase64 = reader.result as string; 
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFileBase64 = null;
      this.selectedFileName = null;
    }
  }

  async onSubmit(): Promise<void> {
    console.log('[onSubmit] Called. Form valid:', this.requestForm.valid);
    console.log('[onSubmit] Form values:', this.requestForm.value);
    console.log('[onSubmit] Form errors:', {
      assetType: this.requestForm.get('assetType')?.errors,
      subCategory: this.requestForm.get('subCategory')?.errors,
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
    
    // Validate file upload if email approval is checked
    if (formVal.hasEmailApproval && !this.selectedFileBase64) {
      this.notificationService.showToast('Please upload the email approval document.', 'error');
      return;
    }

    const isDeptHead = user.role === 'Team Lead'; // Simplified for demo
    const skipTeamLead = formVal.hasEmailApproval || isDeptHead;

    const selectedTypeObj = this.masterAssetTypes.find(t => String(t.type_id) === String(formVal.assetType));
    const typeName = selectedTypeObj ? selectedTypeObj.type_name : 'Hardware';

    const selectedSubCatObj = this.masterSubCategories.find(s => String(s.sub_category_id) === String(formVal.subCategory));
    const subCatName = selectedSubCatObj ? selectedSubCatObj.name : formVal.subCategory;

    var request1 = {
      tuple: {
        new: {
          t_asset_requests: {
            user_id: user.id,
            asset_type: typeName,
            reason: formVal.justification,
            urgency: formVal.urgency,
            email_approval: String(formVal.hasEmailApproval),
            status: 'Pending',
            temp1: subCatName,
            temp2: this.selectedFileName || '',
            document: this.selectedFileBase64 ? 'ATTACHED' : ''
          }
        }
      }
    };
    // this.requestService.addRequest(newReq as any);
    console.log('[RequestAsset] Submitting Request Tuple (REQ1):', JSON.parse(JSON.stringify(request1)));
    
    var res = await this.requestService.submitNewRequestForm(request1 as any);
    console.log("res", res)
    let newrequestid = res.new.t_asset_requests.request_id;
    console.log("newrequestid", newrequestid)
    var request2 = {
      tuple: {
        new: {
          t_request_approvals: {
            request_id: `${newrequestid}`,
            approver_id: formVal.hasEmailApproval ? 'usr_004' : 'usr_003',
            role: formVal.hasEmailApproval ? 'Asset Manager' : 'Team Lead',
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
      InputDoc: this.selectedFileBase64 ? `${this.selectedFileName}|${this.selectedFileBase64}` : formVal.hasEmailApproval.toString(),
      Inputusrid: user.id,
      Inputrequestapprovalid: `${newapprovalid}`,
      Inputrequestid: `${newrequestid}`
    }
    this.requestService.callBPMForRequest(request3 as any)
    
    // Trigger notification email
    this.mailService.sendAssetRequestConfirmation({
      employeeName: user.name,
      employeeEmail: user.email,
      assetType: typeName,
      category: subCatName,
      requestId: `${newrequestid}`,
      justification: formVal.justification,
      urgency: formVal.urgency,
      teamLeadName: user.teamLeadName
    });

    this.notificationService.showToast(`Request Raised Successfully! (ID: ${newrequestid})`, 'success');
    this.notificationService.addNotification('Request Submitted', `Your asset request has been submitted.`, 'info');


    this.router.navigate(['/employee/my-requests']);
  }
}
