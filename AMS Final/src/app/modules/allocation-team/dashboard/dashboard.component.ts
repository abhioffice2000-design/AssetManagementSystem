import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { HeroService } from '../../../core/services/hero.service';
import { Asset } from '../../../core/models/asset.model';
import { AssetRequest } from '../../../core/models/request.model';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';
import { AuthService } from '../../../core/services/auth.service';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

interface StockAlert {
  category: string;
  waiting: number;
  available: number;
}

@Component({
  selector: 'app-allocation-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class AllocationDashboardComponent implements OnInit {
  loading = true;
  
  // Charts
  public assetTypeChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } }
    }
  };
  public assetTypeChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#6366f1', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#06b6d4'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  // Data Lists
  stockAlerts: StockAlert[] = [];
  expiringAssets: any[] = [];
  
  // Aggregate Stats
  stats = {
    totalPending: 0,
    criticalShortage: 0,
    inMaintenance: 0,
    warrantyAlerts: 0
  };

  // Modal State
  isModalOpen = false;
  selectedAsset: any = null;

  // Warranty Extension State
  pendingWarrantyRequests: AssetRequest[] = [];
  isWarrantyModalOpen = false;
  selectedWarrantyRequest: AssetRequest | null = null;
  newWarrantyDate: string = '';

  constructor(
    private requestService: RequestService,
    private assetService: AssetService,
    private hs: HeroService,
    private notificationService: NotificationService,
    private mailService: MailService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadTaskConsole();
  }

  async loadTaskConsole(): Promise<void> {
    this.loading = true;
    try {
      const currentUser = this.authService.getCurrentUser();
      const approverId = currentUser?.id ?? 'usr_007';

      const [resRequests, resInventory, resWarranty] = await Promise.all([
        this.hs.ajax('GetallpendingrequestsForAllocationTeamMemberwithTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata', { Approver_id: approverId }),
        this.assetService.fetchAssetsFromService(),
        this.requestService.fetchPendingWarrantyApprovalsFromService(approverId)
      ]);

      const requestTuples = this.hs.xmltojson(resRequests, 'tuple');
      const allRequests = Array.isArray(requestTuples) ? requestTuples : (requestTuples ? [requestTuples] : []);
      const allAssets: Asset[] = resInventory || [];
      this.pendingWarrantyRequests = resWarranty || [];

      // 1. Asset Type Donut Chart
      const typeMap = new Map<string, number>();
      allAssets.forEach(a => {
        const type = a.type || 'Other';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      const types = Array.from(typeMap.keys());
      this.assetTypeChartData.labels = types;
      this.assetTypeChartData.datasets[0].data = types.map(t => typeMap.get(t)!);
      this.assetTypeChartData = { ...this.assetTypeChartData };

      this.stats.totalPending = allRequests.length;

      // 2. Stock Gaps
      const demandMap = new Map<string, number>();
      allRequests.forEach((t: any) => {
        const r = t?.old?.t_asset_requests || t?.t_asset_requests || {};
        const cat = r.asset_type || 'Unknown';
        demandMap.set(cat, (demandMap.get(cat) || 0) + 1);
      });

      const availableMap = new Map<string, number>();
      allAssets.forEach(a => {
        if (String(a.status).toLowerCase() === 'available') {
          const type = a.type || 'Unknown';
          availableMap.set(type, (availableMap.get(type) || 0) + 1);
        }
      });

      this.stockAlerts = Array.from(demandMap.keys())
        .map(cat => ({
          category: cat,
          waiting: demandMap.get(cat) || 0,
          available: availableMap.get(cat) || 0
        }))
        .filter(alert => alert.available < alert.waiting)
        .sort((a,b) => b.waiting - a.waiting);

      this.stats.criticalShortage = this.stockAlerts.filter(s => s.available === 0).length;

      // 3. Warranty Expiry
      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(now.getDate() + 30);

      this.expiringAssets = allAssets
        .filter(a => {
          if (!a.warrantyExpiry) return false;
          const expiry = new Date(a.warrantyExpiry);
          return expiry >= now && expiry <= thirtyDaysLater;
        })
        .map(a => ({
          tag: a.assetTag,
          name: a.name,
          expiry: a.warrantyExpiry,
          assignedTo: a.assignedToName || 'Not Assigned',
          days: Math.round((new Date(a.warrantyExpiry).getTime() - now.getTime()) / (1000 * 3600 * 24))
        }))
        .sort((a,b) => a.days - b.days);
      
      this.stats.warrantyAlerts = this.expiringAssets.length;
      this.stats.inMaintenance = allAssets.filter(a => String(a.status).toLowerCase().includes('repair')).length;

    } catch (err) {
      console.error('Final Dashboard Load Error:', err);
    } finally {
      this.loading = false;
    }
  }

  openAssetDetails(asset: any): void {
    this.selectedAsset = asset;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedAsset = null;
  }

  openWarrantyModal(request: AssetRequest): void {
    this.selectedWarrantyRequest = request;
    this.newWarrantyDate = ''; // Reset date
    this.isWarrantyModalOpen = true;
  }

  closeWarrantyModal(): void {
    this.isWarrantyModalOpen = false;
    this.selectedWarrantyRequest = null;
    this.newWarrantyDate = '';
  }

  async approveWarrantyExtension(): Promise<void> {
    if (!this.selectedWarrantyRequest || !this.newWarrantyDate) {
      alert('Please select a new warranty date.');
      return;
    }

    try {
      const requestId = this.selectedWarrantyRequest.id;
      const approvalId = this.selectedWarrantyRequest.approvalId;
      const assetId = this.selectedWarrantyRequest.assignedAssetId;

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
        await this.requestService.updateAssetWarrantyDate(assetId, this.newWarrantyDate);
      }

      // 4. Send email to employee
      await this.mailService.sendWarrantyExtensionConfirmation({
        employeeName: this.selectedWarrantyRequest.requesterName,
        assetName: this.selectedWarrantyRequest.assetName || 'Asset',
        newExpiryDate: this.newWarrantyDate,
        requestId: requestId
      });

      this.notificationService.showToast('Warranty extension approved and updated successfully!', 'success');
      this.closeWarrantyModal();
      await this.loadTaskConsole(); // Refresh dashboard
    } catch (error) {
      console.error('Failed to approve warranty extension:', error);
      this.notificationService.showToast('Failed to complete approval. Please try again.', 'error');
    }
  }
}
