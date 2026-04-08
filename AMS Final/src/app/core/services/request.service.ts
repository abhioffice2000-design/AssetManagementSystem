import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AssetRequest, RequestType, RequestUrgency, RequestStatus, ApprovalStage, ApprovalEntry } from '../models/request.model';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private requests: AssetRequest[] = [
    {
      id: 'REQ001', requestNumber: 'AR-2024-001', requesterId: 'USR005', requesterName: 'Ananya Desai',
      requesterDepartment: 'Engineering', requesterTeam: 'Frontend', assetType: 'Hardware', category: 'Laptop',
      subCategory: 'Business', justification: 'Current laptop is outdated and unable to handle development workloads efficiently.',
      urgency: RequestUrgency.HIGH, status: RequestStatus.PENDING, currentStage: ApprovalStage.TEAM_LEAD,
      hasEmailApproval: false, requestDate: '2024-12-01', lastUpdated: '2024-12-01',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Pending' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: [{ id: 'C001', userId: 'USR005', userName: 'Ananya Desai', comment: 'Need a new laptop urgently for project deadlines', timestamp: '2024-12-01T10:00:00' }]
    },
    {
      id: 'REQ002', requestNumber: 'AR-2024-002', requesterId: 'USR006', requesterName: 'Vikram Singh',
      requesterDepartment: 'Engineering', requesterTeam: 'Backend', assetType: 'Hardware', category: 'Monitor',
      subCategory: '4K', justification: 'Dual monitor setup required for code review and debugging workflows.',
      urgency: RequestUrgency.MEDIUM, status: RequestStatus.APPROVED, currentStage: ApprovalStage.ALLOCATION,
      hasEmailApproval: false, requestDate: '2024-11-20', lastUpdated: '2024-11-25',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, approverId: 'USR008', approverName: 'Arjun Reddy', action: 'Approved', comments: 'Approved - justified need', timestamp: '2024-11-21T14:00:00' },
        { stage: ApprovalStage.ASSET_MANAGER, approverId: 'USR002', approverName: 'Rajesh Kumar', action: 'Approved', comments: 'Stock available, proceed', timestamp: '2024-11-23T10:00:00' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: [], assignedAllocationTeamId: 'USR003'
    },
    {
      id: 'REQ003', requestNumber: 'AR-2024-003', requesterId: 'USR007', requesterName: 'Meera Nair',
      requesterDepartment: 'Design', requesterTeam: 'UX', assetType: 'Software', category: 'Design Tools',
      subCategory: 'License', justification: 'Need Adobe Creative Cloud enterprise license for design work.',
      urgency: RequestUrgency.MEDIUM, status: RequestStatus.COMPLETED, currentStage: ApprovalStage.COMPLETED,
      hasEmailApproval: true, emailApprovalDoc: 'email_approval_meera.pdf', requestDate: '2024-10-15', lastUpdated: '2024-10-20',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Skipped', comments: 'Email approval uploaded' },
        { stage: ApprovalStage.ASSET_MANAGER, approverId: 'USR002', approverName: 'Rajesh Kumar', action: 'Approved', timestamp: '2024-10-17T09:00:00' },
        { stage: ApprovalStage.ALLOCATION, approverId: 'USR003', approverName: 'Priya Sharma', action: 'Approved', timestamp: '2024-10-20T11:00:00' }
      ],
      comments: [], allocatedAssetId: 'AST014'
    },
    {
      id: 'REQ004', requestNumber: 'AR-2024-004', requesterId: 'USR005', requesterName: 'Ananya Desai',
      requesterDepartment: 'Engineering', requesterTeam: 'Frontend', assetType: 'Hardware', category: 'Keyboard',
      justification: 'Ergonomic keyboard needed for better productivity.',
      urgency: RequestUrgency.LOW, status: RequestStatus.REJECTED, currentStage: ApprovalStage.TEAM_LEAD,
      hasEmailApproval: false, requestDate: '2024-09-05', lastUpdated: '2024-09-07',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, approverId: 'USR004', approverName: 'Suresh Patel', action: 'Rejected', comments: 'Standard keyboard already provided. Not eligible for upgrade at this time.', timestamp: '2024-09-07T16:00:00' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: []
    },
    {
      id: 'REQ005', requestNumber: 'EW-2024-001', requesterId: 'USR005', requesterName: 'Ananya Desai',
      requesterDepartment: 'Engineering', requesterTeam: 'Frontend', assetType: 'Hardware', category: 'Laptop',
      justification: 'Warranty expiring in 3 months, need to extend for continued support coverage.',
      urgency: RequestUrgency.MEDIUM, status: RequestStatus.PENDING, currentStage: ApprovalStage.ASSET_MANAGER,
      hasEmailApproval: false, requestDate: '2024-12-10', lastUpdated: '2024-12-11',
      requestType: RequestType.EXTEND_WARRANTY,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, approverId: 'USR004', approverName: 'Suresh Patel', action: 'Approved', comments: 'Valid request, warranty extension recommended', timestamp: '2024-12-11T09:30:00' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: []
    },
    {
      id: 'REQ006', requestNumber: 'RT-2024-001', requesterId: 'USR006', requesterName: 'Vikram Singh',
      requesterDepartment: 'Engineering', requesterTeam: 'Backend', assetType: 'Peripheral', category: 'Mouse',
      justification: 'Returning wireless mouse as I prefer the trackpad.',
      urgency: RequestUrgency.LOW, status: RequestStatus.IN_PROGRESS, currentStage: ApprovalStage.ALLOCATION,
      hasEmailApproval: false, requestDate: '2024-11-28', lastUpdated: '2024-12-02',
      requestType: RequestType.RETURN_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, approverId: 'USR008', approverName: 'Arjun Reddy', action: 'Approved', timestamp: '2024-11-29T14:00:00' },
        { stage: ApprovalStage.ASSET_MANAGER, approverId: 'USR002', approverName: 'Rajesh Kumar', action: 'Approved', timestamp: '2024-12-01T10:00:00' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: [], assignedAllocationTeamId: 'USR003'
    },
    {
      id: 'REQ007', requestNumber: 'AR-2024-005', requesterId: 'USR005', requesterName: 'Ananya Desai',
      requesterDepartment: 'Engineering', requesterTeam: 'Frontend', assetType: 'Software', category: 'IDE License',
      justification: 'Need an IntelliJ IDEA Ultimate license for full-stack framework development.',
      urgency: RequestUrgency.HIGH, status: RequestStatus.PENDING, currentStage: ApprovalStage.TEAM_LEAD,
      hasEmailApproval: false, requestDate: '2024-12-15', lastUpdated: '2024-12-15',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Pending' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: []
    },
    {
      id: 'REQ008', requestNumber: 'AR-2024-006', requesterId: 'USR006', requesterName: 'Vikram Singh',
      requesterDepartment: 'Engineering', requesterTeam: 'Frontend', assetType: 'Peripheral', category: 'Headphones',
      justification: 'Noise cancelling headphones for better focus in open office.',
      urgency: RequestUrgency.LOW, status: RequestStatus.PENDING, currentStage: ApprovalStage.TEAM_LEAD,
      hasEmailApproval: false, requestDate: '2024-12-16', lastUpdated: '2024-12-16',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Pending' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: []
    },
    {
      id: 'REQ009', requestNumber: 'AR-2024-007', requesterId: 'USR005', requesterName: 'Ananya Desai',
      requesterDepartment: 'Engineering', requesterTeam: 'Frontend', assetType: 'Software', category: 'Design Software',
      justification: 'Figma Pro license for UI/UX testing and prototyping.',
      urgency: RequestUrgency.MEDIUM, status: RequestStatus.PENDING, currentStage: ApprovalStage.TEAM_LEAD,
      hasEmailApproval: false, requestDate: '2024-12-17', lastUpdated: '2024-12-17',
      requestType: RequestType.NEW_ASSET,
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Pending' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Pending' },
        { stage: ApprovalStage.ALLOCATION, action: 'Pending' }
      ],
      comments: []
    }
  ];

  getRequests(): AssetRequest[] { return [...this.requests]; }

  getRequestById(id: string): AssetRequest | undefined { return this.requests.find(r => r.id === id); }

  getRequestsByUser(userId: string): AssetRequest[] { return this.requests.filter(r => r.requesterId === userId); }

  getRequestsByStatus(status: RequestStatus): AssetRequest[] { return this.requests.filter(r => r.status === status); }

  getRequestsByStage(stage: ApprovalStage): AssetRequest[] { return this.requests.filter(r => r.currentStage === stage); }

  getRequestsByType(type: RequestType): AssetRequest[] { return this.requests.filter(r => r.requestType === type); }

  getPendingApprovals(approverId: string, stage: ApprovalStage): AssetRequest[] {
    return this.requests.filter(r =>
      r.status === RequestStatus.PENDING &&
      r.currentStage === stage
    );
  }

  getAllocationTickets(assignedTo?: string): AssetRequest[] {
    return this.requests.filter(r =>
      r.currentStage === ApprovalStage.ALLOCATION &&
      (r.status === RequestStatus.APPROVED || r.status === RequestStatus.IN_PROGRESS)
    );
  }

  addRequest(request: AssetRequest): void {
    this.requests.push(request);
  }

  approveRequest(requestId: string, approverId: string, approverName: string, comments: string, stage: ApprovalStage): void {
    const req = this.requests.find(r => r.id === requestId);
    if (!req) return;

    const entry = req.approvalChain.find(a => a.stage === stage);
    if (entry) {
      entry.approverId = approverId;
      entry.approverName = approverName;
      entry.action = 'Approved';
      entry.comments = comments;
      entry.timestamp = new Date().toISOString();
    }

    if (stage === ApprovalStage.TEAM_LEAD) {
      req.currentStage = ApprovalStage.ASSET_MANAGER;
    } else if (stage === ApprovalStage.ASSET_MANAGER) {
      req.currentStage = ApprovalStage.ALLOCATION;
      req.status = RequestStatus.APPROVED;
    } else if (stage === ApprovalStage.ALLOCATION) {
      req.currentStage = ApprovalStage.COMPLETED;
      req.status = RequestStatus.COMPLETED;
    }
    req.lastUpdated = new Date().toISOString();
  }

  rejectRequest(requestId: string, approverId: string, approverName: string, comments: string, stage: ApprovalStage): void {
    const req = this.requests.find(r => r.id === requestId);
    if (!req) return;

    const entry = req.approvalChain.find(a => a.stage === stage);
    if (entry) {
      entry.approverId = approverId;
      entry.approverName = approverName;
      entry.action = 'Rejected';
      entry.comments = comments;
      entry.timestamp = new Date().toISOString();
    }
    req.status = RequestStatus.REJECTED;
    req.lastUpdated = new Date().toISOString();
  }

  getRequestStats() {
    return {
      total: this.requests.length,
      pending: this.requests.filter(r => r.status === RequestStatus.PENDING).length,
      approved: this.requests.filter(r => r.status === RequestStatus.APPROVED).length,
      rejected: this.requests.filter(r => r.status === RequestStatus.REJECTED).length,
      completed: this.requests.filter(r => r.status === RequestStatus.COMPLETED).length,
      inProgress: this.requests.filter(r => r.status === RequestStatus.IN_PROGRESS).length
    };
  }

  generateRequestNumber(type: RequestType): string {
    const prefix = type === RequestType.NEW_ASSET ? 'AR' : type === RequestType.EXTEND_WARRANTY ? 'EW' : 'RT';
    const year = new Date().getFullYear();
    const count = this.requests.filter(r => r.requestType === type).length + 1;
    return `${prefix}-${year}-${String(count).padStart(3, '0')}`;
  }
}
