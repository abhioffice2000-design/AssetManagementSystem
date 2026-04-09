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

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private assetService: AssetService,
    private hs: HeroService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    
    const activeTeam = user.team || 'General';
    
    // Maintain existing logic for team size and assets as requested
    this.teamSize = this.userService.getUsersByTeam(activeTeam).length;
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
    this.hs.ajax('GetAllProjectRequests', 'http://schemas.cordys.com/AMS_Database_Metadata',
      { project_id: this.userDetails.project_id }
    ).then((resp: any) => {
      const result = this.hs.xmltojson(resp, "t_asset_requests");
      const rawData = Array.isArray(result) ? result : [result];

      // Map database fields to the AssetRequest interface fields used in the template
      this.teamRequests = rawData.map((item: any) => {
        const userInfo = item.m_users || {};
        return {
          id: item.request_id || '',
          requestNumber: item.request_id || '', // Using request_id as requestNumber
          requesterName: userInfo.name || 'User',
          requesterTeam: userInfo.team || '',
          category: item.asset_type || '',
          assetType: item.asset_type || '',
          urgency: item.urgency || 'Medium',
          status: item.status || 'Pending',
          requestDate: item.created_at || '',
          currentStage: 'Pending' // Initial default
        } as any;
      });

      this.data.table = rawData;
      
      // Calculate live pending count from the API data
      this.pendingApprovalsCount = this.teamRequests.filter(r => r.status === 'Pending').length;
      
      console.log("Mapped team requests:", this.teamRequests);
    }).catch(err => {
      console.error("Error fetching requests:", err);
    });
  }
}
