import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Asset } from '../../../core/models/asset.model';
import { RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../../../core/models/request.model';

@Component({
  selector: 'app-tl-return-asset',
  templateUrl: './return-asset.component.html',
  styleUrls: ['./return-asset.component.scss']
})
export class ReturnAssetComponent implements OnInit {
  returnForm!: FormGroup;
  myAssets: Asset[] = [];
  selectedAsset: Asset | undefined;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private assetService: AssetService,
    private requestService: RequestService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.isLoading = true;
      try {
        this.myAssets = await this.assetService.getAssetsByUserIdFromCordys(user.id);
        if (this.myAssets.length === 0) {
          this.myAssets = this.assetService.getAssetsByUser(user.id);
        }
      } catch (e) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
      } finally {
        this.isLoading = false;
      }
    }
    
    this.returnForm = this.fb.group({
      assetId: ['', Validators.required],
      justification: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  onAssetSelect(): void {
    const id = this.returnForm.get('assetId')?.value;
    this.selectedAsset = this.myAssets.find(a => a.id === id);
  }

  onSubmit(): void {
    if (this.returnForm.invalid || !this.selectedAsset) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;
    const formVal = this.returnForm.value;

    const newReq: any = {
      id: `REQ${Date.now()}`,
      requestNumber: this.requestService.generateRequestNumber(RequestType.RETURN_ASSET),
      requesterId: user.id,
      requesterName: user.name,
      requesterDepartment: user.department,
      requesterTeam: user.team,
      assetType: this.selectedAsset.type,
      category: this.selectedAsset.category,
      subCategory: this.selectedAsset.subCategory,
      justification: formVal.justification,
      urgency: RequestUrgency.LOW,
      status: RequestStatus.PENDING,
      currentStage: ApprovalStage.ASSET_MANAGER, // Skipping TL since they ARE the TL
      hasEmailApproval: false,
      requestDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      requestType: RequestType.RETURN_ASSET,
      allocatedAssetId: this.selectedAsset.id,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Approved' as any }, // Auto-approved for themselves
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' as any },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' as any }
      ],
      comments: [{
        id: `C${Date.now()}`,
        userId: user.id,
        userName: user.name,
        comment: `Returning asset: ${this.selectedAsset.assetTag} - ${this.selectedAsset.name}`,
        timestamp: new Date().toISOString()
      }]
    };

    this.requestService.addRequest(newReq as any);
    this.notificationService.showToast('Return request submitted successfully!', 'success');
    this.router.navigate(['/team-lead/my-asset']);
  }
}
