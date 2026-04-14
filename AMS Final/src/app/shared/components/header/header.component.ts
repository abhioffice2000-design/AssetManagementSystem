import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  showWelcomeMessage = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateWelcomeMessageVisibility(event.urlAfterRedirects);
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.updateWelcomeMessageVisibility(this.router.url);
  }

  private updateWelcomeMessageVisibility(url: string): void {
    // Hide welcome on specific admin pages, but keep on dashboard and other modules
    if (
      url.includes('/admin/users') ||
      url.includes('/admin/master-data') ||
      url.includes('/admin/asset-configuration') ||
      url.includes('/admin/transactions')
    ) {
      this.showWelcomeMessage = false;
    } else {
      this.showWelcomeMessage = true;
    }
  }
}
