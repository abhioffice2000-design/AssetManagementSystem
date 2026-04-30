import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { WarrantySchedulerService } from '../../../core/services/warranty-scheduler.service';

@Component({
  selector: 'app-warranty-scheduler',
  templateUrl: './warranty-scheduler.component.html',
  styleUrls: ['./warranty-scheduler.component.scss']
})
export class WarrantySchedulerComponent implements OnInit {
  selectedDays: number = 7;
  selectedTime: string = '09:00';
  isSaving: boolean = false;

  dayOptions = [7, 15, 30];
  timeOptions: string[] = [];

  constructor(
    private notificationService: NotificationService,
    private schedulerService: WarrantySchedulerService
  ) {
    this.generateTimeOptions();
  }

  async ngOnInit(): Promise<void> {
    this.isSaving = true;
    try {
      const config = await this.schedulerService.getConfiguration();
      if (config) {
        this.selectedDays = config.days;
        this.selectedTime = config.time;
      }
    } catch (error) {
      console.error('Failed to load scheduler configuration:', error);
      // Fallback to local storage if DB fails
      const savedDays = localStorage.getItem('warranty_scheduler_days');
      const savedTime = localStorage.getItem('warranty_scheduler_time');
      if (savedDays) this.selectedDays = parseInt(savedDays, 10);
      if (savedTime) this.selectedTime = savedTime;
    } finally {
      this.isSaving = false;
    }
  }

  generateTimeOptions() {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, '0');
        const min = m.toString().padStart(2, '0');
        this.timeOptions.push(`${hour}:${min}`);
      }
    }
  }

  async saveSchedule() {
    this.isSaving = true;
    
    try {
      // 1. Persist to Database via Service
      await this.schedulerService.saveConfiguration(this.selectedDays, this.selectedTime);
      
      // 2. Persist to local storage for quick access
      localStorage.setItem('warranty_scheduler_days', this.selectedDays.toString());
      localStorage.setItem('warranty_scheduler_time', this.selectedTime);

      this.notificationService.showToast('Warranty scheduler configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save scheduler configuration:', error);
      this.notificationService.showToast('Failed to save configuration to database. Local settings updated.', 'warning');
    } finally {
      this.isSaving = false;
    }
  }

  async runNow() {
    this.isSaving = true;
    try {
      await this.schedulerService.runNow();
      this.notificationService.showToast('Warranty check BPM triggered successfully!', 'success');
    } catch (error) {
      this.notificationService.showToast('Failed to trigger BPM. Please check console.', 'error');
    } finally {
      this.isSaving = false;
    }
  }
}
