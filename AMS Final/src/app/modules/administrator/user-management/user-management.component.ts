import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models/user.model';
import { AssetService } from '../../../core/services/asset.service';
import { Asset } from '../../../core/models/asset.model';
import { AdminDataService, Role, Project, Allocation, AssetTypeAssignment, AssignedAsset } from '../../../core/services/admin-data.service';
import { NotificationService } from '../../../core/services/notification.service';

type UserTab = 'users' | 'roles' | 'projects' | 'assignments';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  readonly employeeRoleName = 'Employee';
  readonly teamLeadRoleName = 'Team Lead';
  readonly assetManagerRoleName = 'Asset Manager';
  readonly assetTeamMemberRoleName = 'Asset Allocation Team';

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
  filteredProjects: Project[] = [];
  assetTypes: AssetTypeAssignment[] = [];
  allocations: Allocation[] = [];

  showAddUserModal = false;
  showAddRoleModal = false;
  showAddProjectModal = false;
  showAssignAssetModal = false;
  isSavingProject = false;
  isSavingUser = false;
  addUserEmailError = '';
  addProjectError = '';

  newRole: Partial<Role> = { name: '', code: '', description: '', isActive: true };
  newProject: Pick<Partial<Project>, 'name'> = { name: '' };
  newAllocation: Partial<Allocation> = { assetId: '', userId: '', department: '', status: 'Active' };
  newUser: {
    name: string;
    email: string;
    roleName: string;
    projectId: string;
    assetTypeId: string;
  } = {
    name: '',
    email: '',
    roleName: '',
    projectId: '',
    assetTypeId: ''
  };

  showProjectMembersModal = false;
  selectedProjectForMembers: Project | null = null;
  projectMembersList: User[] = [];

  showRoleMembersModal = false;
  selectedRoleForMembers: Role | null = null;
  roleMembersList: User[] = [];

  showEditModal = false;
  showInactiveModal = false;
  showAssetsModal = false;
  showChangePasswordModal = false;
  passwordChangeUser: User | null = null;
  newPassword = '';
  isSavingPassword = false;
  passwordError = '';

  isUpdatingUserStatus = false;
  editingUser: User | null = null;
  userToDeactivate: User | null = null;
  assetsToRelease: any[] = [];
  isCheckingAssetsBeforeDeactivate = false;
  selectedUser: User | null = null;
  selectedUserAssets: Asset[] = [];

  // Edit User Modal
  editUserForm: {
    email: string;
    roleName: string;
    projectId: string;
    assetTypeId: string;
  } = { email: '', roleName: '', projectId: '', assetTypeId: '' };
  isSavingEdit = false;
  editUserEmailError = '';
  editUserAssignedAssets: AssignedAsset[] = [];
  isLoadingEditAssets = false;

  showUserAssetsSidebar = false;
  selectedSidebarUser: User | null = null;
  allAssignedAssets: AssignedAsset[] = [];
  userAssignedAssets: AssignedAsset[] = [];
  isLoadingUserAssets = false;

  constructor(
    private assetService: AssetService,
    private adminDataService: AdminDataService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
    await this.loadRoles();
    await this.loadProjects();
    await this.loadAssetTypes();
    this.allocations = this.adminDataService.getAllocations();
    this.filterUsers();
    this.filterProjects();
  }

  // --- Project Management Additions ---

  openProjectMembersModal(project: Project): void {
    this.selectedProjectForMembers = project;
    // memberCount in projects is from user count by project
    this.projectMembersList = this.users.filter(u => u.projectName === project.name || u.projectId === project.id);
    this.showProjectMembersModal = true;
  }

  closeProjectMembersModal(): void {
    this.showProjectMembersModal = false;
    this.selectedProjectForMembers = null;
    this.projectMembersList = [];
  }

  openRoleMembersModal(role: Role): void {
    const targetRoleName = role.name.trim().toLowerCase();
    this.selectedRoleForMembers = role;
    this.roleMembersList = this.users.filter(u => 
      (u.role || '').toString().trim().toLowerCase() === targetRoleName
    );
    
    // Supplement with Asset Type names if needed
    if (role.name === this.assetManagerRoleName || role.name === this.assetTeamMemberRoleName) {
      this.roleMembersList.forEach(user => {
        if (user.assetTypeId && !user.assetTypeName) {
          const type = this.assetTypes.find(t => t.id === user.assetTypeId);
          if (type) {
             user.assetTypeName = type.name;
          }
        }
      });
    }
    
    this.showRoleMembersModal = true;
  }

  closeRoleMembersModal(): void {
    this.showRoleMembersModal = false;
    this.selectedRoleForMembers = null;
    this.roleMembersList = [];
  }

  async toggleProjectStatus(project: Project): Promise<void> {
    const newStatus = project.status === 'Active' ? 'Completed' : 'Active';
    const projectIdToUpdate = project.id || project.projectCode; // project_id
    if (!projectIdToUpdate) {
      this.notificationService.showToast('Unable to update project: Missing Project ID.', 'error');
      return;
    }

    try {
      await this.adminDataService.updateProjectStatus(projectIdToUpdate, newStatus);
      project.status = newStatus;
      this.notificationService.showToast(`Project ${project.name} marked as ${newStatus} successfully.`, 'success');
      // If we made it inactive, maybe reload projects just to be sure, though updating locally is fine
    } catch (e: any) {
      console.error('Error toggling project status:', e);
      this.notificationService.showToast('Failed to update project status. Please try again.', 'error');
    }
  }

  setTab(tab: UserTab): void {
    this.activeTab = tab;
  }

  // Modals for add
  openAddUserModal(): void {
    this.resetNewUserForm();
    this.showAddUserModal = true;
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
    this.isSavingUser = false;
    this.resetNewUserForm();
  }

  openAddRoleModal(): void { this.showAddRoleModal = true; }
  closeAddRoleModal(): void { this.showAddRoleModal = false; }

  openAddProjectModal(): void {
    this.newProject = { name: '' };
    this.showAddProjectModal = true;
  }

  closeAddProjectModal(): void {
    this.showAddProjectModal = false;
    this.isSavingProject = false;
    this.newProject = { name: '' };
    this.addProjectError = '';
  }

  openAssignAssetModal(): void { this.showAssignAssetModal = true; }
  closeAssignAssetModal(): void { this.showAssignAssetModal = false; }


  async openUserAssetsSidebar(user: User): Promise<void> {
    this.selectedSidebarUser = user;
    this.showUserAssetsSidebar = true;
    this.isLoadingUserAssets = true;
    this.userAssignedAssets = [];

    try {
      // Always fetch fresh data to ensure accuracy or use a slightly more nuanced caching strategy
      this.allAssignedAssets = await this.adminDataService.GetAllAssetsAssignedToAllUsers();
      this.userAssignedAssets = this.allAssignedAssets.filter(asset => asset.userId === user.id);
    } catch (error) {
      console.error('Error fetching assigned assets:', error);
    } finally {
      this.isLoadingUserAssets = false;
    }
  }

  closeUserAssetsSidebar(): void {
    this.showUserAssetsSidebar = false;
    this.selectedSidebarUser = null;
    this.userAssignedAssets = [];
  }

  onSearchTermChange(): void {
    if (this.activeTab === 'users') {
      this.filterUsers();
    } else if (this.activeTab === 'projects') {
      this.filterProjects();
    }
  }

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

  filterProjects(): void {
    this.filteredProjects = this.projects.filter(project => {
      if (!this.searchTerm) return true;
      return project.name.toLowerCase().includes(this.searchTerm.toLowerCase());
    });
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

  async openEditModal(user: User): Promise<void> {
    this.editingUser = { ...user };
    this.editUserForm = {
      email: user.email,
      roleName: user.role,
      projectId: user.projectId || '',
      assetTypeId: ''
    };
    this.editUserEmailError = '';
    this.isSavingEdit = false;
    this.showEditModal = true;

    // Load assigned assets for this user
    this.isLoadingEditAssets = true;
    this.editUserAssignedAssets = [];
    try {
      const allAssets = await this.adminDataService.GetAllAssetsAssignedToAllUsers();
      this.editUserAssignedAssets = allAssets.filter(a => a.userId === user.id);
    } catch (error) {
      console.error('Error loading edit user assets:', error);
    } finally {
      this.isLoadingEditAssets = false;
    }
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
    this.editUserForm = { email: '', roleName: '', projectId: '', assetTypeId: '' };
    this.editUserEmailError = '';
    this.editUserAssignedAssets = [];
    this.isSavingEdit = false;
  }

  openChangePasswordModal(user: User): void {
    this.passwordChangeUser = user;
    this.newPassword = '';
    this.passwordError = '';
    this.isSavingPassword = false;
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
    this.passwordChangeUser = null;
    this.newPassword = '';
    this.passwordError = '';
    this.isSavingPassword = false;
  }

  async saveNewPassword(): Promise<void> {
    if (!this.passwordChangeUser || !this.newPassword || this.isSavingPassword) return;
    
    if (this.newPassword.length < 8) {
        this.passwordError = 'Password must be at least 8 characters long.';
        return;
    }

    this.isSavingPassword = true;
    this.passwordError = '';

    try {
      await this.adminDataService.changeUserPassword(this.passwordChangeUser.email, this.newPassword);
      this.notificationService.showToast(`Password for \${this.passwordChangeUser.name} changed successfully.`, 'success');
      this.closeChangePasswordModal();
    } catch (e: any) {
      this.passwordError = 'Failed to change password. Please try again.';
      this.isSavingPassword = false;
    }
  }

  onEditUserEmailChange(email: string): void {
    this.editUserForm.email = email;
    const trimmed = email.trim().toLowerCase();
    // Allow same email as current user, but reject duplicates with other users
    if (trimmed && this.editingUser) {
      const isDuplicate = this.users.some(
        u => u.email.trim().toLowerCase() === trimmed && u.id !== this.editingUser!.id
      );
      this.editUserEmailError = isDuplicate ? 'This email already exists for another user.' : '';
    } else {
      this.editUserEmailError = '';
    }
  }

  onEditUserRoleChange(roleName: string): void {
    this.editUserForm.roleName = roleName;
    this.editUserForm.projectId = '';
    this.editUserForm.assetTypeId = '';
  }

  get editRequiresProject(): boolean {
    return this.editUserForm.roleName === this.employeeRoleName || this.editUserForm.roleName === this.teamLeadRoleName;
  }

  get editRequiresAssetType(): boolean {
    return this.editUserForm.roleName === this.assetTeamMemberRoleName || 
           this.editUserForm.roleName === this.assetManagerRoleName;
  }

  get canSaveEditUser(): boolean {
    if (this.isSavingEdit || !!this.editUserEmailError) {
      return false;
    }
    if (!this.editUserForm.email.trim() || !this.editUserForm.roleName) {
      return false;
    }
    return true;
  }

  async saveUser(): Promise<void> {
    if (!this.editingUser || !this.canSaveEditUser) {
      return;
    }

    this.isSavingEdit = true;

    try {
      const targetRoleName = this.editUserForm.roleName.trim().toLowerCase();
      const selectedRole = this.roles.find(r => r.name.trim().toLowerCase() === targetRoleName);
      const updates: {
        email?: string;
        roleId?: string;
        projectId?: string;
        assetTypeId?: string;
      } = {};

      // Only include changed fields
      if (this.editUserForm.email.trim() !== this.editingUser.email) {
        updates.email = this.editUserForm.email.trim();
      }
      if (this.editUserForm.roleName !== this.editingUser.role && selectedRole) {
        updates.roleId = selectedRole.id;
      }
      // Handle Project Clearing for roles like Asset Manager/Admin
      if (!this.editRequiresProject) {
        updates.projectId = '';
      } else if (this.editUserForm.projectId) {
        updates.projectId = this.editUserForm.projectId;
      }

      // Handle Asset Type Clearing for roles that don't need it
      if (!this.editRequiresAssetType) {
        updates.assetTypeId = '';
      } else if (this.editUserForm.assetTypeId) {
        updates.assetTypeId = this.editUserForm.assetTypeId;
      }

      await this.adminDataService.updateUserDetails(this.editingUser.id, updates);

      // If role changed to TeamLead and a project was selected, assign as TL
      if (updates.roleId && targetRoleName === this.teamLeadRoleName.toLowerCase() && this.editUserForm.projectId) {
        await this.adminDataService.assignTeamLeadToProject(this.editUserForm.projectId, this.editingUser.id);
      }

      // Reload from DB to reflect changes
      await this.loadUsers();
      await this.loadRoles();
      await this.loadProjects();
      this.filterUsers();
      this.notificationService.showToast('User details updated successfully!', 'success');
      this.closeEditModal();

    } catch (error) {
      console.error('Failed to update user:', error);
      this.isSavingEdit = false;
    }
  }

  onAddUserRoleChange(roleName: string): void {
    this.newUser.roleName = roleName;
    this.newUser.projectId = '';
    this.newUser.assetTypeId = '';
  }

  onAddUserEmailChange(email: string): void {
    this.newUser.email = email;
    this.addUserEmailError = this.isDuplicateEmail(email.trim())
      ? 'This email already exists. Same user cannot be added again.'
      : '';
  }

  async saveNewUser(): Promise<void> {
    const name = this.newUser.name.trim();
    const email = this.newUser.email.trim();
    const roleName = this.newUser.roleName;
    const selectedRole = this.roles.find(role => role.name === roleName);

    if (!name || !email || !selectedRole || this.isSavingUser) {
      return;
    }

    if (this.isDuplicateEmail(email)) {
      this.addUserEmailError = 'This email already exists. Same user cannot be added again.';
      return;
    }

    if (this.requiresProjectSelection && !this.newUser.projectId) {
      return;
    }

    if (this.requiresAssetTypeSelection && !this.newUser.assetTypeId) {
      return;
    }

    this.isSavingUser = true;

    try {
      const userId = this.generateNextUserId();
      await this.adminDataService.addUser({
        userId,
        name,
        email,
        roleId: selectedRole.id,
        projectId: this.newUser.projectId || undefined,
        assetTypeId: this.newUser.assetTypeId || undefined
      });
      if (roleName === this.teamLeadRoleName && this.newUser.projectId) {
        await this.adminDataService.assignTeamLeadToProject(this.newUser.projectId, userId);
      }
      await this.loadUsers();
      await this.loadProjects();
      this.filterUsers();
      this.notificationService.showToast(`User '${name}' created successfully!`, 'success');
      this.closeAddUserModal();

    } catch (error) {
      console.error('Unable to add new user.', error);
      this.isSavingUser = false;
    }
  }

  async saveProject(): Promise<void> {
    const projectName = this.newProject.name?.trim();

    if (!projectName || this.isSavingProject) {
      return;
    }

    // Duplicate check
    const isDuplicate = this.projects.some(p => p.name.trim().toLowerCase() === projectName.toLowerCase());
    if (isDuplicate) {
      this.addProjectError = 'Project name already exists. Please use a different name.';
      return;
    }

    this.isSavingProject = true;
    this.addProjectError = '';

    try {
      await this.adminDataService.addProject(projectName);
      await this.loadProjects();
      this.notificationService.showToast(`Project '${projectName}' added successfully!`, 'success');
      this.closeAddProjectModal();

    } catch (error) {
      console.error('Unable to add project.', error);
      this.addProjectError = 'Unable to add project. Please try again.';
      this.isSavingProject = false;
    }
  }

  async openInactiveModal(user: User): Promise<void> {
    this.userToDeactivate = user;
    this.showInactiveModal = true;
    this.assetsToRelease = [];

    // Only check assets if we are marking a user INACTIVE
    if (user.isActive) {
      this.isCheckingAssetsBeforeDeactivate = true;
      try {
        const allAssets = await this.assetService.fetchAllRawAssets();
        this.assetsToRelease = allAssets.filter(asset => asset.temp1 === user.id);
      } catch (error) {
        console.error('Error fetching assets before deactivation:', error);
      } finally {
        this.isCheckingAssetsBeforeDeactivate = false;
      }
    }
  }

  closeInactiveModal(): void {
    this.showInactiveModal = false;
    this.isUpdatingUserStatus = false;
    this.isCheckingAssetsBeforeDeactivate = false;
    this.userToDeactivate = null;
    this.assetsToRelease = [];
  }

  async confirmInactive(): Promise<void> {
    if (this.userToDeactivate && !this.isUpdatingUserStatus) {
      this.isUpdatingUserStatus = true;
      try {
        const nextStatus = !this.userToDeactivate.isActive;

        // 1. Release assets if user is being deactivated
        if (!nextStatus && this.assetsToRelease.length > 0) {
          for (const asset of this.assetsToRelease) {
            await this.assetService.releaseAsset(asset);
          }
        }

        // 2. Update user status in DB
        await this.adminDataService.updateUserActiveStatus(this.userToDeactivate.id, nextStatus);

        // 3. Update local state
        const updatedUser = { ...this.userToDeactivate, isActive: nextStatus };
        this.users = this.users.map(user => user.id === updatedUser.id ? updatedUser : user);
        this.filterUsers();
        this.notificationService.showToast(`User status marked as ${nextStatus ? 'Active' : 'Inactive'} successfully.`, 'success');
        this.closeInactiveModal();

      } catch (error) {
        console.error('Unable to mark user inactive.', error);
        this.isUpdatingUserStatus = false;
      }
    }
  }

  toggleUserActive(user: User): void {
    this.openInactiveModal(user).then();
  }

  get requiresProjectSelection(): boolean {
    return this.newUser.roleName === this.employeeRoleName || this.newUser.roleName === this.teamLeadRoleName;
  }

  get requiresAssetTypeSelection(): boolean {
    return this.newUser.roleName === this.assetManagerRoleName || this.newUser.roleName === this.assetTeamMemberRoleName;
  }

  get shouldShowProjectDropdown(): boolean {
    return this.requiresProjectSelection;
  }

  get shouldShowAssetTypeDropdown(): boolean {
    return this.requiresAssetTypeSelection;
  }

  get canSaveNewUser(): boolean {
    if (this.isSavingUser || !!this.addUserEmailError) {
      return false;
    }

    if (!this.newUser.name.trim() || !this.newUser.email.trim() || !this.newUser.roleName) {
      return false;
    }

    // Role-specific validation for Projects (Employee, Team Lead)
    if (this.requiresProjectSelection) {
      if (!this.newUser.projectId) return false;
      if (this.newUser.roleName === this.teamLeadRoleName && this.availableTeamLeadProjects.length === 0) return false;
    }

    // Role-specific validation for Asset Types (Asset Manager, Asset Team)
    if (this.requiresAssetTypeSelection) {
      if (!this.newUser.assetTypeId) return false;
      if (this.newUser.roleName === this.assetManagerRoleName && this.availableAssetTypesForNewUser.length === 0) return false;
      if (this.assetTypes.length === 0) return false;
    }

    return true;
  }

  get availableProjectsForNewUser(): Project[] {
    if (this.newUser.roleName === this.teamLeadRoleName) {
      return this.availableTeamLeadProjects;
    }

    if (this.newUser.roleName === this.employeeRoleName) {
      return this.projects;
    }

    return [];
  }

  get availableAssetTypesForNewUser(): AssetTypeAssignment[] {
    if (this.newUser.roleName === this.assetManagerRoleName) {
      return this.assetTypes.filter(assetType => !assetType.assetManager.trim());
    }

    if (this.newUser.roleName === this.assetTeamMemberRoleName) {
      return this.assetTypes;
    }

    return [];
  }

  get availableTeamLeadProjects(): Project[] {
    return this.projects.filter(project => !project.teamLead?.trim());
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
      this.users = (await this.adminDataService.GetAllUserRoleProjectDetails()).reverse();
      this.updateProjectMemberCounts();
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
      this.updateProjectMemberCounts();
      this.filterProjects();
    } catch (error) {
      console.error('Unable to load DB projects for admin user management.', error);
      this.projects = [];
      this.filteredProjects = [];
    }
  }

  private updateProjectMemberCounts(): void {
    if (!this.projects || !this.users || this.users.length === 0) return;
    
    this.projects.forEach(project => {
      // Calculate true membership count including both Employees and the Team Lead
      const members = this.users.filter(u => u.projectName === project.name || u.projectId === project.id);
      project.memberCount = members.length;
    });
  }

  private async loadAssetTypes(): Promise<void> {
    try {
      this.assetTypes = await this.adminDataService.getAssetTypeAssignmentDetails();
    } catch (error) {
      console.error('Unable to load DB asset types for admin user management.', error);
      this.assetTypes = [];
    }
  }

  private resetNewUserForm(): void {
    this.newUser = {
      name: '',
      email: '',
      roleName: '',
      projectId: '',
      assetTypeId: ''
    };
    this.addUserEmailError = '';
  }

  private generateNextUserId(): string {
    const nextNumber = this.users
      .map(user => {
        const match = user.id.match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;

    return `usr_${String(nextNumber).padStart(3, '0')}`;
  }

  private isDuplicateEmail(email: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    return !!normalizedEmail && this.users.some(user => user.email.trim().toLowerCase() === normalizedEmail);
  }
}
