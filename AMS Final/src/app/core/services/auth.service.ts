import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { Router } from '@angular/router';
import { of, throwError, from } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HeroService } from './hero.service';

declare var $: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
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

  constructor(private router: Router, private http: HttpClient, private hs: HeroService) {
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<User> {
    // Mock login logic
    const user = this.mockUsers.find(u => u.email === email);
    if (user) {
      return of(user).pipe(
        delay(1000),
        tap(u => {
          localStorage.setItem('currentUser', JSON.stringify(u));
          this.currentUserSubject.next(u);
        })
      );
    }
    return new Observable(subscriber => {
      setTimeout(() => subscriber.error({ message: 'Invalid credentials' }), 1000);
    });
  }

  /**
   * Wraps the jQuery Deferred from $.cordys.authentication.sso.authenticate into a proper Promise.
   */
  private ssoAuthenticate(username: string, password: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      $.cordys.authentication.sso.authenticate(username, password)
        .done(() => {
          console.log(`SSO authentication successful for: ${username}`);
          resolve();
        })
        .fail((err: any) => {
          console.warn(`SSO authentication failed for: ${username}`, err);
          reject(err);
        });
    });
  }

  /**
   * Thoroughly clears all session data, storage, and cookies.
   * This is used during the registration flow to ensure the admin session
   * is completely removed before logging in as the new user.
   */
  private ssoLogout(): void {
    try {
      console.log('Clearing session and cookies...');

      // Preserve the current theme
      const currentTheme = this.themeSubject.value;

      sessionStorage.clear();
      localStorage.clear();

      // Restore theme and any critical items
      this.themeSubject.next(currentTheme);
      document.documentElement.setAttribute('data-theme', currentTheme);

      this.clearAllCookies();

      if (typeof $ !== 'undefined' && $?.cordys?.authentication?.sso) {
        // Use the SSO logout if available
        if (typeof $.cordys.authentication.sso.logout === 'function') {
          $.cordys.authentication.sso.logout();
        } else if (typeof $.cordys.authentication.logout === 'function') {
          $.cordys.authentication.logout();
        }
      }

      console.log('SSO session cleared successfully.');
    } catch (e) {
      console.warn('SSO session clearing had issues, continuing anyway:', e);
    }
  }

  private clearAllCookies(): void {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
  }

  register(userData: any): Observable<User> {
    return new Observable<User>(observer => {
      this.executeRegistration(userData)
        .then(newUser => {
          observer.next(newUser);
          observer.complete();
        })
        .catch(err => {
          observer.error(err);
        });
    });
  }

  /**
   * Async registration flow:
   * 1. SSO auth with admin (sourabhs)
   * 2. Create new user in Cordys
   * 3. SSO logout
   * 4. SSO auth with new user
   * 5. DB entry saving
   */
  private async executeRegistration(userData: any): Promise<User> {
    const userName = `${userData.firstName} ${userData.lastName}`;
    const email = userData.email;

    // Role mapping:
    // AMS_Employee = Employee        | rol_03
    // AMS_Admin = Admin
    // AMS_AssetManager = Asset Manager
    // AMS_TeamLead = Team Lead
    // AMS_AssetAllocationTeam = Asset Allocation Team
    const cordysRole = 'AMS_Employee';
    const dbRoleId = 'rol_03';

    const createUserSoap = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <CreateUserInOrganization xmlns="http://schemas.cordys.com/UserManagement/1.0/Organization">
      <User>
        <UserName isAnonymous="">${email}</UserName>
        <Description>${userName}</Description>
        <Credentials allowDuplicate="true">
          <UserIDPassword>
            <UserID>${email}</UserID>
            <Password>${userData.password}</Password>
          </UserIDPassword>
        </Credentials>
        <Roles>
          <Role application="">${cordysRole}</Role>
        </Roles>
      </User>
    </CreateUserInOrganization>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    const updateUsersSoap = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <UpdateM_users xmlns="http://schemas.cordys.com/AMS_Database_Metadata" reply="yes" commandUpdate="no" preserveSpace="no" batchUpdate="no">
      <tuple>
        <new>
          <m_users qAccess="0" qConstraint="0" qInit="0" qValues="">
            <name>${userName}</name>
            <email>${email}</email>
            <role_id>${dbRoleId}</role_id>
            <status>Active</status>
            <project_id>null</project_id>
            <asset_type_id>null</asset_type_id>
            <created_at>${new Date().toISOString()}</created_at>
            <temp1>null</temp1>
            <temp2>null</temp2>
            <temp3>null</temp3>
            <temp4>null</temp4>
            <temp5>null</temp5>
            <temp6>null</temp6>
            <temp7>null</temp7>
          </m_users>
        </new>
      </tuple>
    </UpdateM_users>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      // Step 1: SSO authenticate as admin
      debugger;
      console.log('Step 1: SSO authenticating as admin (sourabhs)...');
      await this.ssoAuthenticate('sourabhs', 'sourabhs');
      debugger;
      // Step 2: Create new user in Cordys
      console.log('Step 2: Creating user in Cordys...');
      const createResp = await this.hs.ajax(null, null, {}, createUserSoap);
      console.log('Step 2 result:', this.hs.xmltojson(createResp, 'User'));

      // Step 3: SSO logout
      console.log('Step 3: Logging out admin session...');
      //   await this.ssoLogout();
      debugger;
      // Step 4: SSO authenticate as the new user
      console.log('Step 4: SSO authenticating as new user...');
      // await this.ssoAuthenticate(email, userData.password);
      debugger;
      // Step 5: Save user details in DB
      console.log('Step 5: Saving user to database...');
      const dbResp = await this.hs.ajax(null, null, {}, updateUsersSoap);
      console.log('Step 5 result:', this.hs.xmltojson(dbResp, 'm_users'));

      // Build and return the local user object
      const newUser: User = {
        id: email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: userName,
        email: userData.email,
        phone: userData.phoneNumber,
        role: UserRole.EMPLOYEE,
        department: userData.department || 'IT',
        team: 'New Joiners',
        designation: 'Associate',
        isActive: true,
        joinDate: new Date().toISOString().split('T')[0]
      };

      //   this.mockUsers.push(newUser);
      //    localStorage.setItem('currentUser', JSON.stringify(newUser));
      //  this.currentUserSubject.next(newUser);

      return newUser;

    } catch (err: any) {
      console.error('Registration failed at:', err);
      const errorText = err?.responseText || err?.message || String(err) || '';
      if (errorText.toLowerCase().includes('already') || errorText.toLowerCase().includes('duplicate') || errorText.toLowerCase().includes('exist')) {
        throw new Error('This email id is already used, try with some other id');
      }
      throw new Error(err?.message || 'Registration failed. Please try again.');
    }
  }

  logout(): void {
    try {
      // Preserve theme across logout
      const currentTheme = this.themeSubject.value;

      sessionStorage.clear();
      localStorage.clear();

      // Restore theme and current role (if applicable)
      this.themeSubject.next(currentTheme);

      this.clearAllCookies();

      if (typeof $ !== 'undefined' && $?.cordys?.authentication?.sso) {
        $.cordys.authentication.sso.logout();
      }

      this.currentUserSubject.next(null);
      this.router.navigate(['/auth/login']);
    } catch (e) {
      console.error('Logout error:', e);
      this.router.navigate(['/auth/login']);
    }
  }

  getCurrentUser(): User | null {
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
