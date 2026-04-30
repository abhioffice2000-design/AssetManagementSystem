import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HeroService } from './hero.service';
import { interval, Subscription } from 'rxjs';

declare var $: any;

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
   * Runs every 30 minutes to check if the daily threshold has been met.
   */
  async initScheduler() {
    if (this.schedulerSub) return;

    console.log('[WarrantyScheduler] Initializing automated daily check...');
    
    // Check every 1 minute for better precision
    this.schedulerSub = interval(60000).subscribe(() => {
      this.checkAndRunScheduler();
    });
    
    // Initial check on startup
    await this.checkAndRunScheduler();
  }

  async checkAndRunScheduler() {
    try {
      // 1. Fetch current configuration from DB
      const config = await this.getConfiguration();
      if (!config) return;

      const lastRun = localStorage.getItem('warranty_scheduler_last_run');
      const today = new Date().toISOString().split('T')[0];

      // If already run today, skip
      if (lastRun === today) {
        return;
      }

      const now = new Date();
      const [hour, min] = config.time.split(':');
      const scheduledTime = new Date();
      scheduledTime.setHours(parseInt(hour, 10), parseInt(min, 10), 0, 0);

      // Check if current time is past the scheduled time
      if (now >= scheduledTime) {
        console.log(`[WarrantyScheduler] Execution time reached (${config.time}). Triggering ExtendWarranty_BPM...`);
        await this.triggerWarrantyEmails(config.days);
        localStorage.setItem('warranty_scheduler_last_run', today);
      } else {
        console.log(`[WarrantyScheduler] Waiting for scheduled time: ${config.time}. Current time: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      }
    } catch (e) {
      console.warn('[WarrantyScheduler] Could not process scheduler task:', e);
    }
  }

  /**
   * Sends the SOAP request to the ExtendWarranty_BPM
   */
  async triggerWarrantyEmails(days: number) {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <ExtendWarranty_BPM xmlns="http://schemas.cordys.com/default">
      <INPDur>${days}</INPDur>
    </ExtendWarranty_BPM>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      // Step 0: Ensure valid administrative context
      console.log('[WarrantyScheduler] Refreshing admin authentication context...');
      await new Promise<void>((resolve, reject) => {
        if (typeof $ !== 'undefined' && $.cordys?.authentication?.sso) {
          $.cordys.authentication.sso.authenticate('sourabhs', 'sourabhs')
            .done(() => resolve())
            .fail((err: any) => reject(err));
        } else {
          resolve(); 
        }
      });

      const response = await this.hs.ajax(null, null, {}, soapRequest);
      
      // Check for SOAP Fault
      const fault = this.hs.xmltojson(response, 'Fault');
      if (fault) {
        const fs = fault.faultstring || JSON.stringify(fault);
        throw new Error(`Cordys SOAP Fault: ${fs}`);
      }

      console.log(`[WarrantyScheduler] SUCCESS: ExtendWarranty_BPM triggered for ${days} days threshold.`);
      return response;
    } catch (err) {
      console.error('[WarrantyScheduler] FAILED to trigger ExtendWarranty_BPM:', err);
      throw err;
    }
  }

  async getConfiguration(): Promise<{ days: number, time: string } | null> {
    try {
      const savedDays = localStorage.getItem('warranty_scheduler_days');
      const savedTime = localStorage.getItem('warranty_scheduler_time');
      
      if (savedDays && savedTime) {
        return {
          days: parseInt(savedDays, 10),
          time: savedTime
        };
      }
      return null;
    } catch (e) {
      console.error('[WarrantyScheduler] Failed to fetch configuration from localStorage:', e);
      return null;
    }
  }

  async saveConfiguration(days: number, time: string): Promise<void> {
    try {
      localStorage.setItem('warranty_scheduler_days', days.toString());
      localStorage.setItem('warranty_scheduler_time', time);
      
      // Clear last run so it can trigger again if the time is set to a future point today
      localStorage.removeItem('warranty_scheduler_last_run');
      
      console.log('[WarrantyScheduler] Configuration saved. Last run reset.');
    } catch (e) {
      console.error('[WarrantyScheduler] Failed to save configuration to localStorage:', e);
      throw e;
    }
  }

  /**
   * Manually triggers the check (e.g., from the Admin UI)
   */
  async runNow() {
    const config = await this.getConfiguration();
    if (config) {
      return this.triggerWarrantyEmails(config.days);
    }
    return null;
  }
}
