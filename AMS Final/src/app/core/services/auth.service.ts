import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { delay, tap, switchMap, map, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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

  constructor(private router: Router, private http: HttpClient) {
    const savedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User>(savedUser ? JSON.parse(savedUser) : null);
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

  register(userData: any): Observable<User> {
    const cordysUrl = '/cordys/com.eibus.web.soap.Gateway.wcp';
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'text/xml',
        'Accept': 'text/xml'
      }),
      responseType: 'text' as 'json' // Required because SOAP returns XML, not JSON
    };

    const userName = `${userData.firstName} ${userData.lastName}`;
    const email = userData.email;
    const userId = `USR${Date.now()}`;

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
                <Role application="">AMS_Employee</Role>
              </Roles>
            </User>
          </CreateUserInOrganization>
        </SOAP:Body>
      </SOAP:Envelope>
    `;

    const updateUsersSoap = `
      <SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
        <SOAP:Body>
          <UpdateM_users xmlns="http://schemas.cordys.com/AMS_Database_Metadata" reply="yes" commandUpdate="no" preserveSpace="no" batchUpdate="no">
            <tuple>
              <new>
                <m_users qAccess="0" qConstraint="0" qInit="0" qValues="">
                  <user_id>${userId}</user_id>
                  <name>${userName}</name>
                  <email>${email}</email>
                  <role_id>AMS_Employee</role_id>
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
      </SOAP:Envelope>
    `;

    return this.http.post<any>(cordysUrl, createUserSoap, httpOptions).pipe(
      switchMap(() => this.http.post<any>(cordysUrl, updateUsersSoap, httpOptions)),
      map(() => {
        const newUser: User = {
          id: userId,
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
        
        this.mockUsers.push(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        this.currentUserSubject.next(newUser);
        
        return newUser;
      }),
      catchError(error => {
        console.error('Registration SOAP API Error:', error);
        return throwError(() => new Error('Registration failed over SOAP connection.'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null as any);
    this.router.navigate(['/auth/login']);
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
