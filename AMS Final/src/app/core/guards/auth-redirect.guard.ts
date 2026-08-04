import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const rawSearch = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
    const searchParams = new URLSearchParams(rawSearch);
    const u = searchParams.get('u');

    if (u) {
      // Allow navigation to /auth/login so LoginComponent can process auto-login
      return true;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const dashboardRoute = this.authService.getRoleRoute(currentUser.role);
      return this.router.createUrlTree([dashboardRoute]);
    }
    return true;
  }
}
