import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Asset } from '../../../core/models/asset.model';
import { RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../../../core/models/request.model';
import { HeroService } from '../../../core/services/hero.service';

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
    private router: Router,
    private hs: HeroService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.getAssetsByUser(user.id);
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

  getAssetsByUser(userId?: string): void {
    this.isLoading = true;
    this.hs.ajax('GetAssetsByUser', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { userId: userId || '' }
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, 'm_assets');
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];

      this.myAssets = rawData.map((item: any) => ({
        id: item.asset_id || item.id || '',
        assetTag: item.serial_number || item.asset_tag || item.asset_id || '',
        name: item.asset_name || item.name || '',
        category: item.m_asset_subcategories?.name || item.m_asset_subcategories?.Name || item.category || item.asset_type || '',
        subCategory: item.m_asset_subcategories?.name || item.m_asset_subcategories?.Name || '',
        condition: item.condition || 'Good',
        status: item.status || 'Allocated',
        warrantyExpiry: item.warranty_expiry || item.warrantyExpiry || '',
        assignedTo: item.user_id || userId || '',
        serialNumber: item.serial_number || item.asset_tag || ''
      } as any));

      this.isLoading = false;
    }).catch((err: any) => {
      console.error('[ReturnAsset] Error fetching assets:', err);
      const user = this.authService.getCurrentUser();
      if (user) {
        this.myAssets = this.assetService.getAssetsByUser(user.id);
      }
      this.isLoading = false;
    });
  }
}
