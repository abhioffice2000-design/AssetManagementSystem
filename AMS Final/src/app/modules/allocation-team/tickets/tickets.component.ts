import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetService } from '../../../core/services/asset.service';
import { AssetRequest, RequestStatus, ApprovalStage } from '../../../core/models/request.model';
import { HeroService } from 'src/app/core/services/hero.service';

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
  activeTab: 'unresolved' | 'resolved' = 'unresolved';
  loading = true;
  allTickets: EnrichedTicket[] = [];
  selectedTicket: EnrichedTicket | null = null;
  drawerOpen = false;
  assetManagerNameForThisUser: string = "";
  assetManagerIDForThisUser: string = "";

  constructor(
    private requestService: RequestService,
    private assetService: AssetService,
    private hs: HeroService
  ) { }

  async ngOnInit(): Promise<void> {      // ✅ made async
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || '{}');
    const userId = currentUser?.id ?? null;
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

    this.loadTickets();
  }

  async loadTickets(): Promise<void> {
    this.loading = true;
    const request = { Approver_id: 'usr_007' };

    try {
      const res = await this.hs.ajax(
        'GetallpendingrequestsForAllocationTeamMemberwithTeamLead',
        'http://schemas.cordys.com/AMS_Database_Metadata',
        request
      );

      console.log('Raw response:', res);
      const tuples = this.hs.xmltojson(res, 'tuple');
      console.log('Parsed tuples:', tuples);

      if (!tuples) {
        console.warn('No tuples found in response');
        this.allTickets = [];
      } else {
        const tupleArray: any[] = Array.isArray(tuples) ? tuples : [tuples];
        this.allTickets = tupleArray.map((t: any) => this.mapTupleToEnrichedTicket(t));
        console.log(`Loaded ${this.allTickets.length} tickets`);
      }
    } catch (err) {
      console.error('Failed to load allocation tickets:', err);
      this.allTickets = [];
    } finally {
      this.loading = false;
    }
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
    const approval = tuple?.old?.t_request_approvals ?? tuple?.t_request_approvals ?? tuple;
    const reqData = approval?.t_asset_requests ?? {};
    const assetData = approval?.m_assets ?? {};
    const userData = approval?.m_users ?? {};

    const statusStr = this.getVal(reqData?.status) ?? this.getVal(approval?.status) ?? 'Pending';
    const status = this.mapToStatus(statusStr);

    return {
      taskid: this.getVal(approval?.temp2) ?? '—',
      approvalid: this.getVal(approval?.approval_id) ?? '—',
      ticketId: this.getVal(reqData?.request_id) ?? this.getVal(approval?.request_id) ?? '—',
      requestorName: this.getVal(userData?.name) ?? '—',
      assetType: this.getVal(reqData?.asset_type) ?? '—',
      subCategory: this.getVal(assetData?.sub_category_id) ?? '—',
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

  setTab(tab: 'unresolved' | 'resolved'): void {
    this.activeTab = tab;
    this.drawerOpen = false;
    this.selectedTicket = null;
  }

  openDetails(ticket: EnrichedTicket): void {
    this.selectedTicket = ticket;
    this.drawerOpen = true;
  }

  closeDetails(): void {
    this.drawerOpen = false;
    this.selectedTicket = null;
  }

  get unresolvedTickets(): EnrichedTicket[] {
    return this.allTickets.filter(t =>
      t.status === RequestStatus.PENDING ||
      t.status === RequestStatus.APPROVED ||
      t.status === RequestStatus.IN_PROGRESS
    );
  }

  get resolvedTickets(): EnrichedTicket[] {
    return this.allTickets.filter(t =>
      t.status === RequestStatus.COMPLETED ||
      t.status === RequestStatus.REJECTED ||
      t.status === RequestStatus.CANCELLED
    );
  }

  get filteredTickets(): EnrichedTicket[] {
    return this.activeTab === 'unresolved' ? this.unresolvedTickets : this.resolvedTickets;
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
    debugger
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
            remarks: "Allocated to Requestor"
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
        }
        ,
        new: {
          m_assets: {
            status: "Allocated",
            temp1: ticket.rawRequest.requesterId

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

    // this.requestService.approveRequest(
    //   ticket.rawRequest.id,
    //   'USR003',
    //   'Allocation Team',
    //   'Asset allocated by allocation team.',
    //   ApprovalStage.ALLOCATION
    // );
    this.loadTickets();
  }

  reject(ticket: EnrichedTicket): void {
    this.requestService.rejectRequest(
      ticket.rawRequest.id,
      'USR003',
      'Allocation Team',
      'Ticket rejected by allocation team.',
      ApprovalStage.ALLOCATION
    );
    this.loadTickets();
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
