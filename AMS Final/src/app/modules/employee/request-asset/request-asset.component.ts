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
  assetTypes = Object.values(AssetType);
  urgencies = Object.values(RequestUrgency);
  
  availableCategories: AssetCategory[] = [];
  availableSubCategories: string[] = [];

  constructor(
    private fb: FormBuilder,
    private assetService: AssetService,
    private requestService: RequestService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      assetType: ['', Validators.required],
      category: ['', Validators.required],
      subCategory: [''],
      urgency: [RequestUrgency.LOW, Validators.required],
      justification: ['', [Validators.required, Validators.minLength(10)]],
      hasEmailApproval: [false]
    });
  }

  onTypeChange(): void {
    const type = this.requestForm.get('assetType')?.value;
    this.availableCategories = this.assetService.getCategoriesByType(type as AssetType);
    this.requestForm.patchValue({ category: '', subCategory: '' });
    this.availableSubCategories = [];
  }

  onCategoryChange(): void {
    const catName = this.requestForm.get('category')?.value;
    const cat = this.availableCategories.find(c => c.name === catName);
    this.availableSubCategories = cat ? cat.subCategories : [];
    this.requestForm.patchValue({ subCategory: '' });
  }

  onSubmit(): void {
    if (this.requestForm.invalid) return;

    const user = this.authService.getCurrentUser();
    const formVal = this.requestForm.value;
    const isDeptHead = user.role === 'Team Lead'; // Simplified for demo
    const skipTeamLead = formVal.hasEmailApproval || isDeptHead;

    const newReq = {
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
      urgency: formVal.urgency,
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

    this.requestService.addRequest(newReq as any);
    this.notificationService.showToast('Asset request submitted successfully!', 'success');
    this.notificationService.addNotification('Request Submitted', `Your request ${newReq.requestNumber} has been submitted.`, 'info');
    
    this.router.navigate(['/employee/dashboard']);
  }
}
