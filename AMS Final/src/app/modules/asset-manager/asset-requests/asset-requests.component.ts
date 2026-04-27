import { Component, OnInit } from '@angular/core';
import { RequestService } from '../../../core/services/request.service';
import { AssetRequest, ApprovalStage, RequestStatus, RequestUrgency, RequestType } from '../../../core/models/request.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MailService } from '../../../core/services/mail.service';



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
  availableAssets: any[] = [];
  selectedAssetId = '';
  allocationTeamMemberList: any[] = [];
  selectedAllocationMemberId = '';
  showActionModal = false;
  selectedRequest: AssetRequest | null = null;
  actionType: 'approve' | 'reject' | null = null;
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

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private userService: UserService,
    private assetService: AssetService,
    private notificationService: NotificationService,
    private mailService: MailService
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
      this.pendingRequests = pendingReqs;
      this.confirmationRequests = confirmReqs;

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

  switchTab(tab: 'pending' | 'all' | 'confirmation' | 'return' ): void {
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
    if (!this.actionComments || this.actionComments.trim() === '') {
      alert('Approver remarks are required.');
      return;
    }

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
      if (this.selectedRequest.requestType !== RequestType.RETURN_ASSET) {
        var req1 = {
          tuple: {
            old: {
              t_request_approvals: {
                approval_id: this.selectedRequest.approvalId,

              }
            }
            ,
            new: {
              t_request_approvals: {
                status: "Approved",
                remarks: this.actionComments,
              }

            }

          }
        }
        console.log("First request is", req1)
        await this.requestService.updateEntryForAssetManager(req1 as any)
        var req2 = {
          tuple: {
            old: {
              m_assets: {
                asset_id: this.selectedRequest.assignedAssetId,

              }
            }
            ,
            new: {
              m_assets: {
                status: "MoveToAllocationTeam",
                temp1: this.selectedRequest.requesterId, // Keep requester ID in temp1 as per convention
                temp2: this.selectedRequest.id
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
                approver_id: this.selectedAllocationMemberId,
                request_id: this.selectedRequest.id,
                role: "Asset Allocation Team",
                status: "Pending",
                remarks: this.actionComments,
                temp1: this.selectedRequest.assignedAssetId,

              }
            }
          }
        }
        console.log("Third request is ", req3);
        await this.requestService.createEntryForTeamAllocationMember(req3 as any);
        var taskid = this.selectedRequest?.taskid;
        console.log("Taskid is  ", taskid);
        var req4 = {
          TaskId: `${taskid}`,
          Action: 'COMPLETE'
        }
        await this.requestService.completeUserTask(req4 as any)
        
        // Find allocation team member name
        const member = this.allocationTeamMemberList.find(m => m.user_id === this.selectedAllocationMemberId);
        const memberName = member ? member.name : 'Allocation Team';

        this.mailService.sendAssetManagerStatusUpdate({
          requestId: this.selectedRequest.id,
          employeeName: this.selectedRequest.requesterName,
          status: 'Approved',
          managerName: currentUser.name,
          remarks: this.actionComments,
          allocationMemberName: memberName,
          assetName: this.selectedRequest.assetType
        });

        this.notificationService.showToast(`Request ${this.selectedRequest.id} approved and routed for allocation.`, 'success');

        // this.requestService.approveRequest(
        //   this.selectedRequest.id,
        //   currentUser.id,
        //   currentUser.name,
        //   this.actionComments,
        //   ApprovalStage.ASSET_MANAGER
        // );
      }
      // Check by request type rather than tab for more robust logic
      if (this.selectedRequest.requestType === RequestType.RETURN_ASSET) {
        if (this.actionType === 'approve') {
          console.log("Executing Return Approval Flow...");

           // Check if this is the FINAL confirmation (Step 3) vs initial approval (Step 1)
          // The Allocation Team sets remarks = "Waiting for Hand-off Confirmation" when creating Step 3 entry
          const approvalRemarks = this.selectedRequest.approvalChain?.[0]?.comments || '';
          console.log("Approval remarks from loaded data:", approvalRemarks);

          let allocationTeamAlreadyApproved = approvalRemarks.toLowerCase().includes('hand-off confirmation');

          // Fallback: try SOAP query if remarks check is inconclusive
          if (!allocationTeamAlreadyApproved) {
            try {
              const existingApprovals = await this.requestService.fetchReturnApprovalsByRequestId(this.selectedRequest.id);
              allocationTeamAlreadyApproved = existingApprovals.some(
                (a: any) => a.role === 'Allocation Team Member' && a.status?.toLowerCase().includes('approved')
              );
              console.log("SOAP fallback check - Allocation Team already approved?", allocationTeamAlreadyApproved, "Approvals:", existingApprovals);
            } catch (e) {
              console.warn("SOAP fallback check failed, relying on remarks check:", e);
            }
          }
          console.log("Final decision - Is final confirmation?", allocationTeamAlreadyApproved);

          // Step 1: Update current manager approval to 'Approved'
          const req6 = {
            tuple: {
              old: {
                t_asset_return_approvals: {
                  return_approval_id: this.selectedRequest.returnapprovalId,
                }
              },
              new: {
                t_asset_return_approvals: {
                  status: "Approved",
                  remarks: this.actionComments,
                }
              }
            }
          };

          console.log("SOAP Update (REQ6):", req6);
          try {
            await this.requestService.updateReturnAssetStatus(req6 as any);
            console.log("Step 1 (Update Status) Success");

            if (allocationTeamAlreadyApproved) {
              // ── FINAL CONFIRMATION ── Allocation Team already worked on this. End the workflow.
              console.log("Final Confirmation: Ending workflow for return request:", this.selectedRequest.id);

              // Update t_asset_returns status to 'Completed'
              const updateReturnReq = {
                tuple: {
                  old: {
                    t_asset_returns: {
                      return_id: this.selectedRequest.id
                    }
                  },
                  new: {
                    t_asset_returns: {
                      status: 'Completed',
                      remarks: this.actionComments
                    }
                  }
                }
              };
              await this.requestService.createEntryForReturn(updateReturnReq as any);
              console.log("Updated t_asset_returns to Completed");

              // Make the asset Available again
              if (this.selectedRequest.assignedAssetId) {
                const updateAssetReq = {
                  tuple: {
                    old: {
                      m_assets: {
                        asset_id: this.selectedRequest.assignedAssetId
                      }
                    },
                    new: {
                      m_assets: {
                        status: 'Available',
                        temp1: ''
                      }
                    }
                  }
                };
                try {
                  await this.requestService.updateAssetStatus(updateAssetReq as any);
                  console.log(`Asset ${this.selectedRequest.assignedAssetId} is now Available.`);
                } catch (e) {
                  console.error("Failed to update asset status:", e);
                }
              }

              // Complete BPM task → workflow ends
              var taskid = this.selectedRequest?.taskid;
              if (taskid) {
                var req4 = {
                  TaskId: `${taskid}`,
                  Action: 'COMPLETE'
                };
                await this.requestService.completeUserTask(req4 as any);
              }

              this.notificationService.showToast(`Return request ${this.selectedRequest.id} confirmed and completed.`, 'success');
              console.log("Workflow ENDED for return:", this.selectedRequest.id);

            } else {
              // ── STEP 1 ── First time approval. Forward to Allocation Team.
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

              console.log("SOAP Create (REQ7):", req7);
              await this.requestService.completeTask(req7 as any);
              var taskid = this.selectedRequest?.taskid;
              var req4 = {
                TaskId: `${taskid}`,
                Action: 'COMPLETE'
              }
              await this.requestService.completeUserTask(req4 as any)
              this.notificationService.showToast(`Return request ${this.selectedRequest.id} approved and forwarded to Allocation Team.`, 'success');
              console.log("Step 2 (Forwarding to Allocation Team) Success");
            }

          } catch (error) {
            console.error("Return Approval SOAP call failed:", error);
          }
        } else {
          // Rejection logic for returns
          this.requestService.rejectRequest(
            this.selectedRequest.id,
            currentUser.id,
            currentUser.name,
            this.actionComments,
            ApprovalStage.ASSET_MANAGER
          );
          this.notificationService.showToast(`Return request ${this.selectedRequest.id} rejected.`, 'info');
        }
      } else {
        // Standard Request Logic (New Asset / Warranty)
        if (this.actionType === 'approve') {
          this.requestService.approveRequest(
            this.selectedRequest.id,
            currentUser.id,
            currentUser.name,
            this.actionComments,
            ApprovalStage.ASSET_MANAGER
          );
          this.notificationService.showToast(`Request ${this.selectedRequest.id} approved successfully.`, 'success');
        } else {

          this.requestService.rejectRequest(
            this.selectedRequest.id,
            currentUser.id,
            currentUser.name,
            this.actionComments,
            ApprovalStage.ASSET_MANAGER
          );
          this.notificationService.showToast(`Request ${this.selectedRequest.id} rejected.`, 'info');
          
          this.mailService.sendAssetManagerStatusUpdate({
            requestId: this.selectedRequest.id,
            employeeName: this.selectedRequest.requesterName,
            status: 'Rejected',
            managerName: currentUser.name,
            remarks: this.actionComments
          });
        }


      }

      this.closeActionModal();
      this.loadAllData();
    }
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
    if (!this.actionComments || this.actionComments.trim() === '') {
      alert('Approver remarks are required.');
      return;
    }

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

      // Step 2 — update the asset_request row status to Rejected
      const rejectRequestPayload = {
        tuple: {
          old: {
            t_asset_requests: {
              request_id: this.selectedRequest.id
            }
          },
          new: {
            t_asset_requests: {
              status: 'Rejected'
            }
          }
        }
      };
      console.log('[Confirmation] Reject payload (step 2):', rejectRequestPayload);
      await this.requestService.submitNewRequestForm(rejectRequestPayload as any);
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
        // Find the Team Lead approval in the history
        const tlApproval = progress.find(p =>
          p.stage.toLowerCase().includes('team lead') ||
          p.stage.toLowerCase().includes('manager') // Sometimes Team Lead is called Manager in DB
        );

        // Update the detail request's approval chain
        this.detailRequest.approvalChain = this.detailRequest.approvalChain.map(entry => {
          if (entry.stage === ApprovalStage.TEAM_LEAD) {
            return {
              ...entry,
              action: 'Approved' as any,
              approverName: tlApproval?.approverName || entry.approverName || 'Team Lead',
              timestamp: tlApproval?.timestamp || entry.timestamp
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
      // Basic fallback
      this.detailRequest.approvalChain = this.detailRequest.approvalChain.map(entry => {
        if (entry.stage === ApprovalStage.TEAM_LEAD) return { ...entry, action: 'Approved' as any };
        return entry;
      });
    }
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

    // Default to assets folder
    const fileUrl = `assets/documents/${docName}`;
    window.open(fileUrl, '_blank');
    this.notificationService.showToast(`Opening document: ${docName}...`, 'info');
  }


  downloadDocument(docName: string): void {
    if (!docName) return;

    let fileUrl = '';
    let fileName = docName;

    if (docName.startsWith('data:')) {
      fileUrl = docName;
      // Extract a generic name if possible or use a default
      fileName = 'attachment_' + new Date().getTime();
    } else {
      fileUrl = `assets/documents/${docName}`;
    }

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notificationService.showToast(`Initiating download: ${fileName}`, 'success');
  }

}
