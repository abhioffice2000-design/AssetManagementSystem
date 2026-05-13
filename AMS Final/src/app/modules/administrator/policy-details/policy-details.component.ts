import { Component, OnInit } from '@angular/core';
import { AdminDataService, Policy } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-policy-details',
  templateUrl: './policy-details.component.html',
  styleUrls: ['./policy-details.component.scss']
})
export class PolicyDetailsComponent implements OnInit {
  policies: Policy[] = [];
  loading = false;

  stats = {
    totalPolicies: 0,
    expiringSoon: 0
  };

  constructor(private adminDataService: AdminDataService) { }

  ngOnInit(): void {
    this.loadPolicies();
  }

  async loadPolicies() {
    this.loading = true;
    try {
      this.policies = await this.adminDataService.getAllPolicies();
      this.calculateStats();
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      this.loading = false;
    }
  }

  calculateStats() {
    this.stats.totalPolicies = this.policies.length;

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    this.stats.expiringSoon = this.policies.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      return expiry > today && expiry <= thirtyDaysFromNow;
    }).length;
  }

  onAddPolicy() {
    // For now just a placeholder
    console.log('Add new policy clicked');
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
