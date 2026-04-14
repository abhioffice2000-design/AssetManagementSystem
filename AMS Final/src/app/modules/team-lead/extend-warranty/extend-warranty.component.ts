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
  selector: 'app-tl-extend-warranty',
  templateUrl: './extend-warranty.component.html',
  styleUrls: ['./extend-warranty.component.scss']
})
export class ExtendWarrantyComponent implements OnInit {
  warrantyForm!: FormGroup;
  eligibleAssets: Asset[] = [];
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
    if (!user) return;
    
    this.isLoading = true;
    try {
      const allMyAssets = await this.assetService.getAssetsByUserIdFromCordys(user.id);
      const filtered = allMyAssets.length > 0 ? allMyAssets : this.assetService.getAssetsByUser(user.id);
      
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      this.eligibleAssets = filtered.filter(a => {
        if (!a.warrantyExpiry) return false;
        const expiry = new Date(a.warrantyExpiry);
        return expiry < oneYearFromNow;
      });
    } catch (e) {
      this.eligibleAssets = [];
    } finally {
      this.isLoading = false;
    }
    
    this.warrantyForm = this.fb.group({
      assetId: ['', Validators.required],
      justification: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  onAssetSelect(): void {
    const id = this.warrantyForm.get('assetId')?.value;
    this.selectedAsset = this.eligibleAssets.find(a => a.id === id);
  }

  onSubmit(): void {
    if (this.warrantyForm.invalid || !this.selectedAsset) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;
    const formVal = this.warrantyForm.value;

    const newReq: any = {
      id: `REQ${Date.now()}`,
      requestNumber: this.requestService.generateRequestNumber(RequestType.EXTEND_WARRANTY),
      requesterId: user.id,
      requesterName: user.name,
      requesterDepartment: user.department,
      requesterTeam: user.team,
      assetType: this.selectedAsset.type,
      category: this.selectedAsset.category,
      subCategory: this.selectedAsset.subCategory,
      justification: formVal.justification,
      urgency: RequestUrgency.MEDIUM,
      status: RequestStatus.PENDING,
      currentStage: ApprovalStage.ASSET_MANAGER, // Skipping TL since they ARE the TL
      hasEmailApproval: false,
      requestDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      requestType: RequestType.EXTEND_WARRANTY,
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
        comment: `Requesting warranty extension for: ${this.selectedAsset.assetTag} - ${this.selectedAsset.name}`,
        timestamp: new Date().toISOString()
      }]
    };

    this.requestService.addRequest(newReq as any);
    this.notificationService.showToast('Warranty extension request submitted successfully!', 'success');
    this.router.navigate(['/team-lead/my-asset']);
  }
}
