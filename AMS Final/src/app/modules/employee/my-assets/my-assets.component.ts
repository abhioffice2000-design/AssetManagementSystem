import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Asset } from '../../../core/models/asset.model';
import { RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../../../core/models/request.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-my-assets',
  templateUrl: './my-assets.component.html',
  styleUrls: ['./my-assets.component.scss']
})
export class MyAssetsComponent implements OnInit {
  myAssets: Asset[] = [];
  RequestType = RequestType;
  
  // Modal states
  isReturnModalOpen = false;
  isWarrantyModalOpen = false;
  selectedAsset: Asset | null = null;
  actionForm!: FormGroup;

  constructor(
    private authService: AuthService,
    private assetService: AssetService,
    private requestService: RequestService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    try {
      this.myAssets = await this.assetService.getAssetsByUserIdFromCordys(user.id);
      
      // Fallback to mock data if no real data is found (for consistency with dashboard)
      if (this.myAssets.length === 0) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
      }
    } catch (error) {
      console.error('Failed to fetch assets from Cordys in My Assets page', error);
      this.myAssets = this.assetService.getAssetsByUser(user.id);
    }
  }

  isExpiringSoon(dateStr: string): boolean {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }

  openReturnModal(asset: Asset): void {
    this.selectedAsset = asset;
    this.actionForm = this.fb.group({
      justification: ['', [Validators.required, Validators.minLength(5)]]
    });
    this.isReturnModalOpen = true;
  }

  openWarrantyModal(asset: Asset): void {
    this.selectedAsset = asset;
    this.actionForm = this.fb.group({
      justification: ['', [Validators.required, Validators.minLength(5)]]
    });
    this.isWarrantyModalOpen = true;
  }

  closeModals(): void {
    this.isReturnModalOpen = false;
    this.isWarrantyModalOpen = false;
    this.selectedAsset = null;
  }

  submitRequest(type: RequestType): void {
    if (this.actionForm.invalid || !this.selectedAsset) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    const newReq = {
      id: `REQ${Date.now()}`,
      requestNumber: this.requestService.generateRequestNumber(type),
      requesterId: user.id,
      requesterName: user.name,
      requesterDepartment: user.department,
      requesterTeam: user.team,
      assetType: this.selectedAsset.type,
      category: this.selectedAsset.category,
      subCategory: this.selectedAsset.subCategory,
      justification: this.actionForm.value.justification,
      urgency: type === RequestType.RETURN_ASSET ? RequestUrgency.LOW : RequestUrgency.MEDIUM,
      status: RequestStatus.PENDING,
      currentStage: ApprovalStage.TEAM_LEAD,
      hasEmailApproval: false,
      requestDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      requestType: type,
      allocatedAssetId: this.selectedAsset.id,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Pending' as any },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' as any },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' as any }
      ],
      comments: [{
        id: `C${Date.now()}`,
        userId: user.id,
        userName: user.name,
        comment: `${type === RequestType.RETURN_ASSET ? 'Returning' : 'Extending warranty for'} asset: ${this.selectedAsset.assetTag} - ${this.selectedAsset.name}`,
        timestamp: new Date().toISOString()
      }]
    };

    this.requestService.addRequest(newReq as any);
    this.notificationService.showToast(`${type} request submitted successfully!`, 'success');
    this.closeModals();
  }
}
