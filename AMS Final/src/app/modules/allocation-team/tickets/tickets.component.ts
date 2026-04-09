import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetService } from '../../../core/services/asset.service';
import { AssetRequest, RequestStatus, ApprovalStage } from '../../../core/models/request.model';
import { Asset } from '../../../core/models/asset.model';

export interface EnrichedTicket {
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

  constructor(
    private requestService: RequestService,
    private assetService: AssetService
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    const requests = this.requestService.getRequests();

    this.allTickets = requests.map(req => {
      const allocatedAsset: Asset | undefined = req.allocatedAssetId
        ? this.assetService.getAssetById(req.allocatedAssetId)
        : undefined;

      const teamLeadEntry = req.approvalChain.find(e => e.stage === ApprovalStage.TEAM_LEAD);
      const assetManagerEntry = req.approvalChain.find(e => e.stage === ApprovalStage.ASSET_MANAGER);

      return {
        ticketId: req.requestNumber,
        requestorName: req.requesterName,
        assetType: req.assetType,
        subCategory: req.subCategory || '—',
        assetName: allocatedAsset ? allocatedAsset.name : req.category,
        assetId: allocatedAsset ? allocatedAsset.assetTag : req.allocatedAssetId || '—',
        warrantyExpiry: allocatedAsset ? allocatedAsset.warrantyExpiry : '—',
        availabilityStatus: allocatedAsset ? allocatedAsset.status : '—',
        assignedDate: req.lastUpdated,
        assetManagerName: assetManagerEntry?.approverName || '—',
        teamLeadName: teamLeadEntry?.approverName || '—',
        status: req.status,
        rawRequest: req
      } as EnrichedTicket;
    });

    this.loading = false;
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
      case RequestStatus.PENDING:     return 'status-pending';
      case RequestStatus.APPROVED:    return 'status-approved';
      case RequestStatus.IN_PROGRESS: return 'status-inprogress';
      case RequestStatus.COMPLETED:   return 'status-completed';
      case RequestStatus.REJECTED:    return 'status-rejected';
      case RequestStatus.CANCELLED:   return 'status-cancelled';
      default:                        return 'status-default';
    }
  }

  allocate(ticket: EnrichedTicket): void {
    this.requestService.approveRequest(
      ticket.rawRequest.id,
      'USR003',
      'Allocation Team',
      'Asset allocated by allocation team.',
      ApprovalStage.ALLOCATION
    );
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
      case 'Available':  return 'avail-available';
      case 'Allocated':  return 'avail-allocated';
      case 'In Repair':  return 'avail-inrepair';
      case 'Retired':    return 'avail-retired';
      case 'Reserved':   return 'avail-reserved';
      default:           return 'avail-default';
    }
  }
}
