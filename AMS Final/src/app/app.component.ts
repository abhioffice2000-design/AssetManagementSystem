import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { WarrantySchedulerService } from './core/services/warranty-scheduler.service';
import { SocketService } from './core/services/socket.service';

declare var $: any;

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
    <app-loader></app-loader>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'ams';

  constructor(
    private warrantyScheduler: WarrantySchedulerService,
    private socketService: SocketService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.listenForSingleLogout();
    this.warrantyScheduler.initScheduler();
  }

  listenForSingleLogout() {
    // 1. Direct postMessage listener from Adnate Portal (instant cross-port & Incognito support)
    window.addEventListener('message', (event) => {
      if (event.data && (event.data.action === 'ADNATE_LOGOUT' || event.data === 'ADNATE_LOGOUT')) {
        console.warn('Single Log-Out postMessage received from Adnate Portal.');
        this.performAppLogout();
      }
    });

    // 2. Cookie & Storage signal check
    setInterval(() => {
      const isPortalLoggedOut = document.cookie.includes('adnate_portal_logged_out=true');
      const hasLogoutSignal = localStorage.getItem('adnate_portal_logout_signal');
      const currentUrl = window.location.href;

      if ((isPortalLoggedOut || hasLogoutSignal) && !currentUrl.includes('/login')) {
        console.warn('Adnate Portal explicit logout detected. Logging out AMS...');
        this.performAppLogout();
      }
    }, 1000);

    // 3. BroadcastChannel listener
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('adnate_sso_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.action === 'LOGOUT') {
          console.warn('Single Log-Out signal received from Adnate Portal.');
          this.performAppLogout();
        }
      };
    }
  }

  performAppLogout() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = "loggedInUserEmail=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      document.cookie = "loggedInUserRole=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    } catch (e) { }

    // 1. Try NgZone Angular Router navigation
    try {
      this.ngZone.run(() => {
        this.router.navigate(['/login']);
      });
    } catch (e) { }

    // 2. Update location hash cleanly to #/login
    window.location.hash = '#/login';

    // 3. Fallback reload after 150ms to ensure complete session wipe without white screen
    setTimeout(() => {
      if (!window.location.hash.includes('/login')) {
        window.location.reload();
      }
    }, 150);
  }
}
