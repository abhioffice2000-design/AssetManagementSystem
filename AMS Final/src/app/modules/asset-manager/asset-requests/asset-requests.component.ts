import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest, ApprovalStage, RequestStatus, RequestUrgency, RequestType } from '../../../core/models/request.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';
import { HeroService } from '../../../core/services/hero.service';



@Component({
  selector: 'app-asset-requests',
  templateUrl: './asset-requests.component.html',
  styleUrls: ['./asset-requests.component.scss']
})
export class AssetRequestsComponent implements OnInit {
  allRequests: AssetRequest[] = [];
  filteredRequests: AssetRequest[] = [];
  pendingRequests: AssetRequest[] = [];
  // activeTab: 'pending' | 'all' | 'return' = 'pending';
  confirmationRequests: AssetRequest[] = [];
  filteredConfirmationRequests: AssetRequest[] = [];
  confirmationSearchTerm = '';
  activeTab: 'pending' | 'all' | 'confirmation' | 'return' = 'pending';
  searchTerm = '';
  selectedStatus = '';
  selectedUrgency = '';
  statuses = Object.values(RequestStatus);
  urgencies = Object.values(RequestUrgency);
  RequestStatus = RequestStatus; // Add this to use in template
  availableAssets: any[] = [];
  selectedAssetId = '';
  allocationTeamMemberList: any[] = [];
  selectedAllocationMemberId = '';
  showActionModal = false;
  selectedRequest: AssetRequest | null = null;
  actionType: string | null = null;
  actionComments = '';

  showDetailModal = false;
  detailRequest: AssetRequest | null = null;

  returnRequests: AssetRequest[] = [];
  requestStats = { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, inProgress: 0 };

  // Loading & error state
  isLoading = true;
  loadError = '';

