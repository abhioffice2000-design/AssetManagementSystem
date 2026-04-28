import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AssetRequest, RequestType, RequestUrgency, RequestStatus, ApprovalStage } from '../models/request.model';
import { HeroService } from './hero.service';

declare var $: any;

@Injectable({ providedIn: 'root' })
export class RequestService {
  // private requests: AssetRequest[] = [];
  private requestsLoaded = false;

  constructor(private hs: HeroService) { }
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
  // Stores all requests from Getallrequest (separate from pending)
  private allRequestsList: AssetRequest[] = [];

  /**
   * Fetches pending asset requests from the Cordys SOAP service (GetallpendingrequestsForAssetManager).
   * Parses the XML/JSON response and maps each tuple into the AssetRequest model.
   */
  async fetchPendingRequestsFromService(approverId: string = 'usr_004'): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetallpendingrequestsForAssetManager xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Approver_id>${approverId}</Approver_id>
    </GetallpendingrequestsForAssetManager>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetallpendingrequestsForAssetManager response');
        this.requests = [];
        this.requestsLoaded = true;
        return [];
      }

      // Ensure tuples is always an array (single result comes as object)
      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      this.requests = tupleArray.map((tuple: any) => this.mapTupleToRequest(tuple));
      this.requestsLoaded = true;

      console.log(`Fetched ${this.requests.length} pending requests from service`);
      return [...this.requests];
    } catch (err) {
      console.error('Failed to fetch requests from GetallpendingrequestsForAssetManager:', err);
      throw err;
    }
  }

  /**
   * Fetches ALL asset requests from the Cordys SOAP service (GetRequestsForAssetManager).
   * Used for the "All Requests" tab — returns requests of every status managed by this user.
   */
  async fetchAllRequestsFromService(userId: string = 'usr_004'): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetRequestsForAssetManager xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <userId>${userId}</userId>
    </GetRequestsForAssetManager>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetRequestsForAssetManager response');
        this.allRequestsList = [];
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      this.allRequestsList = tupleArray.map((tuple: any) => this.mapTupleToRequest(tuple));

      console.log(`Fetched ${this.allRequestsList.length} total requests from GetRequestsForAssetManager`);
      return [...this.allRequestsList];
    } catch (err) {
      console.error('Failed to fetch requests from GetRequestsForAssetManager:', err);
      throw err;
    }
  }

  /**
   * Fetches pending confirmation requests for the Asset Manager
   * from the GetallpendingrequestsForAssetManagerConfirmation SOAP service.
   * Response structure: tuple > old > t_request_approvals
   *   (which contains nested t_asset_requests, m_assets, m_users, m_asset_types)
   */
  async fetchConfirmationRequestsFromService(approverId: string = 'usr_004'): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetallpendingrequestsForAssetManagerConfirmation xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Approver_id>${approverId}</Approver_id>
    </GetallpendingrequestsForAssetManagerConfirmation>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetallpendingrequestsForAssetManagerConfirmation response');
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];
      const result = tupleArray.map((tuple: any) => this.mapConfirmationTupleToRequest(tuple));

      console.log(`Fetched ${result.length} confirmation requests from service`);
      return result;
    } catch (err) {
      console.error('Failed to fetch from GetallpendingrequestsForAssetManagerConfirmation:', err);
      throw err;
    }
  }
  async fetchPendingReturnApprovalsFromService(approverId: string = 'usr_004'): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetPendingReturnApprovalsForManager xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Approver_id>${approverId}</Approver_id>
    </GetPendingReturnApprovalsForManager>
</SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetPendingReturnApprovalsForManager response');
        return [];
      }
      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];
      return tupleArray.map((tuple: any) => this.mapReturnTupleToRequest(tuple));
    } catch (err) {
      console.error('Failed to fetch return approvals from GetPendingReturnApprovalsForManager:', err);
      throw err;
    }
  }

  async fetchPendingWarrantyApprovalsFromService(approverId: string = 'usr_004'): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <Getpendingextendwarrantyrequests xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Approver_id>${approverId}</Approver_id>
    </Getpendingextendwarrantyrequests>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetPendingWarrantyApprovalsForManager response');
        return [];
      }
      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];
      return tupleArray.map((tuple: any) => this.mapWarrantyTupleToRequest(tuple));
    } catch (err) {
      console.error('Failed to fetch warranty approvals from GetPendingWarrantyApprovalsForManager:', err);
      throw err;
    }
  }

  /**
   * Fetches the full object for a specific warranty extension request.
   * Based on USER provided SOAP request structure.
   */
  async getWarrantyRequestById(requestId: string): Promise<any> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetT_extend_asset_requestsObject xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Request_id>${requestId}</Request_id>
    </GetT_extend_asset_requestsObject>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      // Explicitly path to the object to avoid mapping errors
      const obj = this.hs.xmltojson(response, 't_extend_asset_requests');
      return (Array.isArray(obj) ? obj[0] : obj) || null;
    } catch (err) {
      console.error('Failed to fetch warranty request object:', err);
      return null;
    }
  }

  /**
   * Updates an existing warranty extension approval record.
   * Uses UpdateT_extend_request_approvals SOAP service.
   */
  async updateWarrantyRequestApproval(approvalId: string, status: string, remarks: string, temp1?: string): Promise<any> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <UpdateT_extend_request_approvals xmlns="http://schemas.cordys.com/AMS_Database_Metadata" reply="yes" commandUpdate="no" preserveSpace="no" batchUpdate="no">
      <tuple>
        <old>
          <t_extend_request_approvals qConstraint="0">
            <approval_id>${approvalId}</approval_id>
          </t_extend_request_approvals>
        </old>
        <new>
          <t_extend_request_approvals qAccess="0" qConstraint="0" qInit="0" qValues="">
            <status>${status}</status>
            <remarks>${remarks}</remarks>
            <action_date>${new Date().toISOString()}</action_date>
            <temp1>${temp1 || ''}</temp1>
          </t_extend_request_approvals>
        </new>
      </tuple>
    </UpdateT_extend_request_approvals>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      return await this.hs.ajax(null, null, {}, soapRequest);
    } catch (err) {
      console.error('Failed to update warranty request approval:', err);
      throw err;
    }
  }

  /**
   * Creates a new warranty extension approval record for the next stage.
   * Uses UpdateT_extend_request_approvals SOAP service.
   */
  async createNewWarrantyApprovalEntry(requestId: string, approverId: string, role: string, remarks: string, assetId: string): Promise<any> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <UpdateT_extend_request_approvals xmlns="http://schemas.cordys.com/AMS_Database_Metadata" reply="yes" commandUpdate="no" preserveSpace="no" batchUpdate="no">
      <tuple>
        <new>
          <t_extend_request_approvals qAccess="0" qConstraint="0" qInit="0" qValues="">
            <request_id>${requestId}</request_id>
            <approver_id>${approverId}</approver_id>
            <role>${role}</role>
            <status>Pending</status>
            <remarks>${remarks}</remarks>
            <action_date>${new Date().toISOString()}</action_date>
            <temp1>${assetId}</temp1>
          </t_extend_request_approvals>
        </new>
      </tuple>
    </UpdateT_extend_request_approvals>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      return await this.hs.ajax(null, null, {}, soapRequest);
    } catch (err) {
      console.error('Failed to create new warranty approval entry:', err);
      throw err;
    }
  }

  /**
   * Specialized mapping for warranty requests (t_extend_asset_requests).
   */
  private mapWarrantyTupleToRequest(tuple: any): AssetRequest {
    const parent = tuple?.old || tuple;
    const approvalData = parent?.t_extend_request_approvals || parent;

    // Attempt to find the request data at different nesting levels
    const reqData = approvalData?.t_extend_asset_requests || parent?.t_extend_asset_requests || (parent.request_id ? parent : {});
    const userInfo = parent?.m_users || approvalData?.m_users || reqData?.m_users || {};
    const assetInfo = parent?.m_assets || approvalData?.m_assets || reqData?.m_assets || {};

    // Robust mapping: Prioritize Temp tags from t_extend_asset_requests as they are always present upon submission
    const assetName = this.getNullableValue(reqData?.temp1 || assetInfo?.asset_name || assetInfo?.name) || 'Unknown Asset';
    const serialNumber = this.getNullableValue(reqData?.temp2 || assetInfo?.serial_number) || 'N/A';
    const expiryDate = this.getNullableValue(reqData?.temp3 || assetInfo?.warranty_expiry || assetInfo?.warrantyExpiry) || 'N/A';
    const assetId = this.getNullableValue(reqData?.asset_id || assetInfo?.asset_id || reqData?.asset_type) || 'N/A';

    const status = this.mapToStatus(approvalData?.status || reqData?.status || '');
    const currentStage = ApprovalStage.ASSET_MANAGER;

    return {
      taskid: tuple?.old.t_extend_asset_requests.t_extend_request_approvals.temp1 || '',
      document: this.getNullableValue(reqData?.temp2) || '',
      approvalId: tuple?.old.t_extend_asset_requests.t_extend_request_approvals.approval_id || '',
      id: reqData?.request_id || '',
      requestNumber: reqData?.request_id || '',
      requesterId: reqData?.user_id || userInfo?.user_id || '',
      requesterName: userInfo?.name || '',
      requesterEmail: userInfo?.email || '',
      requesterDepartment: this.getNullableValue(userInfo?.department) || '',
      requesterTeam: this.getNullableValue(userInfo?.team) || '',
      assetType: this.normalizeAssetType(assetInfo?.asset_type || 'Hardware'),
      category: 'Warranty extension',
      subCategory: assetName,
      assetName: assetName,
      assignedAssetId: assetId,
      assignedSerial: serialNumber,
      assignedWarrantyExpiry: expiryDate,
      justification: reqData?.reason || '',
      urgency: this.mapToUrgency(reqData?.urgency || 'Medium'),
      status: status,
      currentStage: currentStage,
      hasEmailApproval: false,
      requestDate: reqData?.created_at || '',
      lastUpdated: reqData?.created_at || '',
      requestType: RequestType.EXTEND_WARRANTY,
      approvalChain: [
        {
          stage: ApprovalStage.ASSET_MANAGER,
          action: (status === RequestStatus.PENDING) ? 'Pending' : 'Approved',
          approverId: approvalData?.approver_id,
          comments: approvalData?.remarks
        }
      ],
      comments: [],
      requesterStatus: this.getNullableValue(userInfo?.status),
      requesterProject: this.getNullableValue(userInfo?.project_id),
      requesterRole: this.getNullableValue(userInfo?.role_id),
      requesterProjectName: this.getNullableValue(userInfo?.project_name || userInfo?.m_projects?.project_name),
      requesterRoleName: this.getNullableValue(userInfo?.role_name || userInfo?.m_roles?.role_name)
    };
  }


  /**
   * Maps a single tuple from the Confirmation SOAP response to AssetRequest.
   * Structure: tuple > old > t_request_approvals
   *   t_request_approvals.t_asset_requests  — the original asset request row
   *   t_request_approvals.m_assets          — the assigned asset details
   *   t_request_approvals.m_users           — the requester's user record
   *   t_request_approvals.m_asset_types     — the asset type metadata
   *   t_request_approvals.approval_id / status / remarks / temp1 etc. — approval record fields
   */
  private mapConfirmationTupleToRequest(tuple: any): AssetRequest {
    const approval = tuple?.old?.t_request_approvals || tuple?.t_request_approvals || {};
    const reqData = approval?.t_asset_requests || {};
    const assetData = approval?.m_assets || {};
    const userInfo = approval?.m_users || {};
    const typeInfo = approval?.m_asset_types || {};

    const urgency = this.mapToUrgency(reqData?.urgency || '');
    const status = this.mapToStatus(approval?.status || reqData?.status || '');
    const requestType = this.mapToRequestType(reqData?.asset_type || typeInfo?.type_name || '');
    const currentStage = ApprovalStage.ASSET_MANAGER;

    const hasEmailApproval = reqData?.email_approval === 'true' || reqData?.email_approval === true;
    const requestDate = reqData?.created_at || approval?.action_date || '';

    return {
      approvalId: this.getNullableValue(approval?.approval_id) || '',
      taskid: this.getNullableValue(approval?.temp2) || '',
      id: reqData?.request_id || approval?.request_id || '',
      requestNumber: reqData?.request_id || approval?.request_id || '',
      requesterId: reqData?.user_id || userInfo?.user_id || '',
      requesterName: userInfo?.name || '',
      requesterEmail: userInfo?.email || '',
      requesterDepartment: this.getNullableValue(userInfo?.department) || '',
      requesterTeam: this.getNullableValue(userInfo?.team) || '',
      assetType: typeInfo?.type_name || reqData?.asset_type || '',
      category: typeInfo?.type_name || reqData?.asset_type || '',
      subCategory: this.getNullableValue(assetData?.sub_category_id),
      justification: reqData?.reason || '',
      urgency,
      status: (status === RequestStatus.PENDING) ? RequestStatus.APPROVED : status,
      currentStage,
      hasEmailApproval,
      emailApprovalDoc: hasEmailApproval ? this.getNullableValue(reqData?.document) : undefined,
      document: this.getNullableValue(reqData?.document),
      requestDate,
      lastUpdated: approval?.action_date || requestDate,
      requestType,
      // Assigned asset details
      assignedAssetId: assetData?.asset_id || this.getNullableValue(approval?.temp1) || '',
      assignedTypeId: assetData?.type_id || '',
      assignedSubCategoryId: assetData?.sub_category_id || '',
      assignedSerial: this.getNullableValue(assetData?.serial_number) || '',
      assignedPurchaseDate: this.getNullableValue(assetData?.purchase_date) || '',
      assignedWarrantyExpiry: this.getNullableValue(assetData?.warranty_expiry) || '',
      // Extra display fields
      assetName: assetData?.asset_name || '',
      approvalChain: [
        { stage: ApprovalStage.TEAM_LEAD, action: 'Approved' },
        { stage: ApprovalStage.ASSET_MANAGER, action: 'Approved' },
        { stage: ApprovalStage.ALLOCATION, action: 'Approved' }
      ],
      comments: [],
      requesterStatus: this.getNullableValue(userInfo?.status),
      requesterProject: this.getNullableValue(userInfo?.project_id),
      requesterRole: this.getNullableValue(userInfo?.role_id),
      requesterProjectName: this.getNullableValue(userInfo?.project_name || userInfo?.m_projects?.project_name),
      requesterRoleName: this.getNullableValue(userInfo?.role_name || userInfo?.m_roles?.role_name),
      teamLeadJustification: this.getNullableValue(approval?.reason || approval?.remarks || approval?.temp2)
    };
  }

  /**
   * Returns the stored all-requests list.
   */
  getAllRequests(): AssetRequest[] {
    return [...this.allRequestsList];
  }

  /**
   * Returns stats computed from all requests (not just pending).
   */
  getAllRequestStats(customList?: AssetRequest[]) {
    const list = customList || (this.allRequestsList.length > 0 ? this.allRequestsList : this.requests);
    return {
      total: list.length,
      pending: list.filter(r => r.status === RequestStatus.PENDING).length,
      approved: list.filter(r => r.status === RequestStatus.APPROVED).length,
      rejected: list.filter(r => r.status === RequestStatus.REJECTED).length,
      completed: list.filter(r => r.status === RequestStatus.COMPLETED).length,
      inProgress: list.filter(r => r.status === RequestStatus.IN_PROGRESS).length
    };
  }

  /**
   * Fetches the real-time progress/approval stages for a request from Cordys.
   * Uses the GetRequestProgressForEmployee SOAP request.
   */
  async getRequestProgress(requestId: string): Promise<any[]> {
    // Normalize ID to lowercase for the backend service (e.g., AR_072 -> ar_072)
    const normalizedId = requestId.toLowerCase();

    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetRequestProgressForEmployee xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <requestId>${normalizedId}</requestId>
    </GetRequestProgressForEmployee>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const data = this.hs.xmltojson(response, 'tuple');

      if (!data) return [];
      const tupleArray = Array.isArray(data) ? data : [data];

      return tupleArray.map((tuple: any) => {
        const approvalData = tuple?.old?.t_request_approvals || tuple?.t_request_approvals || tuple;
        return {
          stage: approvalData?.role || approvalData?.temp1 || 'Unknown Role/Stage',
          status: approvalData?.status || 'Pending',
          approverId: approvalData?.approver_id,
          approverName: approvalData?.m_users?.name || approvalData?.approver_name || 'Assigned Approver',
          timestamp: approvalData?.created_at,
          comments: approvalData?.temp2 // Assuming temp2 stores comments in t_request_approvals
        };
      });
    } catch (err) {
      console.error('Error fetching request progress:', err);
      return [];
    }
  }

  /**
   * Fetches specific confirmation details (task_id, asset_id) dynamically for the employee confirmation step.
   * This retrieves the latest approval record where the task was assigned to the employee.
   */
  async getEmployeeConfirmationDetails(requestId: string): Promise<{ taskId: string, assetId: string }> {
    const normalizedId = requestId.toLowerCase();

    try {
      const soapRequestProgress = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetRequestProgressForEmployee xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <requestId>${normalizedId}</requestId>
    </GetRequestProgressForEmployee>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

      const response = await this.hs.ajax(null, null, {}, soapRequestProgress);
      const data = this.hs.xmltojson(response, 'tuple');

      let taskId = '';
      let assetId = '';

      if (data) {
        const tupleArray = Array.isArray(data) ? data : [data];
        console.log("tupleArray Progress Data JSON:", JSON.stringify(tupleArray));

        // Helper to recursively search for keys in the object
        const findValue = (obj: any, keys: string[]): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          for (const k of Object.keys(obj)) {
            if (keys.includes(k.toLowerCase())) {
              const val = obj[k];
              if (val && typeof val !== 'object' && String(val).trim() !== '' && String(val) !== 'null' && String(val) !== 'undefined') {
                return String(val);
              }
              if (typeof val === 'object' && val['#text']) {
                return String(val['#text']);
              }
            }
            const nested = findValue(obj[k], keys);
            if (nested) return nested;
          }
          return null;
        };

        // Scan array backwards to get the most recent task/asset IDs
        for (let i = tupleArray.length - 1; i >= 0; i--) {
          const tuple = tupleArray[i];
          if (!assetId) {
            const foundAsset = findValue(tuple, ['temp1', 'asset_id', 'assetid']);
            if (foundAsset) assetId = foundAsset;
          }
          if (!taskId) {
            const foundTask = findValue(tuple, ['temp2', 'taskid', 'task_id', 'instance_id']);
            if (foundTask) taskId = foundTask;
          }
          if (assetId && taskId) break;
        }
      }

      // Fallback to fetch main request
      if (!assetId) {
        const soapRequestMain = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetT_asset_requestsObject xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <request_id>${normalizedId}</request_id>
    </GetT_asset_requestsObject>
  </SOAP:Body>
</SOAP:Envelope>`.trim();
        try {
          const resMain = await this.hs.ajax(null, null, {}, soapRequestMain);
          const reqObj = this.hs.xmltojson(resMain, 'old') || this.hs.xmltojson(resMain, 't_asset_requests');
          const findValue = (obj: any, keys: string[]): string | null => {
            if (!obj || typeof obj !== 'object') return null;
            for (const k of Object.keys(obj)) {
              if (keys.includes(k.toLowerCase())) {
                const val = obj[k];
                if (val && typeof val !== 'object' && String(val).trim() !== '' && String(val) !== 'null') return String(val);
                if (typeof val === 'object' && val['#text']) return String(val['#text']);
              }
              const nested = findValue(obj[k], keys);
              if (nested) return nested;
            }
            return null;
          };
          const found = findValue(reqObj, ['asset_id', 'assetid']);
          if (found) assetId = found;
        } catch (e) { }
      }

      return { taskId, assetId };
    } catch (err) {
      console.error('Error fetching confirmation details:', err);
      return { taskId: '', assetId: '' };
    }
  }

  /**
   * Fetches all asset requests for the currently logged-in user from Cordys.
   * Uses the getAllRequestsBasedOnLoggedInUser SOAP service.
   */
  async getAllRequestsBasedOnLoggedInUser(userId: string): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetAllRequestsBasedOnLoggedInUser  xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <userId>${userId}</userId>
    </GetAllRequestsBasedOnLoggedInUser >
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      let tuples = this.hs.xmltojson(response, 'tuple') || this.hs.xmltojson(response, 't_asset_requests');

      if (!tuples) {
        console.warn('[RequestService] No data found in getAllRequestsBasedOnLoggedInUser response');
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];
      console.log(`[RequestService] getAllRequestsBasedOnLoggedInUser returned ${tupleArray.length} record(s)`);
      return tupleArray.map((tuple: any) => this.mapTupleToRequest(tuple));
    } catch (err) {
      console.error('[RequestService] Failed to fetch from getAllRequestsBasedOnLoggedInUser:', err);
      return [];
    }
  }

  /**
   * Fetches all requests for a specific employee from Cordys.
   * Uses the Getallrequest SOAP service and filters the result by user ID.
   */
  async getRequestsByUserIdFromCordys(userId: string): Promise<AssetRequest[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <Getallrequest xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      let tuples = this.hs.xmltojson(response, 'tuple') || this.hs.xmltojson(response, 't_asset_requests');

      if (!tuples) {
        console.warn('No requests found for user in Getallrequest response');
        return [];
      }
      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      return tupleArray
        .map((tuple: any) => this.mapTupleToRequest(tuple))
        .filter((req: AssetRequest) => req.requesterId === userId);
    } catch (err) {
      console.error('Failed to fetch employee requests from Cordys:', err);
      return [];
    }
  }

  /**
   * Maps a single tuple from the SOAP response to the AssetRequest interface.
   * Response structure: tuple > old > t_asset_requests
   */
  public mapTupleToRequest(tuple: any): AssetRequest {
    const parent = tuple?.old || tuple;
    const reqData = parent?.t_asset_requests || parent;

    // Extract joined metadata from peer objects at the tuple level
    const userInfo = parent?.m_users || reqData?.m_users || {};
    const assetInfo = parent?.m_assets || reqData?.m_assets || {};
    const subCatInfo = parent?.m_asset_subcategories || reqData?.m_asset_subcategories || {};
    const typeInfo = parent?.m_asset_types || reqData?.m_asset_types || {};

    // Map urgency string to enum
    const urgency = this.mapToUrgency(reqData?.urgency || '');

    // Map status string to enum
    const status = this.mapToStatus(reqData?.status || '');

    // Determine request type from asset_type or default
    const requestType = this.mapToRequestType(reqData?.request_type || reqData?.asset_type || '');

    // Determine current approval stage based on status
    const currentStage = this.determineStage(status);

    // Parse email approval
    const hasEmailApproval = reqData?.email_approval === 'true' || reqData?.email_approval === true;

    // Format date
    const createdAt = reqData?.created_at || '';
    const requestDate = createdAt;

    return {
      taskid: parent?.t_request_approvals?.temp2 || reqData?.t_request_approvals?.temp2 || '',
      approvalId: parent?.t_request_approvals?.approval_id || reqData?.t_request_approvals?.approval_id || '',
      id: reqData?.request_id || '',
      requestNumber: reqData?.request_id || '',
      requesterId: reqData?.user_id || userInfo?.user_id || '',
      requesterName: userInfo?.name || '',
      requesterEmail: userInfo?.email || '',
      requesterDepartment: this.getNullableValue(userInfo?.department) || '',
      requesterTeam: this.getNullableValue(userInfo?.team) || '',
      assetType: this.normalizeAssetType(typeInfo?.type_name || reqData?.asset_type || reqData?.request_type || ''),
      category: this.normalizeCategory(
        this.getNullableValue(
          assetInfo?.asset_id ||
          parent?.t_request_approvals?.temp1 ||
          assetInfo?.asset_name ||
          subCatInfo?.name ||
          typeInfo?.type_name ||
          reqData?.asset_name ||
          reqData?.temp1 ||
          ''
        )
      ),
      subCategory: this.getNullableValue(subCatInfo?.name || reqData?.sub_category || ''),
      justification: reqData?.reason || '',
      urgency: urgency,
      status: (status === RequestStatus.PENDING && currentStage !== ApprovalStage.TEAM_LEAD) ? RequestStatus.APPROVED : status,
      currentStage: currentStage,
      hasEmailApproval: hasEmailApproval,
      emailApprovalDoc: hasEmailApproval ? this.getNullableValue(reqData?.document) : undefined,
      document: (() => {
        const t2 = this.getNullableValue(reqData?.temp2) || '';
        const d1 = this.getNullableValue(reqData?.document) || '';
        if (t2.includes('|') || t2.startsWith('data:')) return t2;
        if (t2 && t2 !== 'null') return t2;
        if (d1 && d1 !== 'ATTACHED' && d1 !== 'null' && !d1.includes('BPM')) return d1;
        return '';
      })(),
      requestDate: requestDate,
      lastUpdated: requestDate,
      requestType: requestType,
      approvalChain: hasEmailApproval ? [
        {
          stage: ApprovalStage.ASSET_MANAGER,
          action: (currentStage === ApprovalStage.ASSET_MANAGER) ? 'Pending' : (status === RequestStatus.APPROVED || status === RequestStatus.COMPLETED ? 'Approved' : 'Pending')
        },
        {
          stage: ApprovalStage.ALLOCATION,
          action: (currentStage === ApprovalStage.ALLOCATION) ? 'Pending' : 'Pending'
        }
      ] : [
        {
          stage: ApprovalStage.TEAM_LEAD,
          action: (currentStage !== ApprovalStage.TEAM_LEAD) ? 'Approved' : 'Pending',
          approverName: 'Team Lead'
        },
        {
          stage: ApprovalStage.ASSET_MANAGER,
          action: (currentStage === ApprovalStage.ASSET_MANAGER) ? 'Pending' : (status === RequestStatus.APPROVED || status === RequestStatus.COMPLETED ? 'Approved' : 'Pending')
        },
        {
          stage: ApprovalStage.ALLOCATION,
          action: (currentStage === ApprovalStage.ALLOCATION) ? 'Pending' : 'Pending'
        }
      ],
      comments: [],
      allocatedAssetId: reqData?.temp1 || reqData?.temp2 || reqData?.temp3 || '',
      assignedAssetId: assetInfo?.asset_id || reqData?.asset_id || '',
      // Requester details from nested m_users
      requesterStatus: this.getNullableValue(userInfo?.status),
      requesterProject: this.getNullableValue(userInfo?.project_id),
      requesterRole: this.getNullableValue(userInfo?.role_id),
      requesterProjectName: this.getNullableValue(userInfo?.project_name || userInfo?.m_projects?.project_name),
      requesterRoleName: this.getNullableValue(userInfo?.role_name || userInfo?.m_roles?.role_name),
      teamLeadJustification: this.getNullableValue(reqData?.t_request_approvals?.reason || reqData?.t_request_approvals?.remarks || reqData?.t_request_approvals?.temp2)
    };
  }

  /**
   * Specialized mapping for return requests (t_asset_returns).
   */
  private mapReturnTupleToRequest(tuple: any): AssetRequest {
    const data = tuple?.old?.t_asset_returns || tuple?.t_asset_returns || tuple;
    const userInfo = data?.m_users || {};
    const approvalData = data?.t_asset_return_approvals || {};

    const assetInfo = data?.m_assets || tuple?.old?.m_assets || tuple?.m_assets || {};

    const status = this.mapToStatus(data?.status || '');
    const currentStage = ApprovalStage.ASSET_MANAGER; // Assuming it's at this stage if fetched by manager

    return {
      taskid: approvalData.temp2,
      returnapprovalId: approvalData?.return_approval_id || '',
      id: data?.return_id || '',
      requestNumber: data?.return_id || '',
      requesterId: data?.requested_by || userInfo?.user_id || '',
      requesterName: userInfo?.name || '',
      requesterEmail: userInfo?.email || '',
      requesterDepartment: this.getNullableValue(userInfo?.department) || '',
      requesterTeam: this.getNullableValue(userInfo?.team) || '',
      assetType: this.normalizeAssetType(assetInfo?.asset_type || 'Hardware'),
      category: this.normalizeCategory(this.getNullableValue(assetInfo?.asset_name || 'Asset Return')),
      subCategory: 'N/A',
      assetName: this.getNullableValue(assetInfo?.asset_name),
      assignedAssetId: this.getNullableValue(data?.asset_id || assetInfo?.asset_id),
      assignedSerial: this.getNullableValue(assetInfo?.serial_number),
      justification: data?.remarks || '',
      urgency: RequestUrgency.MEDIUM,
      status: (status === RequestStatus.PENDING) ? RequestStatus.APPROVED : status,
      currentStage: currentStage,
      hasEmailApproval: false,
      requestDate: data?.return_date || '',
      lastUpdated: data?.return_date || '',
      requestType: RequestType.RETURN_ASSET,
      approvalChain: [
        {
          stage: ApprovalStage.ASSET_MANAGER,
          action: 'Pending',
          approverId: approvalData?.approver_id,
          comments: approvalData?.remarks
        }
      ],
      comments: [],
      requesterStatus: this.getNullableValue(userInfo?.status),
      requesterProject: this.getNullableValue(userInfo?.project_id),
      requesterRole: this.getNullableValue(userInfo?.role_id)
    };
  }

  /**
   * Handles null/xsi:nil values from the SOAP response.
   */
  private getNullableValue(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && value !== null) {
      if (value['@nil'] === 'true' || value['@null'] === 'true') return undefined;
      return undefined;
    }
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return String(value);
  }

  private mapToUrgency(urgency: string): RequestUrgency {
    const normalized = urgency.toLowerCase();
    if (normalized.includes('critical')) return RequestUrgency.CRITICAL;
    if (normalized.includes('high')) return RequestUrgency.HIGH;
    if (normalized.includes('medium')) return RequestUrgency.MEDIUM;
    if (normalized.includes('low')) return RequestUrgency.LOW;
    return RequestUrgency.MEDIUM; // default
  }

  private mapToStatus(status: string): RequestStatus {
    const normalized = status.toLowerCase();
    if (normalized.includes('pending')) return RequestStatus.PENDING;
    if (normalized.includes('approved')) return RequestStatus.APPROVED;
    if (normalized.includes('rejected')) return RequestStatus.REJECTED;
    if (normalized.includes('progress')) return RequestStatus.IN_PROGRESS;
    if (normalized.includes('completed')) return RequestStatus.COMPLETED;
    if (normalized.includes('cancelled')) return RequestStatus.CANCELLED;
    if (normalized.includes('draft')) return RequestStatus.DRAFT;
    return RequestStatus.PENDING; // default
  }

  private mapToRequestType(type: string): RequestType {
    const normalized = type.toLowerCase();
    if (normalized.includes('return')) return RequestType.RETURN_ASSET;
    if (normalized.includes('warranty') || normalized.includes('extend')) return RequestType.EXTEND_WARRANTY;
    return RequestType.NEW_ASSET; // default
  }

  private determineStage(status: RequestStatus): ApprovalStage {
    switch (status) {
      case RequestStatus.PENDING: return ApprovalStage.ASSET_MANAGER;
      case RequestStatus.APPROVED: return ApprovalStage.ALLOCATION;
      case RequestStatus.COMPLETED: return ApprovalStage.COMPLETED;
      default: return ApprovalStage.TEAM_LEAD;
    }
  }

  private normalizeAssetType(type: string | undefined): string {
    if (!type) return 'N/A';
    const t = type.toLowerCase().trim();
    if (t === 'typ_01' || t === 'software' || t.includes('license') || t.includes('anti') || t.includes('security')) return 'Software';
    if (t === 'typ_02' || t === 'hardware' || t.includes('laptop') || t.includes('hard') || t.includes('comp')) return 'Hardware';
    if (t === 'typ_03' || t === 'network' || t.includes('wifi') || t.includes('router')) return 'Network';
    if (t === 'typ_04' || t === 'peripheral') return 'Peripheral';

    // Default: capitalize first letter
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  private normalizeCategory(value: string | undefined): string {
    if (!value) return 'Asset Detail';
    const v = value.toLowerCase().trim();
    const mappings: { [key: string]: string } = {
      'cat_001': 'Laptop',
      'cat_002': 'Software License',
      'cat_003': 'Monitor',
      'cat_004': 'Peripheral',
      'asset_001': 'Dell Latitude 5420',
      'asset_002': 'Adobe Creative Cloud',
      'typ_01': 'Software',
      'typ_02': 'Hardware',
      'typ_03': 'Network',
      'typ_04': 'Peripheral'
    };

    if (mappings[v]) return mappings[v];

    // If it's still a technical ID but not in list, return generic label
    if (v.startsWith('cat_') || v.startsWith('typ_') || v.startsWith('asset_')) return 'Asset Detail';

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  getRequests(): AssetRequest[] {
    return [...this.requests];
  }

  isLoaded(): boolean {
    return this.requestsLoaded;
  }

  getRequestById(id: string): AssetRequest | undefined {
    return this.requests.find(r => r.id === id);
  }

  getRequestsByUser(userId: string): AssetRequest[] {
    return this.requests.filter(r => r.requesterId === userId);
  }

  getRequestsByStatus(status: RequestStatus): AssetRequest[] {
    return this.requests.filter(r => r.status === status);
  }

  getRequestsByStage(stage: ApprovalStage): AssetRequest[] {
    return this.requests.filter(r => r.currentStage === stage);
  }

  getRequestsByType(type: RequestType): AssetRequest[] {
    return this.requests.filter(r => r.requestType === type);
  }

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

  createEntryForReturn(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_returns',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      throw err;
    });
  }

  createEntryForAssetApprovals(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_return_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      throw err;
    });
  }

  callBPMForReturn(request: any) {
    return this.hs.ajax(
      'AMS_Return_Approval',
      'http://schemas.cordys.com/default',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      throw err;
    });
  }

  updateReturnAssetStatus(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_return_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      throw err;
    });
  }

  completeTask(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_return_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      throw err;
    });
  }

  generateRequestNumber(type: RequestType): string {
    const prefix = type === RequestType.NEW_ASSET ? 'AR' : type === RequestType.EXTEND_WARRANTY ? 'EW' : 'RT';
    const year = new Date().getFullYear();
    const count = this.requests.filter(r => r.requestType === type).length + 1;
    return `${prefix}-${year}-${String(count).padStart(3, '0')}`;
  }

  submitNewRequestForm(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_requests',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }

  createEntryForTeamLead(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  updateEntryForTeamLead(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log('UpdateT_request_approvals response:', res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.error('UpdateT_request_approvals error:', err);
      throw err;
    })
  }

  callBPMForRequest(request: any) {
    this.hs.ajax(
      'AMS_Approval',
      'http://schemas.cordys.com/default',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  completeUserTask(request: any) {
    return this.hs.ajax(
      'PerformTaskAction',
      'http://schemas.cordys.com/notification/workflow/1.0',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  getAllPendingRequestsForParticularAssetManger(request: any) {
    return this.hs.ajax(
      'GetallpendingrequestsForAssetManager',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  updateAssetStatus(request: any) {
    return this.hs.ajax(
      'UpdateM_assets',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log('UpdateM_assets response:', res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.error('UpdateM_assets error:', err);
      throw err;
    })
  }
  getAllocationTeamMemberAccordingtoManager(request: any): any {
    return this.hs.ajax(
      'GetTeamAllocationMemberByAssetManager',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      { Approver_id: request }
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  createEntryForTeamAllocationMember(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  updateEntryForAssetManager(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }

  updateEntryForAllocationTeamMember(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  createNewEntryForAssetManagerConfirmation(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  createEntryForRequestor(request: any) {
    return this.hs.ajax(
      'UpdateT_request_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  updateEntryForAllocationTeamMemberAssetReturn(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_return_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  createNewEntryForAssetManagerConfirmationAssetReturn(request: any) {
    return this.hs.ajax(
      'UpdateT_asset_return_approvals',
      'http://schemas.cordys.com/AMS_Database_Metadata',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      return err;
    })
  }
  callBPMForwarrantyexpiry(request: any) {
    return this.hs.ajax(
      'AMS_warranty_expiry',
      'http://schemas.cordys.com/default',
      request
    ).then((res: any) => {
      console.log(res);
      return this.hs.xmltojson(res, 'tuple');
    }).catch((err: any) => {
      console.log(err);
      throw err;
    });
  }
}
