import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { User, UserRole } from '../../../core/models/user.model';
import { AssetService } from '../../../core/services/asset.service';
import { Asset } from '../../../core/models/asset.model';

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
  userRoles = Object.values(UserRole);
  currentPage = 1;
  pageSize = 5;

  showEditModal = false;
  showInactiveModal = false;
  showAssetsModal = false;
  editingUser: User | null = null;
  userToDeactivate: User | null = null;
  selectedUser: User | null = null;
  selectedUserAssets: Asset[] = [];

  constructor(
    private userService: UserService,
    private assetService: AssetService
  ) {}

  ngOnInit(): void {
    this.users = this.userService.getUsers();
    this.filterUsers();
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
    const map: Record<string, string> = {
      [UserRole.ADMINISTRATOR]: 'badge-blue',
      [UserRole.ASSET_MANAGER]: 'badge-green',
      [UserRole.ALLOCATION_TEAM]: 'badge-amber',
      [UserRole.TEAM_LEAD]: 'badge-teal',
      [UserRole.EMPLOYEE]: 'badge-default'
    };
    return map[role] || 'badge-default';
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
      this.userService.updateUser(this.editingUser);
      // Refresh list
      this.users = this.userService.getUsers();
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
      this.userService.updateUser(updatedUser);
      // Refresh list
      this.users = this.userService.getUsers();
      this.filterUsers();
      this.closeInactiveModal();
    }
  }

  toggleUserActive(user: User): void {
    const updatedUser = { ...user, isActive: !user.isActive };
    this.userService.updateUser(updatedUser);
    this.users = this.userService.getUsers();
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
}
