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



  constructor(private router: Router, private http: HttpClient, private hs: HeroService) {
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<User> {
    return new Observable<User>(observer => {
      this.executeLogin(email, password)
        .then(user => {
          console.log('Login successful, user data obtained:', user);
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          observer.next(user);
          observer.complete();
        })
        .catch(err => {
          console.error('Login flow failed overall:', err);
          observer.error(err);
        });
    });
  }

  private async executeLogin(email: string, password: string): Promise<User> {
    // 1. SSO Authenticate
    await this.ssoAuthenticate(email, password);

    // 2. Fetch User Details from DB
    return await this.getUserFromDB(email);
  }

  private async getUserFromDB(email: string): Promise<User> {
    const getAllUsersSoap = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <Getallusers xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    console.log('Step 2: Fetching all users from DB...');
    const resp = await this.hs.ajax(null, null, {}, getAllUsersSoap);
    console.log('Step 2: DB response received:', resp);

    let usersData = this.hs.xmltojson(resp, 'm_users');
    console.log('Step 2: Parsed users data:', usersData);

    if (!usersData) {
      console.warn('Step 2: No user records found in database.');
      throw new Error('User record not found in database.');
    }

    // Ensure it's an array for searching
    if (!Array.isArray(usersData)) {
      usersData = [usersData];
    }

    // Find the user by local search (since Getallusers returns the whole list)
    const userData = usersData.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!userData) {
      console.warn('Step 2: User record not found in the list for email:', email);
      throw new Error('User record not found in database.');
    }

    return {
      id: userData.email,
      name: userData.name,
      email: userData.email,
      role: this.mapRoleIdToUserRole(userData.role_id),
      department: userData.department || 'IT',
      team: userData.team || 'General',
      designation: userData.designation || 'Specialist',
      isActive: userData.status === 'Active',
      joinDate: userData.created_at || new Date().toISOString().split('T')[0]
    };
  }

  private mapRoleIdToUserRole(roleId: string): UserRole {
    switch (roleId) {
      case 'rol_01': return UserRole.ADMINISTRATOR;
      case 'rol_02': return UserRole.TEAM_LEAD;
      case 'rol_03': return UserRole.EMPLOYEE;
      case 'rol_04': return UserRole.ASSET_MANAGER;
      case 'rol_05': return UserRole.ALLOCATION_TEAM;
      default: return UserRole.EMPLOYEE;
    }
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

      /* 
      // Commented out as this triggers a GET request to Gateway.wcp causing 500 errors in this environment
      if (typeof $ !== 'undefined' && $.cordys?.authentication) {
        if (typeof $.cordys.authentication.logout === 'function') {
          $.cordys.authentication.logout();
        } else if ($.cordys.authentication.sso && typeof $.cordys.authentication.sso.logout === 'function') {
          $.cordys.authentication.sso.logout();
        }
      }
      */

      console.log('SSO session cleared successfully.');
    } catch (e) {
      console.warn('SSO session clearing had issues, continuing anyway:', e);
    }
  }

  private clearAllCookies(): void {
    const cookies = document.cookie.split(";");
    const domain = window.location.hostname;
    const path = '/';

    console.log('Performing aggressive session purge...');

    // Explicitly target known Cordys and Session cookies
    const targetCookies = ['SAMLart', 'ct', 'saml', 'JSESSIONID', 'CordysUser'];

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

      // Standard expiry
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path + ";domain=" + domain;

      // Try without leading dot for domain if applicable
      if (domain.startsWith('.')) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path + ";domain=" + domain.substring(1);
      }
    }

    // Force clear known targets just in case they weren't in the enumerable list
    targetCookies.forEach(name => {
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path + ";domain=" + domain;
    });

    console.log('Cookies and local session artifacts cleared.');
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

      //   localStorage.setItem('currentUser', JSON.stringify(newUser));
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

      /* 
      // Commented out as this triggers a GET request to Gateway.wcp causing 500 errors in this environment
      if (typeof $ !== 'undefined' && $.cordys?.authentication) {
        console.log('Executing Cordys logout...');
        if (typeof $.cordys.authentication.logout === 'function') {
          $.cordys.authentication.logout();
        } else if ($.cordys.authentication.sso && typeof $.cordys.authentication.sso.logout === 'function') {
          $.cordys.authentication.sso.logout();
        }
      }
      */

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