  // Pagination
  currentPage = 1;
  pageSize = 5;
  protected readonly Math = Math;
  task_id_latest = '';

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private userService: UserService,
    private assetService: AssetService,
    private notificationService: NotificationService,
    private mailService: MailService,
    private hs: HeroService
  ) { }


  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const currentUser = this.authService.getCurrentUser();
      const approverId = currentUser?.id || 'usr_004';

      // Fetch all three in parallel: all requests, pending requests, and available assets
      // const [allReqs, pendingReqs, returnReqs] = await Promise.all([
      //   this.requestService.fetchAllRequestsFromService(approverId),
      //   this.requestService.fetchPendingRequestsFromService(approverId),
      //   this.requestService.fetchPendingReturnApprovalsFromService(approverId),
      // Fetch all in parallel: all requests, pending requests, confirmation requests, and available assets
      // Fetch all in parallel with individual error handling to prevent dashboard crash if one service fails
      const [allReqs, pendingReqs, confirmReqs, returnReqs] = await Promise.all([
        this.requestService.fetchAllRequestsFromService(approverId).catch(err => { console.error('All Req fetch failed:', err); return []; }),
        this.requestService.fetchPendingRequestsFromService(approverId).catch(err => { console.error('Pending Req fetch failed:', err); return []; }),
        this.requestService.fetchConfirmationRequestsFromService(approverId).catch(err => { console.error('Confirm Req fetch failed:', err); return []; }),
        this.requestService.fetchPendingReturnApprovalsFromService(approverId).catch(err => { console.error('Return Req fetch failed:', err); return []; }),
        this.loadAvailableAssets().catch(err => { console.error('Assets load failed:', err); return []; })
      ] as any[]);

      this.allRequests = allReqs;
      this.confirmationRequests = confirmReqs;

      // Filter out confirmation requests from the pending approvals list to prevent duplication
      const confirmationIds = new Set(this.confirmationRequests.map((r: AssetRequest) => r.id));
      this.pendingRequests = pendingReqs.filter((r: AssetRequest) => !confirmationIds.has(r.id));

      const memberResult = await this.requestService.getAllocationTeamMemberAccordingtoManager(approverId);
      this.allocationTeamMemberList = Array.isArray(memberResult) ? memberResult : (memberResult ? [memberResult] : []);
      console.log('Allocation Team Members:', this.allocationTeamMemberList);
      this.returnRequests = returnReqs;
      console.log(`Confirmation Requests loaded: ${this.confirmationRequests.length}`);

      // Stats from all requests (ensure total reflects live data)
      this.requestStats = this.requestService.getAllRequestStats(this.allRequests);

      // If pending count in stats is less than actual pending list (mismatch), fix it
      if (this.requestStats.pending < this.pendingRequests.length) {
        this.requestStats.pending = this.pendingRequests.length;
        // Total should at least be what's in awaiting action if they are disjoint
        if (this.requestStats.total < this.pendingRequests.length) {
          this.requestStats.total = this.pendingRequests.length;
        }
      }

      this.applyFilters();
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      this.loadError = err?.message || err?.errorThrown || 'Failed to load request data. Please try again.';
      this.allRequests = [];
      this.filteredRequests = [];
      this.pendingRequests = [];
      this.confirmationRequests = [];
      this.filteredConfirmationRequests = [];
    } finally {
      this.isLoading = false;
    }
  }

  async Getassetidbyapprovalid(request_id: any) {
    try {
      const resp: any = await this.hs.ajax('Getassetidbyapprovalid', 'http://schemas.cordys.com/AMS_Database_Metadata',
        { Request_id: request_id }
      );
      const data = this.hs.xmltojson(resp, 'tuple');
      if (data) {
        const parent = data.old || data;
        const approval = parent.t_request_approvals || {};
        this.task_id_latest = approval.temp2 || '';
        console.log("[AssetManager] Latest Task ID fetched:", this.task_id_latest);
      }
    } catch (err) {
      console.error("[AssetManager] Error fetching latest task ID:", err);
    }
  }


  async loadAvailableAssets(): Promise<void> {
    try {
      const allAssets = await this.assetService.fetchAssetDetailsFromService();
      this.availableAssets = allAssets.filter(a => a.status === 'Available');
      console.log(`Loaded ${this.availableAssets.length} available assets for dropdown`);
    } catch (err) {
      console.error('Failed to load available assets:', err);
      this.availableAssets = [];
    }
  }

  get filteredAvailableAssets(): any[] {
    if (!this.detailRequest) return [];

    const reqType = (this.detailRequest.assetType || '').toLowerCase();
    const reqCategory = (this.detailRequest.category || '').toLowerCase();

    return this.availableAssets.filter(asset => {
      // Get normalized names for the asset using the public service methods
      const normalizedAssetType = this.requestService.normalizeAssetType(asset.type_id).toLowerCase();
      const normalizedAssetCat = this.requestService.normalizeCategory(asset.sub_category_id).toLowerCase();

      // Priority 1: Match by category (Laptop, Monitor, etc.)
      if (reqCategory && reqCategory !== 'hardware' && reqCategory !== 'software' && reqCategory !== 'asset detail') {
        if (normalizedAssetCat === reqCategory) return true;

        // Also check if asset_name contains the category for more flexible matching
        if (asset.asset_name && asset.asset_name.toLowerCase().includes(reqCategory)) return true;
      }

      // Priority 2: Match by type (Hardware, Software)
      if (reqType && reqType !== 'n/a') {
        return normalizedAssetType === reqType;
      }

      // If we can't determine a match based on type/category, show all available (fallback)
      return true;
    });
  }

  switchTab(tab: 'pending' | 'all' | 'confirmation' | 'return'): void {
    this.activeTab = tab;
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedUrgency = '';
    this.confirmationSearchTerm = '';
    this.currentPage = 1; // Reset page on tab switch
    this.applyFilters();
  }

  applyFilters(): void {
    let source: AssetRequest[] = [];
    if (this.activeTab === 'pending') {
      source = this.pendingRequests;
    } else if (this.activeTab === 'return') {
      source = this.returnRequests;
    } else if (this.activeTab === 'confirmation') {
      source = this.confirmationRequests;
    } else {
      source = this.allRequests;
    }

    const currentSearch = this.activeTab === 'confirmation' ? this.confirmationSearchTerm : this.searchTerm;

    this.filteredRequests = source.filter(req => {
      const matchesSearch = !currentSearch ||
        req.requestNumber.toLowerCase().includes(currentSearch.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(currentSearch.toLowerCase()) ||
        req.category.toLowerCase().includes(currentSearch.toLowerCase());
      const matchesStatus = !this.selectedStatus || req.status === this.selectedStatus;
      const matchesUrgency = !this.selectedUrgency || req.urgency === this.selectedUrgency;
      return matchesSearch && matchesStatus && matchesUrgency;
    }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    console.log(`[AssetRequests] applyFilters: tab=${this.activeTab}, sourceCount=${source.length}, filteredCount=${this.filteredRequests.length}`);
    if (this.selectedStatus) {
      console.log(`[AssetRequests] Status Filter: ${this.selectedStatus}. Source statuses:`, source.map(r => r.status).slice(0, 10));
    }

    this.filteredConfirmationRequests = this.confirmationRequests.filter(req => {
      return !this.confirmationSearchTerm ||
        req.id.toLowerCase().includes(this.confirmationSearchTerm.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(this.confirmationSearchTerm.toLowerCase()) ||
        req.category.toLowerCase().includes(this.confirmationSearchTerm.toLowerCase());
    }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    this.currentPage = 1; // Reset page on filter change
  }

  get paginatedRequests(): AssetRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get paginatedConfirmationRequests(): AssetRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredConfirmationRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const source = this.activeTab === 'confirmation' ? this.filteredConfirmationRequests : this.filteredRequests;
    return Math.ceil(source.length / this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get paginationDisplayRange(): string {
    const source = this.activeTab === 'confirmation' ? this.filteredConfirmationRequests : this.filteredRequests;
    if (source.length === 0) return '0 - 0 of 0';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, source.length);
    return `${start} - ${end} of ${source.length}`;
  }

  onConfirmationSearchChange(): void {
    this.filteredConfirmationRequests = this.confirmationRequests.filter(req => {
      return !this.confirmationSearchTerm ||
        req.requestNumber.toLowerCase().includes(this.confirmationSearchTerm.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(this.confirmationSearchTerm.toLowerCase()) ||
        req.category.toLowerCase().includes(this.confirmationSearchTerm.toLowerCase());
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  getUrgencyClass(urgency: RequestUrgency): string {
    switch (urgency) {
      case RequestUrgency.CRITICAL: return 'urgency-critical';
      case RequestUrgency.HIGH: return 'urgency-high';
      case RequestUrgency.MEDIUM: return 'urgency-medium';
      case RequestUrgency.LOW: return 'urgency-low';
      default: return '';
    }
  }

  openActionModal(request: AssetRequest, action: 'approve' | 'reject'): void {
    console.log("Request is ", request);
    this.selectedRequest = request;
    this.actionType = action;
    this.actionComments = '';
    this.showActionModal = true;
  }

  closeActionModal(): void {
    this.showActionModal = false;
    this.selectedRequest = null;
    this.actionType = null;
    this.actionComments = '';
  }

  async directConfirmAction(request: AssetRequest, action: 'approve' | 'reject'): Promise<void> {
    if (action === 'reject' && (!this.actionComments || this.actionComments.trim() === '')) {
      alert('Approver remarks are required for rejection.');
      return;
    }

    this.notificationService.showToast(`Processing ${action === 'approve' ? 'approval' : 'rejection'} for request ${request.id}...`, 'info');

    if (action === 'approve') {
      if (request.requestType !== RequestType.RETURN_ASSET) {
        if (!this.selectedAssetId) {
          alert('Please select an asset to allocate before approving.');
          return;
        }
        if (!this.selectedAllocationMemberId) {
          alert('Please assign an Allocation Team Member before approving.');
          return;
        }
      }
    }

    this.selectedRequest = request;
    this.actionType = action;
    // this.actionComments = ''; // DO NOT RESET HERE, we need the value from UI
    console.log('Selected Allocation Member ID:', this.selectedAllocationMemberId);
    await this.confirmAction();
    this.closeDetailModal();
  }

  // async confirmAction(): Promise<void> {
  //   debugger;
  //On approval
  //update the request approvals table with Asset Manager status on approved
  //update the asset table for that particular asset id with status  "Move To Allocation Team"
  //create new entry in  request approvals table with asset id in it 

  //On reject
  ////update the request approvals table with Asset Manager status on rejected
  // //update the asset_request table with status rejected 
  // console.log("Selected request is ", this.selectedRequest);
  async confirmAction(): Promise<void> {

    console.log("Confirming action for request:", this.selectedRequest);
    if (!this.selectedRequest || !this.actionType) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.warn("No current user found during confirmAction");
      return;
    }

    if (this.actionType === 'approve') {
      if (this.selectedRequest.requestType === RequestType.RETURN_ASSET) {
        console.log("Executing Return Approval Flow...");

        // Request 1: Update current manager approval to 'Approved'
        const req6 = {
          tuple: {
            old: { t_asset_return_approvals: { return_approval_id: this.selectedRequest.returnapprovalId } },
            new: { t_asset_return_approvals: { status: "Approved", remarks: this.actionComments } }
          }
        };

        try {
          await this.requestService.updateReturnAssetStatus(req6 as any);

          // Check if this is the final confirmation stage
          const isFinalConfirmation = this.selectedRequest.remarks === "Waiting for Hand-off Confirmation" || 
                                      this.selectedRequest.currentStage?.toString().includes("Waiting") ||
                                      (this.selectedRequest as any).status === "Pending" && (this.selectedRequest as any).role === "Asset Manager" && (this.selectedRequest as any).approverId === "usr_004" && this.selectedRequest.requesterId !== "usr_004"; // fallback heuristics

          if (isFinalConfirmation || this.selectedRequest.remarks === "Waiting for Hand-off Confirmation") {
            // This is the final stage. Complete the request.
            console.log("Executing Final Return Confirmation...");
            
            // Update t_asset_returns main table status to 'Completed'
            const updateReturnReq = {
              tuple: {
                old: { t_asset_returns: { return_id: this.selectedRequest.id } },
                new: { t_asset_returns: { status: 'Completed', remarks: 'Return Completed and Confirmed' } }
              }
            };
            try {
              await this.requestService.createEntryForReturn(updateReturnReq as any);
            } catch (e) {
              console.error("Failed to update t_asset_returns status to Completed:", e);
            }

            const taskid = this.selectedRequest?.taskid;
            if (taskid) {
              await this.requestService.completeUserTask({ TaskId: `${taskid}`, Action: 'COMPLETE' } as any);
            }
            this.notificationService.showToast(`Return request ${this.selectedRequest.id} completed.`, 'success');

            // Send 'completed' email to Employee
            this.mailService.sendReturnRequestNotification({
              stage: 'completed',
              returnId: this.selectedRequest.id,
              employeeName: this.selectedRequest.requesterName,
              assetName: this.selectedRequest.assetType,
              remarks: this.actionComments || 'Return successfully completed.',
              actionByName: currentUser.name
            });

          } else {
            // This is the initial approval stage. Forward to Allocation Team.
            const req7 = {
              tuple: {
                new: {
                  t_asset_return_approvals: {
                    approver_id: 'usr_007', // Allocation Team ID
                    request_id: this.selectedRequest.id,
                    role: "Allocation Team Member",
                    status: "Pending",
                    remarks: this.actionComments,
                  }
                }
              }
            };
            await this.requestService.completeTask(req7 as any);

            const taskid = this.selectedRequest?.taskid;
            if (taskid) {
              await this.requestService.completeUserTask({ TaskId: `${taskid}`, Action: 'COMPLETE' } as any);
            }
            this.notificationService.showToast(`Return request ${this.selectedRequest.id} approved.`, 'success');

            // Send email to Allocation Team
            this.mailService.sendReturnRequestNotification({
              stage: 'am_approved',
              returnId: this.selectedRequest.id,
              employeeName: this.selectedRequest.requesterName,
              assetName: this.selectedRequest.assetType,
              remarks: this.actionComments,
              actionByName: currentUser.name,
              nextApproverName: 'Allocation Team'
            });
          }
        } catch (error) {
          console.error("Return Approval SOAP call failed:", error);
        }
      } else {
        // Approval logic for Standard Requests (New Asset / Warranty)
        var req1 = {
          tuple: {
            old: { t_request_approvals: { approval_id: this.selectedRequest.approvalId } },
            new: { t_request_approvals: { status: "Approved", remarks: this.actionComments } }
          }
        };
        await this.requestService.updateEntryForAssetManager(req1 as any);

        var req2 = {
          tuple: {
            old: { m_assets: { asset_id: this.selectedRequest.assignedAssetId } },
            new: {
              m_assets: {
                status: "MoveToAllocationTeam",
                temp1: this.selectedRequest.requesterId,
                temp2: this.selectedRequest.id
              }
            }
          }
        };
        await this.requestService.updateAssetStatus(req2 as any);

        var req3 = {
          tuple: {
            new: {
              t_request_approvals: {
                approver_id: this.selectedAllocationMemberId,
                request_id: this.selectedRequest.id,
                role: "Asset Allocation Team",
                status: "Pending",
                remarks: this.actionComments,
                temp1: this.selectedRequest.assignedAssetId,
              }
            }
          }
        };
        await this.requestService.createEntryForTeamAllocationMember(req3 as any);

        const taskid = this.selectedRequest?.taskid;
        if (taskid) {
          await this.requestService.completeUserTask({ TaskId: `${taskid}`, Action: 'COMPLETE' } as any);
        }

        // Send Mail
        const member = this.allocationTeamMemberList.find(m => m.user_id === this.selectedAllocationMemberId);
        this.mailService.sendAssetManagerStatusUpdate({
          requestId: this.selectedRequest.id,
          employeeName: this.selectedRequest.requesterName,
          status: 'Approved',
          managerName: currentUser.name,
          remarks: this.actionComments,
          allocationMemberName: member ? member.name : 'Allocation Team',
          assetName: this.selectedRequest.assetType
        });

        this.notificationService.showToast(`Request ${this.selectedRequest.id} approved and routed for allocation.`, 'success');
      }
    } else {
      // Rejection logic for ALL request types
      if (this.selectedRequest.requestType === RequestType.RETURN_ASSET) {
        console.log("Executing Return Rejection Flow...");

        // Step 1: Update current return approval record to 'Rejected'
        const req9 = {
          tuple: {
            old: { t_asset_return_approvals: { return_approval_id: this.selectedRequest.returnapprovalId } },
            new: { t_asset_return_approvals: { status: "Rejected", remarks: this.actionComments } }
          }
        };
        await this.requestService.updateReturnAssetStatus(req9 as any);
        console.log("Step 1: Return approval record updated to Rejected");

        // Step 2: Update t_asset_returns main table status to 'Rejected'
        const updateReturnReq = {
          tuple: {
            old: {
              t_asset_returns: {
                return_id: this.selectedRequest.id
              }
            },
            new: {
              t_asset_returns: {
                status: 'Rejected',
                remarks: this.actionComments || 'Rejected by Asset Manager'
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
        const taskid = this.selectedRequest?.taskid;
        if (taskid) {
          await this.requestService.completeUserTask({ TaskId: `${taskid}`, Action: 'COMPLETE' } as any);
          console.log("Step 3: BPM task completed");
        }
        this.notificationService.showToast(`Return request ${this.selectedRequest.id} rejected.`, 'info');

        // Send email to Employee about rejection
        this.mailService.sendReturnRequestNotification({
          stage: 'am_rejected',
          returnId: this.selectedRequest.id,
          employeeName: this.selectedRequest.requesterName,
          assetName: this.selectedRequest.assetType,
          remarks: this.actionComments,
          actionByName: currentUser.name
        });
      } else {
        // Standard Request Rejection (New Asset / Warranty)
        const reqReject = {
          tuple: {
            old: { t_request_approvals: { approval_id: this.selectedRequest.approvalId } },
            new: { t_request_approvals: { status: "Rejected", remarks: this.actionComments } }
          }
        };
        await this.requestService.updateEntryForAssetManager(reqReject as any);

        const employeeApprovalPayload = {
          tuple: {
            new: {
              t_request_approvals: {
                request_id: this.selectedRequest.id,
                approver_id: this.selectedRequest.requesterId,
                role: "Employee",
                status: "Pending"
              }
            }
          }
        };
        await this.requestService.updateEntryForAssetManager(employeeApprovalPayload as any);

        const rejectRequestPayload = {
          tuple: {
            old: { t_asset_requests: { request_id: this.selectedRequest.id } },
            new: { t_asset_requests: { status: 'Rejected' } }
          }
        };
        await this.requestService.submitNewRequestForm(rejectRequestPayload as any);

        await this.Getassetidbyapprovalid(this.selectedRequest.id);
        const taskid = this.task_id_latest || this.selectedRequest?.taskid;
        if (taskid) {
          await this.requestService.completeUserTask({ TaskId: `${taskid}`, Action: 'COMPLETE' } as any);
        }

        this.notificationService.showToast(`Request ${this.selectedRequest.id} rejected.`, 'info');

        this.mailService.sendAssetManagerStatusUpdate({
          requestId: this.selectedRequest.id,
          employeeName: this.selectedRequest.requesterName,
          status: 'Rejected',
          managerName: currentUser.name,
          remarks: this.actionComments || 'Rejected by Asset Manager'
        });
      }
    }

    this.closeActionModal();
    this.loadAllData();
  }

  // ─── Confirmation Requests Tab — dedicated approve / reject flow ──────────

  /**
   * Entry point called by the Approve / Reject buttons inside the
   * Confirmation Requests detail modal.  Keeps the confirmation flow
   * completely separate from the pending-tab flow.
   */
  async directConfirmActionForConfirmation(
    request: AssetRequest,
    action: 'approve' | 'reject'
  ): Promise<void> {
    if (action === 'reject' && (!this.actionComments || this.actionComments.trim() === '')) {
      alert('Approver remarks are required for rejection.');
      return;
    }

    this.notificationService.showToast(`Processing confirmation ${action === 'approve' ? 'approval' : 'rejection'} for request ${request.id}...`, 'info');

    this.selectedRequest = request;
    this.actionType = action;
    // this.actionComments = ''; // Keep the value given by the user in the UI
    console.log('[Confirmation] Action triggered:', action, ' | Request:', request);
    await this.confirmActionForConfirmation();
    this.closeDetailModal();
  }

  /**
   * Executes the backend calls for the Confirmation Requests approve / reject flow.
   *
   * On APPROVE:
   *   1. Update the t_request_approvals record → status = 'Approved'
   *   2. Complete the BPM user task (taskid stored in approval.temp2)
   *
   * On REJECT:
   *   1. Update the t_request_approvals record → status = 'Rejected'
   *   2. Update the asset request record → status = 'Rejected'
   */
  async confirmActionForConfirmation(): Promise<void> {

    console.log('[Confirmation] confirmActionForConfirmation called. Request:', this.selectedRequest);

    if (!this.selectedRequest || !this.actionType) return;
    console.log(this.selectedRequest);
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    if (this.actionType === 'approve') {
      console.log(this.selectedRequest.approvalId);
      // Step 1 — mark the approval record as Approved
      const approvePayload = {
        tuple: {
          old: {
            t_request_approvals: {
              approval_id: this.selectedRequest.approvalId
            }
          },
          new: {
            t_request_approvals: {
              status: 'Approved',
              remarks: this.actionComments || ''
            }
          }
        }
      };
      console.log('[Confirmation] Approve payload (step 1):', approvePayload);
      await this.requestService.updateEntryForAssetManager(approvePayload as any);

      const newRequestForUser = {
        tuple: {
          new: {
            t_request_approvals: {
              approver_id: this.selectedRequest.requesterId,
              request_id: this.selectedRequest.id,
              temp1: this.selectedRequest.allocatedAssetId,
              status: 'Pending',
              role: 'Employee'
            }
          }
        }
      };
      console.log('[Confirmation] Approve payload (step 1):', newRequestForUser);
      await this.requestService.createEntryForRequestor(newRequestForUser as any);

      // Step 2 — complete the BPM task so the workflow advances
      const taskId = this.selectedRequest.taskid;
      console.log('[Confirmation] Completing task:', taskId);
      if (taskId) {
        const taskPayload = {
          TaskId: `${taskId}`,
          Action: 'COMPLETE'
        };
        await this.requestService.completeUserTask(taskPayload as any);
      }

      this.mailService.sendFinalManagerConfirmationNotification({
        requestId: this.selectedRequest.id,
        employeeName: this.selectedRequest.requesterName,
        managerName: currentUser.name,
        assetName: this.selectedRequest.assetType
      });

      this.notificationService.showToast(`Request ${this.selectedRequest.id} confirmed successfully.`, 'success');



    } else {
      // Step 1 — mark the approval record as Rejected
      const rejectApprovalPayload = {
        tuple: {
          old: {
            t_request_approvals: {
              approval_id: this.selectedRequest.approvalId
            }
          },
          new: {
            t_request_approvals: {
              status: 'Rejected',
              remarks: this.actionComments || ''
            }
          }
        }
      };
      console.log('[Confirmation] Reject payload (step 1):', rejectApprovalPayload);
      await this.requestService.updateEntryForAssetManager(rejectApprovalPayload as any);

      // Step 1.5 — Create new entry for Employee (same as Team Lead logic)
      const employeeApprovalPayload = {
        tuple: {
          new: {
            t_request_approvals: {
              request_id: this.selectedRequest.id,
              approver_id: this.selectedRequest.requesterId,
              role: "Employee",
              status: "Pending"
            }
          }
        }
      };
      console.log('[Confirmation] Employee entry payload:', employeeApprovalPayload);
      await this.requestService.updateEntryForAssetManager(employeeApprovalPayload as any);

      // Step 2 — update the asset_request row status to Rejected
      const rejectRequestPayload = {
        tuple: {
          old: { t_asset_requests: { request_id: this.selectedRequest.id } },
          new: { t_asset_requests: { status: 'Rejected' } }
        }
      };
      console.log('[Confirmation] Reject payload (step 2):', rejectRequestPayload);
      await this.requestService.submitNewRequestForm(rejectRequestPayload as any);

      // Step 3 — Complete BPM Task
      await this.Getassetidbyapprovalid(this.selectedRequest.id);
      const taskid = this.task_id_latest || this.selectedRequest?.taskid;
      if (taskid) {
        const reqTaskComplete = {
          TaskId: `${taskid}`,
          Action: 'COMPLETE'
        };
        console.log('[Confirmation] Completing BPM Task:', taskid);
        await this.requestService.completeUserTask(reqTaskComplete as any);
      }

      this.notificationService.showToast(`Request ${this.selectedRequest.id} rejected.`, 'info');

      this.mailService.sendAssetManagerStatusUpdate({
        requestId: this.selectedRequest.id,
        employeeName: this.selectedRequest.requesterName,
        status: 'Rejected',
        managerName: currentUser.name,
        remarks: this.actionComments || 'Rejected by Asset Manager'
      });

    }


    this.loadAllData();
  }

  getTimeSince(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return `${Math.floor(diff / 30)} months ago`;
  }

  getRequesterEmail(req: AssetRequest): string {
    if (req.requesterEmail) return req.requesterEmail;
    const user = this.userService.getUserById(req.requesterId);
    return user ? user.email : '—';
  }

  async openDetailModal(request: AssetRequest): Promise<void> {
    this.detailRequest = { ...request };
    this.actionComments = ''; // Reset remarks for this specific request
    this.showDetailModal = true;

    // Fetch real-time progress to get actual names and statuses for the tracker
    try {
      const progress = await this.requestService.getRequestProgress(request.id);
      if (progress && progress.length > 0) {
        // Update the detail request's approval chain with real-time data
        this.detailRequest.approvalChain = this.detailRequest.approvalChain.map(entry => {
          const stageProgress = progress.find(p =>
            p.stage === entry.stage ||
            (entry.stage === ApprovalStage.TEAM_LEAD && (p.stage.toLowerCase().includes('team lead') || p.stage.toLowerCase().includes('manager')))
          );

          if (stageProgress) {
            return {
              ...entry,
              action: (stageProgress.status === 'Approved' || stageProgress.status === 'Rejected') ? stageProgress.status : entry.action,
              approverName: stageProgress.approverName || entry.approverName,
              timestamp: stageProgress.timestamp || entry.timestamp,
              comments: stageProgress.comments || entry.comments
            };
          }
          return entry;
        });
      } else {
        // Fallback: If no progress history found, but Manager is seeing it, TL must have approved
        this.detailRequest.approvalChain = this.detailRequest.approvalChain.map(entry => {
          if (entry.stage === ApprovalStage.TEAM_LEAD) {
            return { ...entry, action: 'Approved' as any };
          }
          return entry;
        });
      }
    } catch (err) {
      console.warn('Failed to load dynamic progress for tracker:', err);
    }
  }

  getRejectionReason(req: AssetRequest): string {
    if (req.status !== RequestStatus.REJECTED) return '';

    // 1. Check if it's already in the request object
    if (req.reason) return req.reason;
    if (req.remarks) return req.remarks;

    // 2. Check the approval chain for a rejected stage
    const rejectedStage = req.approvalChain?.find(a => a.action === 'Rejected');
    if (rejectedStage && rejectedStage.comments) return rejectedStage.comments;

    return 'No rejection reason provided.';
  }

  getAssetManagerRemarks(req: AssetRequest): string {
    const amStage = req.approvalChain?.find(a => a.stage === ApprovalStage.ASSET_MANAGER);
    return amStage?.comments || req.remarks || '';
  }

  getAllocationRemarks(req: AssetRequest): string {
    const allocStage = req.approvalChain?.find(a => a.stage === ApprovalStage.ALLOCATION);
    return allocStage?.comments || '';
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailRequest = null;
  }

  getApprovalStageClass(action: string): string {
    switch (action) {
      case 'Approved': return 'stage-approved';
      case 'Rejected': return 'stage-rejected';
      case 'Pending': return 'stage-pending';
      case 'Skipped': return 'stage-skipped';
      default: return '';
    }
  }

  getApprovalIcon(action: string): string {
    switch (action) {
      case 'Approved': return 'check_circle';
      case 'Rejected': return 'cancel';
      case 'Pending': return 'radio_button_unchecked';
      case 'Skipped': return 'remove_circle_outline';
      default: return 'help_outline';
    }
  }

  onAssetSelect(assetId: string): void {
    if (!this.detailRequest) return;

    if (!assetId) {
      this.detailRequest.assignedAssetId = '';
      this.detailRequest.assignedTypeId = '';
      this.detailRequest.assignedSubCategoryId = '';
      this.detailRequest.assignedSerial = '';
      this.detailRequest.assignedPurchaseDate = '';
      this.detailRequest.assignedWarrantyExpiry = '';
      return;
    }

    const asset = this.availableAssets.find(a => a.asset_id === assetId);
    if (asset) {
      this.detailRequest.assignedAssetId = asset.asset_id;
      this.detailRequest.assignedTypeId = asset.type_id;
      this.detailRequest.assignedSubCategoryId = asset.sub_category_id || '—';
      this.detailRequest.assignedSerial = asset.serial_number || '—';
      this.detailRequest.assignedPurchaseDate = asset.purchase_date || '—';
      this.detailRequest.assignedWarrantyExpiry = asset.warranty_expiry || '—';
    }
  }

  onMemberSelect(memberId: string): void {
    this.selectedAllocationMemberId = memberId;
    console.log('Allocation member selected:', this.selectedAllocationMemberId);
  }

  viewDocument(docName: string): void {
    if (!docName) return;

    // If it's a base64 data URL, open it directly
    if (docName.startsWith('data:')) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<iframe src="${docName}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
      return;
    }

    // Handle server file paths — use SOAP DownloadFile_AMS to fetch content then display
    this.fetchAndOpenFile(docName, 'view');
  }


  downloadDocument(docName: string): void {
    if (!docName) return;

    if (docName.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = docName;
      link.download = 'attachment_' + new Date().getTime();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Handle server file paths — use SOAP DownloadFile_AMS to fetch content then download
    this.fetchAndOpenFile(docName, 'download');
  }

  /**
   * Fetches file content from the server via DownloadFile_AMS SOAP service,
   * then either opens it in a new tab (view) or triggers a browser download.
   */
  private async fetchAndOpenFile(serverPath: string, action: 'view' | 'download'): Promise<void> {
    const displayName = this.extractFileName(serverPath);
    this.notificationService.showToast(`Fetching: ${displayName}...`, 'info');

    try {
      // Split the full server path into directory + filename
      // e.g., "C:\OTAPPS\...\Intern_Uploads\file.pdf" → dir="C:\OTAPPS\...\Intern_Uploads", name="file.pdf"
      const parts = serverPath.split(/[\\\/]/);
      const fileName = parts.pop() || '';
      const dirPath = parts.join('\\');

      console.log('[AssetRequests] Calling DownloadFile_AMS - dir:', dirPath, '| file:', fileName);

      if (!fileName || !dirPath) {
        this.notificationService.showToast('Invalid file path.', 'error');
        return;
      }

      // Call the SOAP service to get base64-encoded file content
      const base64Content = await this.requestService.downloadFileFromServer(fileName, dirPath);

      console.log('[AssetRequests] Download response length:', base64Content?.length);

      if (!base64Content || base64Content.length < 10) {
        this.notificationService.showToast('File content is empty or could not be retrieved.', 'error');
        return;
      }

      // Determine MIME type from file extension
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeMap: { [key: string]: string } = {
        'pdf': 'application/pdf', 'png': 'image/png',
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain', 'csv': 'text/csv',
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';

      // Convert base64 to Blob
      const byteChars = atob(base64Content);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNums)], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (action === 'view') {
        // Open in new tab for viewing
        window.open(blobUrl, '_blank');
        this.notificationService.showToast(`Opened: ${displayName}`, 'success');
      } else {
        // Trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = displayName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.notificationService.showToast(`Downloaded: ${displayName}`, 'success');
      }

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    } catch (err: any) {
      console.error('[AssetRequests] File fetch failed:', err);
      const errDetail = err?.responseText || err?.errorThrown || err?.message || 'Unknown error';
      this.notificationService.showToast(`Failed to fetch file: ${errDetail}`, 'error');
    }
  }

  /** Extract just the filename from a full server path */
  extractFileName(path: string): string {
    if (!path) return 'attachment';
    const parts = path.split(/[\\\/]/);
    return parts[parts.length - 1] || 'attachment';
  }

}
