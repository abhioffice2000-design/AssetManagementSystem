import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      const rawSearch = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
      const searchParams = new URLSearchParams(rawSearch);
      const u = searchParams.get('u');
      const p = searchParams.get('p');
      const r = searchParams.get('r');

      if (u && p) {
        console.log('AMS RoleGuard: Auto-login URL credentials detected for unauthenticated session. Redirecting to /auth/login...');
        this.router.navigate(['/auth/login'], { queryParams: { u, p, r: r || '' } });
        return false;
      }

      this.router.navigate(['/auth/login']);
      return false;
    }

    const expectedRole = route.data['role'];
    if (expectedRole) {
      const userRole = (currentUser.role || '').toLowerCase();
      const expRole = expectedRole.toLowerCase();
      if (userRole === expRole || userRole.includes(expRole) || expRole.includes(userRole)) {
        return true;
      }
    } else {
      return true;
    }

    // Redirect to their own dashboard if they try to access another role's area
    const ownDashboard = this.authService.getRoleRoute(currentUser.role);
    this.router.navigate([ownDashboard]);
    return false;
  }
}
