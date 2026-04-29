import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HeroService } from './hero.service';
import { interval, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WarrantySchedulerService {
  private configUrl = 'assets/config/scheduler-config.json';
  private schedulerSub: Subscription | null = null;

  constructor(private http: HttpClient, private hs: HeroService) {
    // We don't auto-init here because it might cause issues during testing
    // It should be initialized by a component or the main app
  }

  /**
   * Initializes the daily scheduler check.
   * Runs every hour to check if the daily threshold has been met.
   */
  initScheduler() {
    if (this.schedulerSub) return;

    console.log('[WarrantyScheduler] Initializing automated daily check...');
    
    // Check every hour (3600000 ms)
    this.schedulerSub = interval(3600000).subscribe(() => {
      this.checkAndRunScheduler();
    });
    
    // Initial check on startup
    this.checkAndRunScheduler();
  }

  async checkAndRunScheduler() {
    try {
      // Use no-cache to get latest config
      const config = await this.http.get<any>(`${this.configUrl}?t=${Date.now()}`).toPromise();
      if (!config || !config.enabled) return;

      const lastRun = localStorage.getItem('warranty_scheduler_last_run');
      const today = new Date().toISOString().split('T')[0];

      // If already run today, skip
      if (lastRun === today) {
        console.log('[WarrantyScheduler] Already executed today. Skipping.');
        return;
      }

      const now = new Date();
      const [hour, min] = config.time.split(':');
      const scheduledTime = new Date();
      scheduledTime.setHours(parseInt(hour, 10), parseInt(min, 10), 0, 0);

      // Check if current time is past the scheduled time
      if (now >= scheduledTime) {
        console.log(`[WarrantyScheduler] Execution time reached (${config.time}). Triggering emails...`);
        await this.triggerWarrantyEmails(config.duration);
        localStorage.setItem('warranty_scheduler_last_run', today);
      } else {
        console.log(`[WarrantyScheduler] Not yet time to run. Scheduled for: ${config.time}`);
      }
    } catch (e) {
      console.warn('[WarrantyScheduler] Could not process scheduler task:', e);
    }
  }

  /**
   * Sends the SOAP request to the backend to trigger warranty emails.
   */
  async triggerWarrantyEmails(days: number) {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <TriggerWarrantyExtensionEmails xmlns="http://schemas.cordys.com/AMS_Database_Metadata">
      <daysBefore>${days}</daysBefore>
    </TriggerWarrantyExtensionEmails>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      console.log(`[WarrantyScheduler] SUCCESS: SOAP request triggered for ${days} days threshold.`, response);
      return response;
    } catch (err) {
      console.error('[WarrantyScheduler] FAILED to trigger SOAP request:', err);
      throw err;
    }
  }

  /**
   * Manually triggers the check (e.g., from the Admin UI)
   */
  async runNow() {
    const config = await this.http.get<any>(this.configUrl).toPromise();
    return this.triggerWarrantyEmails(config.duration);
  }
}
