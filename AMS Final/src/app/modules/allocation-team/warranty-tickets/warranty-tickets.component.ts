import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest } from '../../../core/models/request.model';
import { HeroService } from 'src/app/core/services/hero.service';
import { MailService } from 'src/app/core/services/mail.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { AssetService } from '../../../core/services/asset.service';

@Component({
  selector: 'app-warranty-tickets',
  templateUrl: './warranty-tickets.component.html',
  styleUrls: ['./warranty-tickets.component.scss']
})
export class WarrantyTicketsComponent implements OnInit {
  loading = true;
  warrantyTickets: AssetRequest[] = [];
  
  isWarrantyModalOpen = false;
  activeTab: 'pending' | 'resolved' = 'pending';
  allWarrantyRequests: AssetRequest[] = [];
  selectedWarrantyRequest: AssetRequest | null = null;
  newWarrantyDate: string = '';

  // Search and Filter
  searchTerm: string = '';
  selectedAssetType: string = '';
  selectedResolvedStatus: string = '';
  assetTypeOptions: string[] = ['Hardware', 'Software', 'Furniture', 'Network'];

  constructor(
    private requestService: RequestService,
    private assetService: AssetService,
    private hs: HeroService,
    private mailService: MailService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) { }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadWarrantyTickets(),
      this.loadAssetTypes()
    ]);
  }

  async loadAssetTypes(): Promise<void> {
    try {
      const typeCounts = await this.assetService.fetchAssetTypeWiseCount();
      this.assetTypeOptions = typeCounts
        .map(t => t.type_name)
        .filter(name => name && name.toLowerCase() !== 'infrastructure');
    } catch (err) {
      console.warn('Failed to load asset types:', err);
    }
  }

  get filteredWarrantyTickets(): AssetRequest[] {
    const source = this.activeTab === 'pending' ? this.warrantyTickets : this.resolvedWarrantyRequests;

    return source.filter(req => {
      const matchesSearch = !this.searchTerm || 
        (req.id?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (req.requesterName?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (req.assetName?.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchesType = !this.selectedAssetType || req.assetType === this.selectedAssetType;
      
      const matchesStatus = this.activeTab === 'pending' ? true : 
        (!this.selectedResolvedStatus || (this.selectedResolvedStatus === 'Approved' ? (req.status === 'Approved' || req.status === 'Completed') : req.status === this.selectedResolvedStatus));
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }

  get pendingWarrantyCount(): number {
    return this.warrantyTickets.filter(req => req.status === 'Pending' || req.status === 'In Progress').length;
  }

  get resolvedWarrantyRequests(): AssetRequest[] {
    return this.allWarrantyRequests.filter(req => 
      req.status === 'Completed' || 
      req.status === 'Approved' || 
      req.status === 'Rejected' || 
      req.status === 'Cancelled'
    ).sort((a, b) => {
      const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
      const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  setTab(tab: 'pending' | 'resolved'): void {
    this.activeTab = tab;
    if (tab === 'resolved') {
      this.selectedAssetType = '';
    }
  }

  async loadWarrantyTickets(): Promise<void> {
    this.loading = true;
    try {
      const currentUser = this.authService.getCurrentUser();
      const userId = currentUser?.id ?? 'usr_007';
      
      const [pendingRes, allRes] = await Promise.all([
        this.requestService.fetchPendingWarrantyApprovalsFromService(userId),
        this.requestService.fetchAllWarrantyRequests()
      ]);

      this.warrantyTickets = (pendingRes || []).filter(req => req.status === 'Pending' || req.status === 'In Progress');
      this.allWarrantyRequests = allRes || [];
      
      console.log('Pending Warranty Tickets:', this.warrantyTickets.length);
      console.log('All Warranty Requests:', this.allWarrantyRequests.length);
    } catch (err) {
      console.error('Failed to load warranty tickets:', err);
      this.notificationService.showToast('Failed to load warranty requests', 'error');
    } finally {
      this.loading = false;
    }
  }

  loadingRemarks = false;
  async openWarrantyModal(request: AssetRequest): Promise<void> {
    this.selectedWarrantyRequest = request;
    this.newWarrantyDate = '';
    this.isWarrantyModalOpen = true;
    this.loadingRemarks = true;

    // Fetch progress to get Manager remarks
    try {
      console.log(`[WarrantyTickets] Fetching progress for request: ${request.id}`);
      const progress = await this.requestService.getWarrantyProgress(request.id);
      console.log(`[WarrantyTickets] Progress records found:`, progress.length);
      
      if (this.selectedWarrantyRequest) {
        this.selectedWarrantyRequest.approvalChain = progress.map(p => ({
          stage: p.stage as any,
          action: p.status as any,
          comments: p.comments,
          approverName: p.approverName,
          timestamp: p.timestamp
        }));
        console.log(`[WarrantyTickets] Updated approval chain. Manager remarks: "${this.managerRemarks}"`);
      }
    } catch (err) {
      console.warn('Failed to fetch warranty progress:', err);
    } finally {
      this.loadingRemarks = false;
    }
  }

  get managerRemarks(): string {
    if (!this.selectedWarrantyRequest?.approvalChain) return '';
    // Look for the most recent entry with 'Manager' in the role/stage
    const managerApproval = [...this.selectedWarrantyRequest.approvalChain].reverse().find(a => 
      a.stage.toString().toLowerCase().includes('manager') || 
      a.stage.toString().toLowerCase().includes('mgr')
    );
    return managerApproval?.comments || '';
  }

  closeWarrantyModal(): void {
    this.isWarrantyModalOpen = false;
    this.selectedWarrantyRequest = null;
    this.newWarrantyDate = '';
  }

  async approveWarrantyExtension(): Promise<void> {
    const request = this.selectedWarrantyRequest;
    const newDate = this.newWarrantyDate;

    if (!request || !newDate) {
      this.notificationService.showToast('Please select a valid warranty date.', 'warning');
      return;
    }

    try {
      const requestId = request.id;
      const approvalId = request.approvalId;
      const assetId = request.assignedAssetId;

      if (!approvalId) {
        this.notificationService.showToast('Approval context missing. Cannot proceed.', 'error');
        return;
      }

      // 1. Update status in t_extend_request_approvals to 'Approved'
      await this.requestService.updateWarrantyRequestApproval(
        approvalId,
        'Approved',
        'Warranty extended by Allocation Team',
        assetId
      );

      // 2. Update status in t_extend_asset_requests to 'Approved'
      await this.requestService.updateExtendAssetRequest(requestId, 'Approved');

      // 3. Update m_assets with the new warranty date
      if (assetId) {
        await this.requestService.updateAssetWarrantyDate(assetId, newDate);
      }

      // 4. Send email to employee
      await this.mailService.sendWarrantyExtensionConfirmation({
        employeeName: request.requesterName,
        assetName: request.assetName || 'Asset',
        newExpiryDate: newDate,
        requestId: requestId
      });

      this.notificationService.showToast('Warranty extension approved and updated successfully!', 'success');
      this.closeWarrantyModal();
      await this.loadWarrantyTickets(); // Refresh
    } catch (error) {
      console.error('Failed to approve warranty extension:', error);
      this.notificationService.showToast('Failed to complete approval. Please try again.', 'error');
    }
  }
}
