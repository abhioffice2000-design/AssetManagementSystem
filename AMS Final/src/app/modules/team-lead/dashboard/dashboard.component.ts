import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssetRequest, ApprovalStage } from '../../../core/models/request.model';
import { HeroService } from '../../../core/services/hero.service';


@Component({
  selector: 'app-lead-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class LeadDashboardComponent implements OnInit {
  teamSize = 0;
  teamAssets = 0;
  pendingApprovalsCount = 0;
  teamRequests: AssetRequest[] = [];
  selectedRequest: AssetRequest | null = null;

  // Pagination & Filtering
  currentPage = 1;
  pageSize = 5;
  searchTerm = '';
  data: any = { table: [] };
  user: any;
  userDetails: any;
  isLoading = false;
  teamMembers: any[] = [];
  showTeamModal = false;
  approvalChain: any[] = [];
  loadingProgress = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private assetService: AssetService,
    private hs: HeroService,
    private requestService: RequestService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    
    const activeTeam = user.team || 'General';
    
    // Maintain existing logic for assets as requested (Assets are still local for now)
    this.teamAssets = this.assetService.getAssetsByTeam(activeTeam).length;
    
    this.getuser();
  }

  get filteredRequests(): AssetRequest[] {
    if (!this.searchTerm.trim()) return this.teamRequests;
    const term = this.searchTerm.toLowerCase();
    return this.teamRequests.filter(req =>
      req.requestNumber.toLowerCase().includes(term) ||
      req.requesterName.toLowerCase().includes(term) ||
      req.category.toLowerCase().includes(term) ||
      req.assetType.toLowerCase().includes(term) ||
      req.status.toLowerCase().includes(term)
    );
  }

  get paginatedRequests(): AssetRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
  }

  getuser() {
    this.isLoading = true;
    this.hs.ajax('GetUserDetails', 'http://schemas.cordys.com/UserManagement/1.0/User', {}
    ).then((resp: any) => {
      this.user = this.hs.xmltojson(resp, "User");
      this.getuserdetails();
    }).catch(err => {
      console.error("Error fetching user details in getuser:", err);
    });
  }
  getuserdetails() {
    // Ensuring we have a valid username from the first API call
    const targetUsername = this.user?.UserName || this.user?.username || '';
    
    this.hs.ajax('Getuserbyusername', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { username: targetUsername } // Capitalized 'Username' is the standard for Cordys DB operations
    ).then((resp: any) => {
      this.userDetails = this.hs.xmltojson(resp, "m_users");
      this.getusercount(); // Fetch live team size once project ID is known
      this.getpendingcount(); // Fetch accurate pending approvals count
      this.getallrequests();
    }).catch(err => {
      console.error("Error fetching detailed user info in getuserdetails:", err);
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.selectedRequest = null; // Clear selection on page change
    }
  }

  selectRequest(req: AssetRequest): void {
    this.selectedRequest = req;
    this.fetchApprovalProgress(req.id);
  }

  async fetchApprovalProgress(requestId: string) {
    this.loadingProgress = true;
    
    // Standard template
    const standardChain = [
      { stage: 'Team Lead Approval', stageKey: 'Team Lead', status: 'Pending' },
      { stage: 'Asset Manager Approval', stageKey: 'Asset Manager', status: 'Pending' },
      { stage: 'Allocation Team', stageKey: 'Asset Allocation', status: 'Pending' }
    ];

    // Self-request template (Asset Manager -> Allocation)
    const selfChain = [
      { stage: 'Asset Manager Approval', stageKey: 'Asset Manager', status: 'Pending' },
      { stage: 'Allocation Team', stageKey: 'Asset Allocation', status: 'Pending' }
    ];

    // Select base template based on requester
    const isSelfRequest = this.selectedRequest?.requesterId === 'usr_003';
    const baseTemplate = isSelfRequest ? selfChain : standardChain;

    try {
      const progress = await this.requestService.getRequestProgress(requestId);
      
      this.approvalChain = baseTemplate.map(step => {
        const match = progress.find(p => 
          p.stage.toLowerCase().includes(step.stageKey.toLowerCase()) || 
          step.stage.toLowerCase().includes(p.stage.toLowerCase())
        );

        if (match) {
          return {
            ...step,
            status: match.status,
            approverName: match.approverName
          };
        }
        return step;
      });
    } catch (err) {
      console.error('[Dashboard] Failed to fetch progress:', err);
      this.approvalChain = baseTemplate;
    } finally {
      this.loadingProgress = false;
    }
  }

  getApprovalStageClass(status: string): string {
    switch (status) {
      case 'Approved': case 'Completed': return 'stage-approved';
      case 'Rejected': return 'stage-rejected';
      case 'Pending': return 'stage-pending';
      case 'Skipped': return 'stage-skipped';
      default: return '';
    }
  }

  getApprovalIcon(status: string): string {
    switch (status) {
      case 'Approved': case 'Completed': return 'check_circle';
      case 'Rejected': return 'cancel';
      case 'Pending': return 'radio_button_unchecked';
      case 'Skipped': return 'remove_circle_outline';
      default: return 'help_outline';
    }
  }

  cancelSelection(): void {
    this.selectedRequest = null;
  }

  markAsAccept(): void {
    if (this.selectedRequest) {
      // In a real app we would call an API here.
      // For now we just close the form.
      this.selectedRequest = null;
    }
  }

  markAsReject(): void {
    if (this.selectedRequest) {
      // In a real app we would call an API here to reject.
      // For now we just close the form.
      this.selectedRequest = null;
    }
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }
  getallrequests() {
    this.hs.ajax('GetRequestsForTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata',
      {}
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, "t_request_approvals");
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];

      // Map database fields to the AssetRequest interface fields used in the template
      this.teamRequests = rawData.map((item: any) => {
        const request = this.requestService.mapTupleToRequest(item);
        const reqItem = item.t_asset_requests || {};
        return {
          ...request,
          reqStatus: reqItem.status || request.status,
          status: item.status || request.status
        };
      }).sort((a: any, b: any) => b.requestNumber.localeCompare(a.requestNumber));

      this.data.table = rawData;
      
      // We now fetch pendingApprovalsCount via getpendingcount() for better accuracy
      // this.pendingApprovalsCount = this.teamRequests.filter(r => r.status === 'Pending').length;
      
      console.log("Mapped team requests:", this.teamRequests);
      this.isLoading = false;
    }).catch(err => {
      console.error("Error fetching requests:", err);
      this.isLoading = false;
    });
  }
  getusercount() {
    this.hs.ajax('GetAllUserRoleProjectDetails', 'http://schemas.cordys.com/AMS_Database_Metadata', {}
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, "m_users");
      const allUsers = result ? (Array.isArray(result) ? result : [result]) : [];
      // Filter the users belonging to the team lead's project
      const users = allUsers.filter((u: any) => u.project_id === this.userDetails.project_id);
      
      this.teamSize = users.length;
      // Store full member details for the modal
      this.teamMembers = users.map((u: any) => ({
        name: u.name || 'N/A',
        user_id: u.user_id || u.email || 'N/A',
        email: u.email || 'N/A',
        status: u.status || 'Active',
        role_id: (u.m_roles && u.m_roles.role_name) ? u.m_roles.role_name : (u.role_id || ''),
        team_lead: (u.m_projects && u.m_projects.team_lead) ? u.m_projects.team_lead : (this.userDetails.team_lead || this.userDetails.name || 'N/A')
      }));
      console.log("Team Size and Details updated from API:", this.teamSize, this.teamMembers);
    }).catch(err => {
      console.error("Error fetching user details in getusercount:", err);
    });
  }
 
  toggleTeamModal(): void {
    this.showTeamModal = !this.showTeamModal;
  }

  getpendingcount() {
    this.hs.ajax('GetallpendingrequestsForParticularTeamLead', 'http://schemas.cordys.com/AMS_Database_Metadata',
      {Approver_id: this.userDetails.user_id}
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, "t_asset_requests");
      const rawData = result ? (Array.isArray(result) ? result : [result]) : [];
      this.pendingApprovalsCount = rawData.length;
      console.log("Pending Approvals count updated from API:", this.pendingApprovalsCount);
    }).catch(err => {
      console.error("Error fetching pending count in getpendingcount:", err);
    });
  }

}


