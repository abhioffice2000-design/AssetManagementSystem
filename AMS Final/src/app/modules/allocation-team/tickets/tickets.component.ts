import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetService } from '../../../core/services/asset.service';
import { AssetRequest, RequestStatus, ApprovalStage, RequestType } from '../../../core/models/request.model';
import { HeroService } from 'src/app/core/services/hero.service';
import { MailService } from 'src/app/core/services/mail.service';
import { NotificationService } from 'src/app/core/services/notification.service';


export interface EnrichedTicket {
  taskid: string;
  approvalid: string;
  ticketId: string;
  requestorName: string;
  assetType: string;
  subCategory: string;
  assetName: string;
  assetId: string;
  warrantyExpiry: string;
  availabilityStatus: string;
  assignedDate: string;
  assetManagerName: string;
  teamLeadName: string;
  urgency: string;
  reason: string;
  status: RequestStatus;
  rawRequest: AssetRequest;
}

@Component({
  selector: 'app-allocation-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class AllocationTicketsComponent implements OnInit {
  RequestType = RequestType;
  activeTab: 'unresolved' | 'resolved' | 'resolvedReturn' = 'unresolved';
  loading = true;
  allTickets: EnrichedTicket[] = [];
  resolvedTickets: EnrichedTicket[] = [];
  resolvedReturnTickets: EnrichedTicket[] = [];
  currentUser: any;
  returnTickets: EnrichedTicket[] = [];
  selectedTicket: EnrichedTicket | null = null;
  drawerOpen = false;

  // Reject modal state
  showRejectModal = false;
  rejectRemarks = '';
  ticketToReject: EnrichedTicket | null = null;
  assetManagerNameForThisUser: string = "";
  assetManagerIDForThisUser: string = "";

  // Search and Filter
  searchTerm: string = '';
  selectedAssetType: string = '';
  selectedRequestType: string = ''; // New filter
  selectedResolvedStatus = '';
  isSaving = false;
  decisionRemarks = '';
  // New filter for Resolved tab
  assetTypeOptions: string[] = ['Hardware', 'Software', 'Furniture', 'Network'];
  subCategoryMap: Map<string, string> = new Map();


  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;

  constructor(
    private requestService: RequestService,
    private assetService: AssetService,
    private hs: HeroService,
    private mailService: MailService,
    private notificationService: NotificationService
  ) { }


  async ngOnInit(): Promise<void> {      // ✅ made async
    this.currentUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
    const userId = this.currentUser?.id ?? null;
    console.log("User ID is ", userId);
    const request = { Approver_id: userId };

    try {
      const res = await this.hs.ajax(
        'GetAssetManagerByTeamAllocationMember',
        'http://schemas.cordys.com/AMS_Database_Metadata',
        request
      );


      const tuples = this.hs.xmltojson(res, 'tuple');
      console.log('Raw tuples:', tuples);
      const tupleArray: any[] = tuples ? (Array.isArray(tuples) ? tuples : [tuples]) : [];
      const firstTuple = tupleArray[0];
      const mUsers = firstTuple?.old?.m_roles?.m_users ?? firstTuple?.m_roles?.m_users ?? {};

      this.assetManagerNameForThisUser = this.getVal(mUsers?.name) ?? '';  // ✅ assigned
      this.assetManagerIDForThisUser = this.getVal(mUsers?.user_id) ?? '';  // ✅ assigned
      console.log("Asset Manager Name For This User", this.assetManagerNameForThisUser);
      console.log("Asset Manager ID For This User", this.assetManagerIDForThisUser);
    } catch (err) {
      console.error('Failed to fetch asset manager info:', err);
    }

    try {
      const subCats = await this.assetService.getAllSubcategoriesCordys();
      subCats.forEach(sc => {
        const id = sc.sub_category_id || sc.SUB_CATEGORY_ID || sc.id;
        const name = sc.sub_category_name || sc.SUB_CATEGORY_NAME || sc.name;
        if (id && name) this.subCategoryMap.set(id, name);
      });
      console.log('Subcategory Map initialized:', this.subCategoryMap.size, 'items');
    } catch (err) {
      console.warn('Failed to load subcategories for mapping:', err);
    }

    try {
      const typeCounts = await this.assetService.fetchAssetTypeWiseCount();
      // Extract unique type names from master data, excluding 'Infrastructure' as per user request
      this.assetTypeOptions = typeCounts
        .map(t => t.type_name)
        .filter(name => name && name.toLowerCase() !== 'infrastructure');
      console.log('Dynamic Asset Type Options loaded:', this.assetTypeOptions);
    } catch (err) {
      console.warn('Failed to load dynamic asset types, falling back to defaults:', err);
    }

    this.loadTickets();
  }



  async loadTickets(): Promise<void> {
    this.loading = true;
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
      const userId = currentUser?.id ?? 'usr_007';

      const resRequests = await this.hs.ajax(
        'GetallpendingrequestsForAllocationTeamMemberwithTeamLead',
        'http://schemas.cordys.com/AMS_Database_Metadata',
        { Approver_id: userId }
      );

      console.log('Raw response:', resRequests);
      const tuples = this.hs.xmltojson(resRequests, 'tuple');
      console.log('Parsed tuples:', tuples);

      if (!tuples) {
        console.warn('No tuples found in response');
        this.allTickets = [];
      } else {
        const tupleArray: any[] = Array.isArray(tuples) ? tuples : [tuples];
        this.allTickets = tupleArray.map((t: any) => this.mapTupleToEnrichedTicket(t));
        console.log(`Loaded ${this.allTickets.length} tickets`);
      }

      // Sync return tickets load
      await this.loadReturnTickets();
      // Merge return tickets into allTickets so they appear in the table
      this.allTickets = [...this.allTickets, ...this.returnTickets];
      // Load resolved history
      await this.loadResolvedTickets();
      // Load resolved return history
      await this.loadResolvedReturnTickets();
    } catch (err) {
      console.error('Failed to load allocation tickets:', err);
      this.allTickets = [];
    } finally {
      this.loading = false;
    }
  }

  async loadReturnTickets(): Promise<void> {
    const request = { Approver_id: 'usr_007' };

    try {
      const res = await this.hs.ajax(
        'GetPendingReturnApprovalsForManager',
        'http://schemas.cordys.com/AMS_Database_Metadata',
        request
      );

      const tuples = this.hs.xmltojson(res, 'tuple');
      if (!tuples) {
        this.returnTickets = [];
      } else {
        const tupleArray: any[] = Array.isArray(tuples) ? tuples : [tuples];
        console.log('Processed Return Tuples:', tupleArray);
        this.returnTickets = tupleArray.map((t: any) => this.mapReturnTupleToEnrichedTicket(t));

        // Enrich each return ticket with full asset details from m_assets
        for (const ticket of this.returnTickets) {
          if (ticket.assetId && ticket.assetId !== '—') {
            const asset = await this.requestService.getAssetDetailsById(ticket.assetId);
            if (asset) {
              ticket.assetName = asset.asset_name || ticket.assetName;
              ticket.assetType = asset.type_id || ticket.assetType;
              ticket.subCategory = asset.sub_category_id || ticket.subCategory;
              ticket.warrantyExpiry = asset.warranty_expiry || ticket.warrantyExpiry;
            }
          }
        }

        console.log('Return Tickets Statuses:', this.returnTickets.map(t => `${t.ticketId}: ${t.status}`));
      }
    } catch (err) {
      console.error('Failed to load return tickets:', err);
      this.returnTickets = [];
    }
  }

  async loadResolvedTickets(): Promise<void> {
    try {
      const res = await this.hs.ajax(
        'Getallrequest',
        'http://schemas.cordys.com/AMS_Database_Metadata',
        {}
      );
      const tuples = this.hs.xmltojson(res, 'tuple');
      if (tuples) {
        const tupleArray: any[] = Array.isArray(tuples) ? tuples : [tuples];
        this.resolvedTickets = tupleArray
          .map((t: any) => this.mapTupleToEnrichedTicket(t))
          .filter(t =>
            t.status === RequestStatus.COMPLETED ||
            t.status === RequestStatus.APPROVED ||
            t.status === RequestStatus.REJECTED ||
            t.status === RequestStatus.CANCELLED
          );
      }

      // Fetch Warranty Extension Resolved Tickets
      try {
        const warrantyRequests = await this.requestService.fetchAllWarrantyRequests();
        const resolvedWarrantyTickets = warrantyRequests
          .filter(req =>
            req.status === RequestStatus.COMPLETED ||
            req.status === RequestStatus.APPROVED ||
            req.status === RequestStatus.REJECTED ||
            req.status === RequestStatus.CANCELLED
          )
          .map(req => this.mapWarrantyToEnrichedTicket(req));

        this.resolvedTickets = [...this.resolvedTickets, ...resolvedWarrantyTickets];
        console.log(`Merged ${resolvedWarrantyTickets.length} resolved warranty tickets`);
      } catch (wErr) {
        console.warn('Failed to load resolved warranty tickets for main view:', wErr);
      }
    } catch (err) {
      console.error('Failed to load resolved tickets:', err);
    }
  }

  async loadResolvedReturnTickets(): Promise<void> {
    try {
      const res = await this.hs.ajax(
        'Getallreturnrequests',
        'http://schemas.cordys.com/AMS_Database_Metadata',
        {}
      );
      const tuples = this.hs.xmltojson(res, 'tuple');
      if (tuples) {
        const tupleArray: any[] = Array.isArray(tuples) ? tuples : [tuples];
        this.resolvedReturnTickets = tupleArray
          .map((t: any) => this.mapReturnTupleToEnrichedTicket(t))
          .filter(t => 
            t.status === RequestStatus.COMPLETED || 
            t.status === RequestStatus.APPROVED || 
            t.status === RequestStatus.REJECTED || 
            t.status === RequestStatus.CANCELLED
          );
        console.log(`Loaded ${this.resolvedReturnTickets.length} resolved return tickets`);
      } else {
        this.resolvedReturnTickets = [];
      }
    } catch (err) {
      console.error('Failed to load resolved return tickets:', err);
      this.resolvedReturnTickets = [];
    }
  }

  setTab(tab: 'unresolved' | 'resolved' | 'resolvedReturn'): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  private findTaskIdRecursively(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return null;
    const targets = ['temp2', 'temp1', 'temp3', 'task_id', 'taskId', 'WORKITEM_ID'];
    for (const key of targets) {
      const val = this.getVal(obj[key]);
      if (val && val !== '—' && val !== '–' && val !== '-' && val !== 'null' && val !== 'NaN') return val;
    }
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = this.findTaskIdRecursively(obj[key]);
        if (result) return result;
      }
    }
    return null;
  }

  private mapReturnTupleToEnrichedTicket(tuple: any): EnrichedTicket {
    const returnData = tuple?.old?.t_asset_returns ?? tuple?.t_asset_returns ?? tuple;
    let approvalObj = returnData?.t_asset_return_approvals ?? {};

    if (Array.isArray(approvalObj)) {
      approvalObj = approvalObj.find((a: any) => this.getVal(a.status) === 'Pending') ?? approvalObj[0] ?? {};
    }

    const userData = returnData?.m_users ?? {};
    const statusStr = this.getVal(returnData?.status) ?? this.getVal(approvalObj?.status) ?? 'Pending';
    const status = this.mapToStatus(statusStr);

    // Recursive search for TaskID to handle any XML structure
    // const taskId = this.findTaskIdRecursively(tuple) || '—';
    const taskId = "-";
    // if (taskId === '—') {
    //   console.warn('CRITICAL: TaskID still missing for Return ID:', this.getVal(returnData?.return_id));
    //   console.log('Full Raw Tuple for analysis:', JSON.stringify(tuple));
    // } else {
    //   console.log(`Successfully identified TaskID [${taskId}] for return ${this.getVal(returnData?.return_id)}`);
    // }

    return {
      taskid: returnData?.t_asset_return_approvals.temp2,
      approvalid: this.getVal(approvalObj?.return_approval_id) ?? '—',
      ticketId: this.getVal(returnData?.return_id) ?? this.getVal(approvalObj?.request_id) ?? '—',
      requestorName: this.getVal(userData?.name) ?? '—',
      assetType: 'Hardware',
      subCategory: 'N/A',
      assetName: 'Asset Return',
      assetId: this.getVal(returnData?.temp1) ?? '—',
      warrantyExpiry: '—',
      availabilityStatus: 'N/A',
      assignedDate: this.getVal(returnData?.return_date) ?? '',
      assetManagerName: '—',
      teamLeadName: '—',
      urgency: 'Medium',
      reason: this.getVal(returnData?.remarks) ?? '—',
      status,
      rawRequest: {
        id: this.getVal(returnData?.return_id) ?? '',
        requestNumber: this.getVal(returnData?.return_id) ?? '',
        requesterId: this.getVal(returnData?.requested_by) ?? '',
        requesterName: this.getVal(userData?.name) ?? '',
        requestType: RequestType.RETURN_ASSET,
        status,
        currentStage: ApprovalStage.ALLOCATION,
        requestDate: this.getVal(returnData?.return_date) ?? '',
        lastUpdated: this.getVal(returnData?.return_date) ?? '',
        assignedAssetId: this.getVal(returnData?.temp1) ?? '',
        approvalChain: [{ stage: ApprovalStage.ALLOCATION, action: 'Pending' }],
        comments: []
      } as any
    };
  }

  /**
   * Maps a single Cordys XML→JSON tuple into an EnrichedTicket.
   *
   * Response shape:
   *   tuple.old.t_request_approvals
   *     ├── t_asset_requests  (request_id, user_id, asset_type, reason, urgency, status, created_at)
   *     ├── m_assets          (asset_id, asset_name, sub_category_id, warranty_expiry, status)
   *     └── m_users           (name, team_lead, project_id, user_id)
   */
  private mapTupleToEnrichedTicket(tuple: any): EnrichedTicket {
    const parent = tuple?.old ?? tuple;
    const approval = parent?.t_request_approvals ?? parent;
    const reqData = approval?.t_asset_requests ?? parent?.t_asset_requests ?? (parent.request_id ? parent : {});
    const assetData = approval?.m_assets ?? parent?.m_assets ?? reqData?.m_assets ?? {};
    const userData = approval?.m_users ?? parent?.m_users ?? reqData?.m_users ?? {};

    const statusStr = this.getVal(reqData?.status) ?? this.getVal(approval?.status) ?? 'Pending';
    const status = this.mapToStatus(statusStr);

    return {
      taskid: this.getVal(approval?.temp2) ?? '—',
      approvalid: this.getVal(approval?.approval_id) ?? '—',
      ticketId: this.getVal(reqData?.request_id) ?? this.getVal(approval?.request_id) ?? '—',
      requestorName: this.getVal(userData?.name) ?? '—',
      assetType: this.getVal(reqData?.asset_type) ?? '—',
      subCategory: this.subCategoryMap.get(this.getVal(assetData?.sub_category_id) || '') ?? this.getVal(assetData?.sub_category_id) ?? '—',
      assetName: this.getVal(assetData?.asset_name) ?? '—',

      assetId: this.getVal(assetData?.asset_id) ?? '—',
      warrantyExpiry: this.getVal(assetData?.warranty_expiry) ?? '—',
      availabilityStatus: this.getVal(assetData?.status) ?? '—',
      assignedDate: this.getVal(reqData?.created_at) ?? '',
      assetManagerName: '—',
      teamLeadName: this.getVal(userData?.team_lead) ?? '—',
      urgency: this.getVal(reqData?.urgency) ?? '—',
      reason: this.getVal(reqData?.reason) ?? '—',
      status,
      rawRequest: {
        id: this.getVal(reqData?.request_id) ?? '',
        requestNumber: this.getVal(reqData?.request_id) ?? '',
        requesterId: this.getVal(reqData?.user_id) ?? '',
        requesterName: this.getVal(userData?.name) ?? '',
        requesterDepartment: '',
        requesterTeam: '',
        assetType: this.getVal(reqData?.asset_type) ?? '',
        category: this.getVal(assetData?.asset_name) ?? '',
        justification: this.getVal(reqData?.reason) ?? '',
        urgency: this.mapToUrgency(this.getVal(reqData?.urgency) ?? '') as any,
        status,
        currentStage: ApprovalStage.ALLOCATION,
        hasEmailApproval: reqData?.email_approval === 'true',
        requestDate: this.getVal(reqData?.created_at) ?? '',
        lastUpdated: this.getVal(reqData?.created_at) ?? '',
        requestType: 'NEW_ASSET' as any,
        approvalChain: [{ stage: ApprovalStage.ALLOCATION, action: 'Pending' }],
        comments: []
      } as AssetRequest
    };
  }

  /**
   * Maps an AssetRequest (typically from Warranty Extension table) to EnrichedTicket.
   */
  private mapWarrantyToEnrichedTicket(req: AssetRequest): EnrichedTicket {
    return {
      taskid: req.taskid || '—',
      approvalid: req.approvalId || '—',
      ticketId: req.id || '—',
      requestorName: req.requesterName || '—',
      assetType: req.assetType || '—',
      subCategory: req.subCategory || '—',
      assetName: req.assetName || '—',
      assetId: req.assignedAssetId || '—',
      warrantyExpiry: req.assignedWarrantyExpiry || '—',
      availabilityStatus: 'N/A',
      assignedDate: req.requestDate || '',
      assetManagerName: '—',
      teamLeadName: '—',
      urgency: req.urgency || '—',
      reason: req.justification || '—',
      status: req.status,
      rawRequest: req
    };
  }

  /** Safely extracts a string value; returns undefined for xsi:nil / null objects or blanks. */
  private getVal(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object') {
      if (value['@nil'] === 'true' || value['@null'] === 'true') return undefined;
      return undefined;
    }
    const str = String(value).trim();
    return str === '' ? undefined : str;
  }

  private mapToStatus(status: string): RequestStatus {
    const n = status.toLowerCase();
    if (n.includes('pending')) return RequestStatus.PENDING;
    if (n.includes('approved')) return RequestStatus.APPROVED;
    if (n.includes('rejected')) return RequestStatus.REJECTED;
    if (n.includes('progress')) return RequestStatus.IN_PROGRESS;
    if (n.includes('completed')) return RequestStatus.COMPLETED;
    if (n.includes('cancelled')) return RequestStatus.CANCELLED;
    return RequestStatus.PENDING;
  }

  private mapToUrgency(urgency: string): string {
    const n = urgency.toLowerCase();
    if (n.includes('critical')) return 'Critical';
    if (n.includes('high')) return 'High';
    if (n.includes('medium')) return 'Medium';
    if (n.includes('low')) return 'Low';
    return 'Medium';
  }



  viewDetails(ticket: EnrichedTicket): void {
    this.selectedTicket = ticket;
    this.drawerOpen = true;
    this.decisionRemarks = '';
  }

  closeDetails(): void {
    this.drawerOpen = false;
    this.selectedTicket = null;
    this.decisionRemarks = '';
  }

  get unresolvedTickets(): EnrichedTicket[] {
    return this.allTickets.filter(t =>
      t.status === 'Pending' ||
      t.status === 'In Progress'
    );
  }

  get filteredTickets(): EnrichedTicket[] {
    let source: EnrichedTicket[] = [];
    if (this.activeTab === 'unresolved') {
      source = this.unresolvedTickets;
    } else if (this.activeTab === 'resolved') {
      source = this.resolvedTickets;
    } else if (this.activeTab === 'resolvedReturn') {
      source = this.resolvedReturnTickets;
    }

    // Apply Search
    let filtered = source.filter(t => {
      const matchesSearch = !this.searchTerm ||
        t.ticketId.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.requestorName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.subCategory.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesType = !this.selectedAssetType || t.assetType === this.selectedAssetType;

      const matchesRequestType = !this.selectedRequestType ||
        (this.selectedRequestType === 'new' && t.rawRequest.requestType === RequestType.NEW_ASSET) ||
        (this.selectedRequestType === 'warranty' && t.rawRequest.requestType === RequestType.EXTEND_WARRANTY) ||
        (this.selectedRequestType === 'return' && t.rawRequest.requestType === RequestType.RETURN_ASSET);

      const matchesResolvedStatus = (this.activeTab !== 'resolved' && this.activeTab !== 'resolvedReturn') || !this.selectedResolvedStatus ||
        (this.selectedResolvedStatus === 'Approved' && (t.status === RequestStatus.COMPLETED || t.status === RequestStatus.APPROVED)) ||
        (this.selectedResolvedStatus === 'Rejected' && t.status === RequestStatus.REJECTED);

      return matchesSearch && matchesType && matchesRequestType && matchesResolvedStatus;
    });

    // Sort by Date (Descending - Newest first)
    filtered.sort((a, b) => {
      const dateA = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
      const dateB = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }


  get paginatedTickets(): EnrichedTicket[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTickets.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTickets.length / this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  setPage(page: number): void {
    this.currentPage = page;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }


  getStatusClass(status: RequestStatus): string {
    switch (status) {
      case RequestStatus.PENDING: return 'status-pending';
      case RequestStatus.APPROVED: return 'status-approved';
      case RequestStatus.IN_PROGRESS: return 'status-inprogress';
      case RequestStatus.COMPLETED: return 'status-completed';
      case RequestStatus.REJECTED: return 'status-rejected';
      case RequestStatus.CANCELLED: return 'status-cancelled';
      default: return 'status-default';
    }
  }

  async allocate(ticket: EnrichedTicket): Promise<void> {


    var req1 = {
      tuple: {
        old: {
          t_request_approvals: {
            approval_id: ticket.approvalid,

          }
        }
        ,
        new: {
          t_request_approvals: {
            status: "Approved",
            remarks: this.decisionRemarks || "Allocated to Requestor"
          }
        }

      }
    }
    console.log("First request is", req1)
    await this.requestService.updateEntryForAllocationTeamMember(req1 as any)
    var req2 = {
      tuple: {
        old: {
          m_assets: {
            asset_id: ticket.assetId,
          }
        },
        new: {
          m_assets: {
            status: "Allocated",
            temp1: ticket.rawRequest.requesterId,
            temp2: ticket.rawRequest.requestType === RequestType.EXTEND_WARRANTY ? 'Extend' : 'Allocate'
          }
        }
      }
    }
    console.log("Request2 is ", req2);
    await this.requestService.updateAssetStatus(req2 as any)
    var req3 = {
      tuple: {
        new: {
          t_request_approvals: {
            approver_id: this.assetManagerIDForThisUser,
            request_id: ticket.rawRequest.id,
            role: "Asset Manager",
            status: "Pending",

            temp1: ticket.assetId,

          }
        }
      }
    }
    console.log("Third request is ", req3);
    await this.requestService.createNewEntryForAssetManagerConfirmation(req3 as any);
    var taskid = ticket.taskid;
    console.log("Taskid is  ", taskid);
    var req4 = {
      TaskId: `${taskid}`,
      Action: 'COMPLETE'
    }
    await this.requestService.completeUserTask(req4 as any)

    // Notify Asset Manager for Final Confirmation
    this.mailService.sendAllocationCompletionNotification({
      requestId: ticket.ticketId,
      assetName: ticket.assetName || ticket.assetType,
      allocationName: 'Allocation Team Member',
      managerName: this.assetManagerNameForThisUser || 'Asset Manager'
    });

    this.loadTickets();
  }

  async reject(ticket: EnrichedTicket, remarksInput?: string): Promise<void> {
    const remarks = remarksInput || this.decisionRemarks || 'Rejected by Allocation Team';

    try {
      // Step 1: Update approval record to Rejected
      const reqReject = {
        tuple: {
          old: {
            t_request_approvals: {
              approval_id: ticket.approvalid,
            }
          },
          new: {
            t_request_approvals: {
              status: "Rejected",
              remarks: remarks
            }
          }
        }
      };
      console.log("Rejecting standard request:", reqReject);
      await this.requestService.updateEntryForAllocationTeamMember(reqReject as any);

      // Step 2: Update asset request status to Rejected
      const rejectRequestPayload = {
        tuple: {
          old: { t_asset_requests: { request_id: ticket.rawRequest.id } },
          new: { t_asset_requests: { status: 'Rejected' } }
        }
      };
      await this.requestService.submitNewRequestForm(rejectRequestPayload as any);

      // Step 3: Complete BPM task
      const taskid = ticket.taskid;
      if (taskid && taskid !== '—' && taskid !== '–' && taskid !== '-') {
        await this.requestService.completeUserTask({ TaskId: `${taskid}`, Action: 'COMPLETE' } as any);
      }

      this.notificationService.showToast(`Request ${ticket.ticketId} rejected.`, 'info');
    } catch (error) {
      console.error("Standard request rejection failed:", error);
      this.notificationService.showToast(`Failed to reject request ${ticket.ticketId}.`, 'error');
    }

    this.loadTickets();
    if (!this.decisionRemarks.trim()) {
      alert('Remarks are mandatory for rejection.');
      return;
    }

    try {
      await this.requestService.rejectRequest(
        ticket.rawRequest.id,
        this.currentUser.id,
        this.currentUser.name,
        this.decisionRemarks,
        ApprovalStage.ALLOCATION,
        ticket.approvalid
      );
      this.notificationService.showToast('Request rejected successfully', 'success');
      this.closeDetails();
      await this.loadTickets();
    } catch (error) {
      console.error('Rejection failed:', error);
      this.notificationService.showToast('Failed to reject request', 'error');
    }
  }
  async allocateAssetReturn(ticket: EnrichedTicket): Promise<void> {

    console.log("Starting allocateAssetReturn for:", ticket.ticketId);

    if (!ticket.ticketId || ticket.ticketId === '—' || !ticket.approvalid || ticket.approvalid === '—') {
      console.error("Cannot proceed: Missing Ticket ID or Approval ID", ticket);
      return;
    }

    // Force routing to usr_004 for returns
    const approverId = 'usr_004';

    try {
      // 1. Update current approval status
      var req11 = {
        tuple: {
          old: {
            t_asset_return_approvals: {
              return_approval_id: ticket.approvalid,
            }
          },
          new: {
            t_asset_return_approvals: {
              status: "Approved",
              remarks: "Allocated to Asset Manager"
            }
          }
        }
      };

      console.log("Step 1: Updating current approval status...", req11);
      const res1 = await this.requestService.updateEntryForAllocationTeamMemberAssetReturn(req11 as any);
      console.log("Step 1 Complete. Response Tuple:", JSON.stringify(res1));

      // Capture TaskID from Step 1 response if current one is missing
      let currentTaskId = ticket.taskid;
      if (!currentTaskId || currentTaskId === '—' || currentTaskId === '-' || currentTaskId === '–') {
        // Try looking in new tag of response
        const newRecord = res1?.new?.t_asset_return_approvals || res1?.t_asset_return_approvals || res1;
        const respTaskId = this.getVal(newRecord?.temp2) || this.getVal(newRecord?.temp1) || this.findTaskIdRecursively(res1);
        if (respTaskId) {
          console.log("Captured TaskID from Step 1 response:", respTaskId);
          currentTaskId = respTaskId;
        }
      }

      // 2. Create next approval entry for Asset Manager
      var req12 = {
        tuple: {
          new: {
            t_asset_return_approvals: {
              approver_id: approverId,
              request_id: ticket.ticketId,
              role: "Asset Manager",
              status: "Pending",
              remarks: "Waiting for Hand-off Confirmation"
            }
          }
        }
      };

      console.log("Step 2: Creating entry for Asset Manager (usr_004)...", req12);
      const res2 = await this.requestService.createNewEntryForAssetManagerConfirmationAssetReturn(req12 as any);
      console.log("Step 2 Complete. Response:", res2);

      // 3. Complete BPM Task if available
      console.log("Final Task ID for completion:", currentTaskId);

      console.log("SOAP Create (REQ7):", req11);
      //  await this.requestService.completeTask(req12 as any);
      // var req4 = {
      //   TaskId: `${taskid}`,
      //   Action: 'COMPLETE'
      // }
      // await this.requestService.completeUserTask(req4 as any)
      // console.log("Step 2 (Forwarding) Success");
      // Check for truthiness and skip placeholders (Em Dash, En Dash, Hyphen)
      if (currentTaskId && currentTaskId !== '—' && currentTaskId !== '–' && currentTaskId !== '-') {
        var req4 = {
          TaskId: `${currentTaskId}`,
          Action: 'COMPLETE'
        };
        console.log("Step 3: Completing BPM task...", req4);
        const res3 = await this.requestService.completeUserTask(req4 as any);
        console.log("Step 3 Complete. Response:", res3);
      } else {
        console.warn("Skipping Step 3: No valid TaskID found in initial data or Step 1 response.");
      }

      // Send email to Asset Manager for final confirmation
      this.mailService.sendReturnRequestNotification({
        stage: 'alloc_approved',
        returnId: ticket.ticketId,
        employeeName: ticket.requestorName,
        assetName: ticket.assetName,
        remarks: "Allocated to Asset Manager",
        actionByName: 'Allocation Team Member',
        nextApproverName: 'Asset Manager'
      });

      console.log("All steps finished for return ticket:", ticket.ticketId);
      this.loadTickets();

    } catch (error) {
      console.error("Critical error in allocateAssetReturn workflow:", error);
    }
  }

  async rejectAssetReturn(ticket: EnrichedTicket, remarksInput?: string): Promise<void> {
    const remarks = remarksInput || this.rejectRemarks || 'Rejected by Allocation Team';

    try {
      // Step 1: Update current return approval status to "Rejected"
      const reqReject = {
        tuple: {
          old: {
            t_asset_return_approvals: {
              return_approval_id: ticket.approvalid,
            }
          },
          new: {
            t_asset_return_approvals: {
              status: "Rejected",
              remarks: remarks
            }
          }
        }
      };
      console.log("Step 1: Rejecting return request:", reqReject);
      await this.requestService.updateEntryForAllocationTeamMemberAssetReturn(reqReject as any);

      // Step 2: Update t_asset_returns main table status to 'Rejected'
      const updateReturnReq = {
        tuple: {
          old: {
            t_asset_returns: {
              return_id: ticket.ticketId
            }
          },
          new: {
            t_asset_returns: {
              status: 'Rejected',
              remarks: remarks
            }
          }
        }
      };
      try {
        await this.requestService.createEntryForReturn(updateReturnReq as any);
        console.log("Step 2: t_asset_returns updated to Rejected");
      } catch (e) {
        console.error("Failed to update t_asset_returns status:", e);
      }

      // Step 3: Complete BPM task
      const taskid = ticket.taskid;
      if (taskid && taskid !== '—' && taskid !== '–' && taskid !== '-') {
        const req4 = {
          TaskId: `${taskid}`,
          Action: 'COMPLETE'
        };
        await this.requestService.completeUserTask(req4 as any);
        console.log("Step 3: BPM task completed");
      }

      // Send email to Employee about rejection
      this.mailService.sendReturnRequestNotification({
        stage: 'alloc_rejected',
        returnId: ticket.ticketId,
        employeeName: ticket.requestorName,
        assetName: ticket.assetName,
        remarks: remarks,
        actionByName: 'Allocation Team Member'
      });

      this.notificationService.showToast(`Return request ${ticket.ticketId} rejected.`, 'info');
    } catch (error) {
      console.error("Return request rejection failed:", error);
      this.notificationService.showToast(`Failed to reject return request ${ticket.ticketId}.`, 'error');
    }

    this.loadTickets();
  }

  // ─── Reject Methods ───────────────────────────────────────────────────

  async handleRejectClick(ticket: EnrichedTicket): Promise<void> {
    if (!this.decisionRemarks || this.decisionRemarks.trim() === '') {
      this.notificationService.showToast('Rejection remarks are required in the Decision Remarks field.', 'warning');
      return;
    }

    const remarks = this.decisionRemarks;
    this.closeDetails();

    if (ticket.rawRequest.requestType === RequestType.RETURN_ASSET) {
      await this.rejectAssetReturn(ticket, remarks);
    } else {
      await this.reject(ticket, remarks);
    }
  }

  handleTableRejectClick(ticket: EnrichedTicket): void {
    this.viewDetails(ticket);
    this.notificationService.showToast('Please enter rejection remarks in the Decision Remarks field before rejecting.', 'info');
  }


  isExpiringSoon(dateStr: string): boolean {
    if (!dateStr || dateStr === '—') return false;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays < 90;
  }

  getAvailClass(status: string): string {
    switch (status) {
      case 'Available': return 'avail-available';
      case 'Allocated': return 'avail-allocated';
      case 'MoveToAllocationTeam': return 'avail-allocated';
      case 'In Repair': return 'avail-inrepair';
      case 'Retired': return 'avail-retired';
      case 'Reserved': return 'avail-reserved';
      default: return 'avail-default';
    }
  }
}
