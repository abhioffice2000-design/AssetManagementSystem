import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/services/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Asset } from '../../../core/models/asset.model';
import { RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../../../core/models/request.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeroService } from '../../../core/services/hero.service';
import { Router } from '@angular/router';

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
    private fb: FormBuilder,
    private hs: HeroService,
    private router: Router
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

  async submitRequest(type: RequestType): Promise<void> {
    if (this.actionForm.invalid || !this.selectedAsset) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;
    const formVal = this.actionForm.value;

    if (type === RequestType.RETURN_ASSET) {
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;

        var request3 = {
          tuple: {
            new: {
              t_asset_returns: {
                requested_by: `${user.id}`,
                return_date: formattedDate,
                status: 'Pending',
                remarks: 'waiting for approval'
              }
            }
          }
        };

        var res3: any = await this.requestService.createEntryForReturn(request3 as any);

        const tReturns = res3?.old?.t_asset_returns || res3?.new?.t_asset_returns || res3?.t_asset_returns || {};
        const return_id = tReturns.return_id || tReturns.id || 'SYS_UNKNOWN';

        var request4 = {
          tuple: {
            new: {
              t_asset_return_approvals: {
                request_id: `${return_id}`,
                approver_id: `usr_004`,
                role: `Asset Manager`,
                status: `Pending`,
                remarks: 'waiting for approval'
              }
            }
          }
        };

        var res4: any = await this.requestService.createEntryForAssetApprovals(request4 as any);

        const tApprovals = res4?.old?.t_asset_return_approvals || res4?.new?.t_asset_return_approvals || res4?.t_asset_return_approvals || {};
        const return_approval_id = tApprovals.return_approval_id || tApprovals.id || 'SYS_UNKNOWN_APP';

        let request5 = {
          user_id: user.id,
          return_approval_id: `${return_approval_id}`,
          returnid: `${return_id}`
        };
        await this.requestService.callBPMForReturn(request5 as any);

        const newReq = this.buildMockPayload(user, type, formVal.justification);
        this.requestService.addRequest(newReq as any);

        this.notificationService.showToast('Return request submitted successfully!', 'success');
        this.closeModals();
        
      } catch (err) {
        console.error(err);
        this.notificationService.showToast('Failed to submit return request', 'error');
      }
    } else if (type === RequestType.EXTEND_WARRANTY) {
      const soapData = {
        tuple: {
          new: {
            t_extend_asset_requests: {
              user_id: user.id,
              asset_type: this.selectedAsset.id, // Maps to assetId internally
              reason: formVal.justification,
              urgency: 'Medium',
              email_approval: 'false',
              status: "Pending",
              created_at: new Date().toISOString()
            }
          }
        }
      };

      this.hs.ajax('UpdateT_extend_asset_requests', 'http://schemas.cordys.com/AMS_Database_Metadata', soapData)
        .then((resp: any) => {
          const requestId =
            resp?.tuple?.new?.t_extend_asset_requests?.request_id ||
            resp?.tuple?.old?.t_extend_asset_requests?.request_id ||
            resp?.request_id;

          if (!requestId) {
            this.notificationService.showToast('Request saved but approval record could not be created.', 'error');
            this.closeModals();
            return;
          }

          const approvalData = {
            tuple: {
              new: {
                t_extend_request_approvals: {
                  request_id: requestId,
                  approver_id: 'usr_004',
                  role: 'Asset Manager',
                  status: 'Pending',
                  remarks: formVal.justification,
                  action_date: new Date().toISOString()
                }
              }
            }
          };

          return this.hs.ajax('UpdateT_extend_request_approvals', 'http://schemas.cordys.com/AMS_Database_Metadata', approvalData);
        })
        .then((approvalResp: any) => {
          if (!approvalResp) return;
          const newapprovalid =
            approvalResp?.tuple?.new?.t_extend_request_approvals?.approval_id ||
            approvalResp?.tuple?.old?.t_extend_request_approvals?.approval_id ||
            approvalResp?.approval_id || '';
          const newrequestid =
            approvalResp?.tuple?.new?.t_extend_request_approvals?.request_id ||
            approvalResp?.tuple?.old?.t_extend_request_approvals?.request_id || '';

          const request3 = {
            InputDoc: "false",
            Inputusrid: user.id,
            Inputrequestapprovalid: `${newapprovalid}`,
            Inputrequestid: `${newrequestid}`
          };
          this.requestService.callBPMForwarrantyexpiry(request3 as any);
          
          const newReq = this.buildMockPayload(user, type, formVal.justification);
          this.requestService.addRequest(newReq as any);

          this.notificationService.showToast('Warranty extension request submitted successfully!', 'success');
          this.closeModals();
        })
        .catch((err: any) => {
          console.error(err);
          this.notificationService.showToast('Request submitted but approval record may have failed.', 'error');
          this.closeModals();
        });
    }
  }

  private buildMockPayload(user: any, type: RequestType, justification: string) {
    if (!this.selectedAsset) return {};
    return {
      id: `REQ${Date.now()}`,
      requestNumber: this.requestService.generateRequestNumber(type),
      requesterId: user.id,
      requesterName: user.name,
      requesterDepartment: user.department,
      requesterTeam: user.team,
      assetType: this.selectedAsset.type,
      category: this.selectedAsset.category,
      subCategory: this.selectedAsset.subCategory,
      justification: justification,
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
  }
}
