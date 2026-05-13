import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { HeroService } from '../../../core/services/hero.service';
import { Asset, AssetCondition } from '../../../core/models/asset.model';
import { AssetRequest } from '../../../core/models/request.model';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';
import { AuthService } from '../../../core/services/auth.service';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';

Chart.register(...registerables);

interface StockAlert {
  category: string;
  waiting: number;
  available: number;
}

interface DashboardCategoryRow {
  typeName: string;
  categoryName: string;
  total: number;
  available: number;
  moveToAllocation: number;
  assigned: number;
  other: number;
}

@Component({
  selector: 'app-allocation-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class AllocationDashboardComponent implements OnInit {
  loading = true;
  inventoryTypeName = '';
  inventoryRows: DashboardCategoryRow[] = [];
  readyAssets: Asset[] = [];
  
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
  pendingAllocations: any[] = [];
  
  // Aggregate Stats
  stats = {
    totalPending: 0,
    totalAssets: 0,
    available: 0,
    readyForAllocation: 0,
    allocated: 0,
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
      const approverId = currentUser?.id;

      if (!approverId) {
        this.resetDashboard();
        this.notificationService.showToast('Current user is missing. Please log in again.', 'error');
        return;
      }

      const [resRequests, resInventory, resWarranty] = await Promise.all([
        this.hs.ajax('GetallpendingrequestsForAllocationTeamMemberwithTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata', { Approver_id: approverId }),
        this.fetchAllocationInventoryByUser(approverId),
        this.requestService.fetchPendingWarrantyApprovalsFromService(approverId)
      ]);

      const requestTuples = this.hs.xmltojson(resRequests, 'tuple');
      const allRequests = Array.isArray(requestTuples) ? requestTuples : (requestTuples ? [requestTuples] : []);
      const allAssets: Asset[] = resInventory || [];
      this.pendingWarrantyRequests = resWarranty || [];
      this.stats.totalPending = allRequests.length;
      this.buildInventorySummary(allAssets);

      const categoryMap = new Map<string, number>();
      allAssets.forEach(a => {
        const category = a.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
      const categories = Array.from(categoryMap.keys());
      this.assetTypeChartData.labels = categories;
      this.assetTypeChartData.datasets[0].data = categories.map(t => categoryMap.get(t)!);
      this.assetTypeChartData = { ...this.assetTypeChartData };

      const demandMap = new Map<string, number>();
      allRequests.forEach((t: any) => {
        const r = t?.old?.t_asset_requests || t?.t_asset_requests || {};
        const cat = this.getVal(r.sub_category_id) || this.getVal(r.asset_type) || 'Uncategorized';
        demandMap.set(cat, (demandMap.get(cat) || 0) + 1);
      });

      const availableMap = new Map<string, number>();
      allAssets.forEach(a => {
        if (String(a.status).toLowerCase() === 'available') {
          const category = a.category || 'Uncategorized';
          availableMap.set(category, (availableMap.get(category) || 0) + 1);
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
      
      this.pendingAllocations = allRequests
        .map((t: any) => {
          const r = t?.old?.t_asset_requests || t?.t_asset_requests || {};
          const u = t?.old?.m_users || t?.m_users || {};
          return {
            id: this.getVal(r.request_id) || this.getVal(r.Request_id) || 'REQ',
            requester: this.getVal(u.name) || this.getVal(r.requester_name) || this.getVal(r.user_name) || 'Unknown',
            assetType: this.getVal(r.sub_category_id) || this.getVal(r.asset_type) || 'Hardware',
            urgency: this.getVal(r.urgency) || 'Medium',
            date: this.getVal(r.created_at)
          };
        })
        .slice(0, 5);

    } catch (err) {
      console.error('Final Dashboard Load Error:', err);
    } finally {
      this.loading = false;
    }
  }

  private async fetchAllocationInventoryByUser(userId: string): Promise<Asset[]> {
    const response = await this.hs.ajax(
      'GetAllocationInventoryByUser',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      { user_id: userId }
    );
    const tuples = this.hs.xmltojson(response, 'tuple');
    const tupleArray: any[] = tuples ? (Array.isArray(tuples) ? tuples : [tuples]) : [];
    return tupleArray.map((tuple: any) => this.mapAllocationInventoryTupleToAsset(tuple));
  }

  private mapAllocationInventoryTupleToAsset(tuple: any): Asset {
    const data = tuple?.old?.m_assets ?? tuple?.m_assets ?? tuple;
    const typeInfo = data?.m_asset_types ?? {};
    const subCategoryInfo = data?.m_asset_subcategories ?? {};
    const assignedUserInfo = data?.m_users ?? {};
    const assetId = this.getVal(data?.asset_id) ?? '';
    const serialNumber = this.getVal(data?.serial_number) ?? '';
    const typeName = this.getVal(typeInfo?.type_name) ?? this.getVal(data?.type_id) ?? 'Assigned Type';
    const categoryName = this.getVal(subCategoryInfo?.name) ?? this.getVal(data?.sub_category_id) ?? 'Uncategorized';
    const status = this.getVal(data?.status) ?? 'Unknown';
    const assignedUserId = this.getVal(data?.temp1) ?? '';
    const assignedUserName = this.getVal(assignedUserInfo?.assigned_user_name) ?? '';
    const shouldShowAssignedUser = this.isAllocatedStatus(status) && !!assignedUserId;

    return {
      id: assetId,
      assetId,
      assetTag: serialNumber || assetId,
      name: this.getVal(data?.asset_name) ?? 'Unknown Asset',
      type: typeName,
      category: categoryName,
      subCategory: categoryName,
      status,
      assignedTo: shouldShowAssignedUser ? assignedUserId : '',
      assignedToName: shouldShowAssignedUser ? this.formatAssignedUser(assignedUserName, assignedUserId) : '',
      location: '',
      purchaseDate: this.getVal(data?.purchase_date) ?? '',
      warrantyExpiry: this.getVal(data?.warranty_expiry) ?? '',
      vendor: '',
      serialNumber,
      cost: 0,
      condition: AssetCondition.GOOD,
      requestId: this.getVal(data?.temp2) ?? ''
    };
  }

  private buildInventorySummary(allAssets: Asset[]): void {
    const summaryMap = new Map<string, DashboardCategoryRow>();
    this.stats.totalAssets = allAssets.length;
    this.stats.available = 0;
    this.stats.readyForAllocation = 0;
    this.stats.allocated = 0;

    allAssets.forEach(asset => {
      const typeName = asset.type as string || 'Assigned Type';
      const categoryName = asset.category || 'Uncategorized';
      const statusValue = (asset.status || '').toLowerCase().trim();
      const isAvailable = statusValue === 'available';
      const isMoveToAllocation = statusValue === 'movetoallocationteam';
      const isAssigned = statusValue === 'allocated' || statusValue === 'assigned';

      if (isAvailable) this.stats.available++;
      else if (isMoveToAllocation) this.stats.readyForAllocation++;
      else if (isAssigned) this.stats.allocated++;

      if (!summaryMap.has(categoryName)) {
        summaryMap.set(categoryName, {
          typeName,
          categoryName,
          total: 0,
          available: 0,
          moveToAllocation: 0,
          assigned: 0,
          other: 0
        });
      }

      const row = summaryMap.get(categoryName)!;
      row.total++;
      if (isAvailable) row.available++;
      else if (isMoveToAllocation) row.moveToAllocation++;
      else if (isAssigned) row.assigned++;
      else row.other++;
    });

    this.inventoryTypeName = allAssets[0]?.type as string || '';
    this.inventoryRows = Array.from(summaryMap.values())
      .sort((a, b) => b.moveToAllocation - a.moveToAllocation || b.available - a.available || a.categoryName.localeCompare(b.categoryName));
    this.readyAssets = allAssets
      .filter(asset => (asset.status || '').toLowerCase().trim() === 'movetoallocationteam')
      .slice(0, 6);
  }

  private resetDashboard(): void {
    this.stockAlerts = [];
    this.expiringAssets = [];
    this.inventoryRows = [];
    this.readyAssets = [];
    this.pendingAllocations = [];
    this.pendingWarrantyRequests = [];
    this.inventoryTypeName = '';
    this.stats = {
      totalPending: 0,
      totalAssets: 0,
      available: 0,
      readyForAllocation: 0,
      allocated: 0,
      warrantyAlerts: 0
    };
    this.assetTypeChartData.labels = [];
    this.assetTypeChartData.datasets[0].data = [];
    this.assetTypeChartData = { ...this.assetTypeChartData };
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('movetoallocationteam')) return 'status-move-to-allocation';
    if (s.includes('available')) return 'status-available';
    if (s.includes('allocated') || s.includes('assigned')) return 'status-allocated';
    if (s.includes('repair')) return 'status-maintenance';
    return 'status-other';
  }

  getStatusLabel(status: string): string {
    return status === 'MoveToAllocationTeam' ? 'Ready for Allocation' : status;
  }

  private isAllocatedStatus(status: string): boolean {
    const value = (status || '').toLowerCase().trim();
    return value === 'allocated' || value === 'assigned';
  }

  private formatAssignedUser(name: string, id: string): string {
    return name ? `${name} (${id})` : id;
  }

  private getVal(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object') {
      if (value['@nil'] === 'true' || value['@null'] === 'true' || value['@xsi:nil'] === 'true') return undefined;
      const textVal = value['#text'] || value['text'] || value['_'];
      if (textVal !== undefined && textVal !== null) {
        const str = String(textVal).trim();
        return str === '' ? undefined : str;
      }
      return undefined;
    }
    const str = String(value).trim();
    return str === '' ? undefined : str;
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
