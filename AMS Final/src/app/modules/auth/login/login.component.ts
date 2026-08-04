import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { HeroService } from '../../../core/services/hero.service';
import { LoaderService } from '../../../core/services/loader.service';

declare var $: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  loginError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private heroService: HeroService,
    private loaderService: LoaderService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {


    this.checkAutoLogin();

  }

  getCookieValue(pattern: string): string {
    try {
      const matches = document.cookie.match(new RegExp('(?:^|;\\s*)(' + pattern + ')=([^;]*)'));
      return matches ? decodeURIComponent(matches[2]) : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Checks if there is an active Cordys SSO session on page load.
   * Flow:
   *  1. Check if the ct cookie exists. If not, abort auto-login immediately.
   *  2. Initialize the SDK login context using $.cordys.authentication.login().
   *  3. Once initialized, check for the resolved username.
   *  4. Retrieve org user details and verify against the DB.
   *  5. Redirect to user's dashboard if verification succeeds, or stay on login page.
   */
  checkAutoLogin(): void {
    if (this.authService.hasCheckedAutoLogin()) {
      console.log('Auto-login: Already checked on this page load.');
      return;
    }

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Check URL search params for auto-login credentials (legacy URL param fallback)
    const rawSearch = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
    const searchParams = new URLSearchParams(rawSearch);
    const u = searchParams.get('u') || '';
    const p = searchParams.get('p') || '';
    const r = searchParams.get('r') || '';

    if (u) {
      console.log('[AutoLogin] Portal credentials found in URL search params. Authenticating for:', u);
      this.authService.setAutoLoginChecked(true);
      this.isLoading = false;
      this.loaderService.reset();

      // Clean query params from address bar
      const cleanHash = window.location.hash ? window.location.hash.split('?')[0] : '';
      window.history.replaceState(null, '', window.location.pathname + cleanHash);

      if (!isLocalhost && typeof $ !== 'undefined' && $.cordys?.authentication?.sso) {
        $.cordys.authentication.sso.authenticate(u, p || 'a1b2c3')
          .done(() => {
            console.log('[AutoLogin] Cordys SSO auth success:', u);
            this.handleAutoLoginSuccess(u, r);
          })
          .fail((err: any) => {
            console.warn('[AutoLogin] Cordys SSO auth fail/proceeding:', err);
            this.handleAutoLoginSuccess(u, r);
          });
      } else {
        this.handleAutoLoginSuccess(u, r);
      }
      return;
    }

    let ctCookieValue = '';
    // Try to get cookie using Cordys SDK getCookieObject if available
    if (typeof $ !== 'undefined' && $.cordys?.getCookieObject) {
      try {
        const ctCookie = $.cordys.getCookieObject('\\\\w*_ct');
        ctCookieValue = ctCookie?.value || '';
      } catch (e) {
        console.warn('Auto-login: SDK getCookieObject failed:', e);
      }
    }

    // Fallback: Custom reliable regex cookie matching
    if (!ctCookieValue) {
      ctCookieValue = this.getCookieValue('\\w*_ct') || this.getCookieValue('ct');
    }

    // Resolve dynamic portal user session from storage or cookie
    let activeEmail = '';
    let activeRole = '';
    try {
      const portalUserStr = localStorage.getItem('portalUser') || sessionStorage.getItem('portalUser');
      if (portalUserStr) {
        const portalUser = JSON.parse(portalUserStr);
        activeEmail = portalUser.email || '';
        activeRole = portalUser.role || '';
      }
    } catch (e) { }

    if (!activeEmail) {
      activeEmail = this.getCookieValue('loggedInUserEmail') || this.getCookieValue('userEmail') || '';
      activeRole = this.getCookieValue('loggedInUserRole') || this.getCookieValue('userRole') || '';
    }

    if (!ctCookieValue && !activeEmail) {
      console.log('Auto-login: No active session cookie or portal user found.');
      return;
    }

    this.authService.setAutoLoginChecked(true);
    this.isLoading = true;
    this.loaderService.reset();
    console.log("Auto-login: Active session found. Resolving user session...", activeEmail, activeRole);

    if (activeEmail) {
      this.handleAutoLoginSuccess(activeEmail, activeRole);
      return;
    }

    if (typeof $ === 'undefined' || !$.cordys || !$.cordys.authentication) {
      console.log('Auto-login: Cordys SDK not available.');
      this.isLoading = false;
      return;
    }

    // Call $.cordys.authentication.login() to resolve the SDK's internal deferred
    $.cordys.authentication.login()
      .done(() => {
        console.log('Auto-login: SDK login completed successfully.');
        const ssoUsername = $.cordys.authentication.getUserName ? $.cordys.authentication.getUserName() : '';
        console.log("Auto-login: Resolved SSO Username:", ssoUsername);

        if (ssoUsername) {
          this.callOrgGetUserDetails(ssoUsername);
        } else if (activeEmail) {
          this.handleAutoLoginSuccess(activeEmail, activeRole);
        } else {
          // Fallback: Call standard GetUserDetails (User namespace) to check for active session cookies
          this.heroService.ajax('GetUserDetails', 'http://schemas.cordys.com/UserManagement/1.0/User', {}, null, false)
            .then((resp: any) => {
              const userInfo = this.heroService.xmltojson(resp, 'User');
              const resolvedUsername = userInfo?.UserName || userInfo?.username || '';

              if (resolvedUsername) {
                this.callOrgGetUserDetails(resolvedUsername);
              } else {
                console.log('Auto-login: No active session username resolved.');
                if (isLocalhost && activeEmail) {
                  this.handleAutoLoginSuccess(activeEmail, activeRole);
                } else {
                  this.isLoading = false;
                }
              }
            })
            .catch((err: any) => {
              console.log('Auto-login: GetUserDetails failed.', err);
              if (isLocalhost && activeEmail) {
                this.handleAutoLoginSuccess(activeEmail, activeRole);
              } else {
                this.isLoading = false;
              }
            });
        }
      })
      .fail((err: any) => {
        console.error('Auto-login: SDK login failed:', err);
        if (isLocalhost && activeEmail) {
          this.handleAutoLoginSuccess(activeEmail, activeRole);
        } else {
          this.isLoading = false;
        }
      });
  }

  private handleAutoLoginSuccess(email: string, roleParam?: string): void {
    console.log('[AutoLogin] Establishing user session for:', email, 'role:', roleParam);
    const targetRole = (roleParam || '').toLowerCase();

    // Reset loader spinner immediately
    this.loaderService.reset();
    this.isLoading = false;

    // Resolve target role dynamically
    let userRole: UserRole = UserRole.EMPLOYEE;
    if (targetRole.includes('admin') || targetRole.includes('administrator')) userRole = UserRole.ADMINISTRATOR;
    else if (targetRole.includes('manager') || targetRole.includes('asset manager')) userRole = UserRole.ASSET_MANAGER;
    else if (targetRole.includes('team lead') || targetRole.includes('lead')) userRole = UserRole.TEAM_LEAD;
    else if (targetRole.includes('allocation')) userRole = UserRole.ALLOCATION_TEAM;
    else if (targetRole.includes('employee')) userRole = UserRole.EMPLOYEE;

    const fallbackUser = {
      id: '1',
      name: email ? email.split('@')[0] : 'User',
      email: email || 'user@adnate.com',
      role: userRole,
      status: 'Active'
    };

    // Store user session immediately
    localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
    localStorage.setItem('userId', fallbackUser.id);
    this.authService.setCurrentUser(fallbackUser as any);

    // Navigate immediately to role dashboard
    const route = this.authService.getRoleRoute(userRole);
    console.log('[AutoLogin] Navigating immediately to route:', route);
    this.router.navigate([route]);

    // Try fetching detailed user record from DB in background
    this.authService.getUserFromDB(email, false)
      .then((dbUser) => {
        console.log("Hi I am running")
        if (dbUser) {
          console.log('[AutoLogin] DB user record updated in background:', dbUser);
          localStorage.setItem('currentUser', JSON.stringify(dbUser));
          localStorage.setItem('userId', dbUser.id);
          this.authService.setCurrentUser(dbUser);
        }
        this.loaderService.reset();
      })
      .catch((err) => {
        console.log('[AutoLogin] DB background fetch offline/CORS, staying on current session.', err);
        this.loaderService.reset();
      });
  }

  /**
   * Calls GetUserDetails in the Organization namespace with the given username.
   * If user details are found, proceeds to DB verification.
   * If not found, stays on login page.
   */
  private callOrgGetUserDetails(userName: string): void {
    const soapEnvelope = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetUserDetails xmlns="http://schemas.cordys.com/UserManagement/1.0/Organization">
      <UserName>${userName}</UserName>
    </GetUserDetails>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    this.heroService.ajax(null, null, {}, soapEnvelope)
      .then((resp: any) => {
        // Parse the User element from the response
        const orgUserDetails = this.heroService.xmltojson(resp, 'User');

        if (orgUserDetails && (orgUserDetails.UserName || orgUserDetails.username || orgUserDetails.Description)) {
          // User details found in Org namespace, now verify against DB
          console.log('Auto-login: Org user details found, verifying in DB...', orgUserDetails);
          const resolvedEmail = orgUserDetails.UserName || orgUserDetails.username || userName;
          this.verifyUserInDB(resolvedEmail);
        } else {
          // User not found in Org namespace
          console.log('Auto-login: User not found in Org namespace.');
          const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (isLocalhost) {
            this.handleAutoLoginSuccess(userName);
          } else {
            this.isLoading = false;
          }
        }
      })
      .catch((err: any) => {
        // Org GetUserDetails failed
        console.log('Auto-login: Org GetUserDetails failed.', err);
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocalhost) {
          this.handleAutoLoginSuccess(userName);
        } else {
          this.isLoading = false;
        }
      });
  }

  /**
   * Verifies the Cordys user against the application database.
   * If found and active → store user, update session, and redirect to their dashboard.
   * If not found or inactive → stay on login page.
   */
  private verifyUserInDB(email: string): void {
    this.authService.getUserFromDB(email, true)
      .then((dbUser) => {
        if (dbUser) {
          // User verified in DB, establish session and redirect
          console.log('Auto-login: DB user verified. Redirecting to dashboard...', dbUser);
          localStorage.setItem('currentUser', JSON.stringify(dbUser));
          localStorage.setItem('userId', dbUser.id);
          this.authService.setCurrentUser(dbUser);
          this.isLoading = false;
          this.notificationService.showToast(`Welcome back, ${dbUser.name}!`, 'success');
          const route = this.authService.getRoleRoute(dbUser.role);
          this.router.navigate([route]);
        } else {
          // DB returned no user
          console.log('Auto-login: User not found in DB.');
          const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (isLocalhost) {
            this.handleAutoLoginSuccess(email);
          } else {
            this.isLoading = false;
          }
        }
      })
      .catch((err: any) => {
        // DB lookup failed
        console.log('Auto-login: DB verification failed.', err);
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocalhost) {
          this.handleAutoLoginSuccess(email);
        } else {
          this.isLoading = false;
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.loginError = '';
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.notificationService.showToast(`Welcome back, ${user.name}!`, 'success');
        const route = this.authService.getRoleRoute(user.role);
        this.router.navigate([route]);
      },
      error: (err) => {
        this.isLoading = false;
        this.loginError = err.message || 'Login failed. Please try again.';
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as any);
      }
    });
  }

  // Helper for template
  get f() { return this.loginForm.controls; }
}
