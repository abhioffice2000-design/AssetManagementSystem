import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser$: Observable<User>;
  private themeSubject = new BehaviorSubject<string>('light');
  public theme$ = this.themeSubject.asObservable();

  private mockUsers: User[] = [
    {
      id: 'USR001', name: 'Admin User', email: 'admin@adnate.com',
      role: UserRole.ADMINISTRATOR, department: 'IT', team: 'System Admin',
      designation: 'System Administrator', isActive: true, joinDate: '2023-01-15'
    },
    {
      id: 'USR002', name: 'Rajesh Kumar', email: 'rajesh@adnate.com',
      role: UserRole.ASSET_MANAGER, department: 'IT', team: 'Asset Management',
      designation: 'Senior Asset Manager', isActive: true, joinDate: '2023-03-10'
    },
    {
      id: 'USR003', name: 'Priya Sharma', email: 'priya@adnate.com',
      role: UserRole.ALLOCATION_TEAM, department: 'IT', team: 'Asset Allocation',
      designation: 'Asset Allocation Specialist', isActive: true, joinDate: '2023-05-20'
    },
    {
      id: 'USR004', name: 'Suresh Patel', email: 'suresh@adnate.com',
      role: UserRole.TEAM_LEAD, department: 'Engineering', team: 'Frontend',
      designation: 'Team Lead', isActive: true, joinDate: '2022-08-01',
      managerId: 'USR002'
    },
    {
      id: 'USR005', name: 'Ananya Desai', email: 'ananya@adnate.com',
      role: UserRole.EMPLOYEE, department: 'Engineering', team: 'Frontend',
      designation: 'Software Engineer', isActive: true, joinDate: '2024-01-10',
      managerId: 'USR004'
    }
  ];

  constructor() {
    this.currentUserSubject = new BehaviorSubject<User>(this.mockUsers[4]);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  getCurrentUser(): User {
    return this.currentUserSubject.value;
  }

  switchRole(role: UserRole): void {
    const user = this.mockUsers.find(u => u.role === role);
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  getAllRoleUsers(): User[] {
    return this.mockUsers;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  toggleTheme(): void {
    const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.themeSubject.next(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  getTheme(): string {
    return this.themeSubject.value;
  }

  getRoleRoute(role: UserRole): string {
    switch (role) {
      case UserRole.ADMINISTRATOR: return '/admin';
      case UserRole.ASSET_MANAGER: return '/asset-manager';
      case UserRole.ALLOCATION_TEAM: return '/allocation';
      case UserRole.TEAM_LEAD: return '/team-lead';
      case UserRole.EMPLOYEE: return '/employee';
      default: return '/employee';
    }
  }
}
