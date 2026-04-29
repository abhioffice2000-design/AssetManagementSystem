import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

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

  constructor(private notificationService: NotificationService) {
    this.generateTimeOptions();
  }

  ngOnInit(): void {
    // Load existing settings if any - mock for now
    const savedDays = localStorage.getItem('warranty_scheduler_days');
    const savedTime = localStorage.getItem('warranty_scheduler_time');
    if (savedDays) this.selectedDays = parseInt(savedDays, 10);
    if (savedTime) this.selectedTime = savedTime;
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

  saveSchedule() {
    this.isSaving = true;
    
    // Persist to local storage as mock persistence
    localStorage.setItem('warranty_scheduler_days', this.selectedDays.toString());
    localStorage.setItem('warranty_scheduler_time', this.selectedTime);

    // Simulate API call
    setTimeout(() => {
      this.isSaving = false;
      this.notificationService.showToast('Warranty scheduler configuration saved successfully!', 'success');
    }, 1200);
  }
}
