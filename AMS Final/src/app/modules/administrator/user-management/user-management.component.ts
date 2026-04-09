import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models/user.model';
import { AssetService } from '../../../core/services/asset.service';
import { Asset } from '../../../core/models/asset.model';
import { AdminDataService, Role, Project, Allocation } from '../../../core/services/admin-data.service';

type UserTab = 'users' | 'roles' | 'projects' | 'assignments';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm = '';
  selectedRole = '';
  userRoles: string[] = [];
  currentPage = 1;
  pageSize = 5;

  activeTab: UserTab = 'users';

  roles: Role[] = [];
  projects: Project[] = [];
  allocations: Allocation[] = [];

  showAddUserModal = false;
  showAddRoleModal = false;
  showAddProjectModal = false;
  showAssignAssetModal = false;

  newRole: Partial<Role> = { name: '', code: '', description: '', isActive: true };
  newProject: Partial<Project> = { name: '', projectCode: '', department: '', teamLead: '', status: 'Active' };
  newAllocation: Partial<Allocation> = { assetId: '', userId: '', department: '', status: 'Active' };

  showEditModal = false;
  showInactiveModal = false;
  showAssetsModal = false;
  editingUser: User | null = null;
  userToDeactivate: User | null = null;
  selectedUser: User | null = null;
  selectedUserAssets: Asset[] = [];

  constructor(
    private assetService: AssetService,
    private adminDataService: AdminDataService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
    await this.loadRoles();
    await this.loadProjects();
    this.allocations = this.adminDataService.getAllocations();
    this.filterUsers();
  }

  setTab(tab: UserTab): void {
    this.activeTab = tab;
  }

  // Modals for add
  openAddUserModal(): void { this.showAddUserModal = true; }
  closeAddUserModal(): void { this.showAddUserModal = false; }

  openAddRoleModal(): void { this.showAddRoleModal = true; }
  closeAddRoleModal(): void { this.showAddRoleModal = false; }

  openAddProjectModal(): void { this.showAddProjectModal = true; }
  closeAddProjectModal(): void { this.showAddProjectModal = false; }

  openAssignAssetModal(): void { this.showAssignAssetModal = true; }
  closeAssignAssetModal(): void { this.showAssignAssetModal = false; }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch =
        !this.searchTerm ||
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesRole = !this.selectedRole || user.role === this.selectedRole;
      return matchesSearch && matchesRole;
    });
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  getRangeStart(): number {
    return this.filteredUsers.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  getRoleBadgeClass(role: string): string {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('admin')) {
      return 'badge-blue';
    }
    if (normalizedRole.includes('asset manager')) {
      return 'badge-green';
    }
    if (normalizedRole.includes('allocation')) {
      return 'badge-amber';
    }
    if (normalizedRole.includes('lead')) {
      return 'badge-teal';
    }
    return 'badge-default';
  }

  openEditModal(user: User): void {
    // Clone user to avoid modifying table data directly before saving
    this.editingUser = { ...user };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
  }

  saveUser(): void {
    if (this.editingUser) {
      this.users = this.users.map(user => user.id === this.editingUser!.id ? { ...this.editingUser! } : user);
      this.filterUsers();
      this.closeEditModal();
    }
  }

  openInactiveModal(user: User): void {
    this.userToDeactivate = user;
    this.showInactiveModal = true;
  }

  closeInactiveModal(): void {
    this.showInactiveModal = false;
    this.userToDeactivate = null;
  }

  confirmInactive(): void {
    if (this.userToDeactivate) {
      const updatedUser = { ...this.userToDeactivate, isActive: false };
      this.users = this.users.map(user => user.id === updatedUser.id ? updatedUser : user);
      this.filterUsers();
      this.closeInactiveModal();
    }
  }

  toggleUserActive(user: User): void {
    const updatedUser = { ...user, isActive: !user.isActive };
    this.users = this.users.map(item => item.id === updatedUser.id ? updatedUser : item);
    this.filterUsers();
  }

  openAssetsModal(user: User): void {
    this.selectedUser = user;
    this.selectedUserAssets = this.assetService.getAssetsByUser(user.id);
    this.showAssetsModal = true;
  }

  closeAssetsModal(): void {
    this.showAssetsModal = false;
    this.selectedUser = null;
    this.selectedUserAssets = [];
  }

  private async loadUsers(): Promise<void> {
    try {
      this.users = await this.adminDataService.GetAllUserRoleProjectDetails();
    } catch (error) {
      console.error('Unable to load DB users for admin user management.', error);
      this.users = [];
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      this.roles = await this.adminDataService.getRolesFromDB();
      this.userRoles = this.roles.map(role => role.name);
    } catch (error) {
      console.error('Unable to load DB roles for admin user management.', error);
      this.roles = [];
      this.userRoles = [];
    }
  }

  private async loadProjects(): Promise<void> {
    try {
      this.projects = await this.adminDataService.getProjectsFromDB();
    } catch (error) {
      console.error('Unable to load DB projects for admin user management.', error);
      this.projects = [];
    }
  }
}
