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
  isSaving = false;
  showAddModal = false;

  stats = {
    totalPolicies: 0,
    expiringSoon: 0
  };

  newPolicy = {
    policy_name: '',
    policy_purchase_date: '',
    policy_expiry_date: '',
    flag: 'Active',
    to_mailid: '',
    from_mailid: 'pratichig@adnatesolutions.com'
  };

  errors = {
    policy_name: '',
    purchase_date: '',
    expiry_date: '',
    to_mailid: ''
  };

  userEmails: string[] = [];

  constructor(private adminDataService: AdminDataService) { }

  ngOnInit(): void {
    this.loadPolicies();
    this.loadUserEmails();
  }

  async loadUserEmails() {
    try {
      const users = await this.adminDataService.GetAllUserRoleProjectDetails();
      this.userEmails = [...new Set(users.map(u => u.email).filter(Boolean))].sort();
    } catch (error) {
      console.error('Error loading user emails:', error);
    }
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
    this.resetNewPolicy();
    this.showAddModal = true;
  }

  resetNewPolicy() {
    this.newPolicy = {
      policy_name: '',
      policy_purchase_date: new Date().toISOString().split('T')[0],
      policy_expiry_date: '',
      flag: 'Active',
      to_mailid: '',
      from_mailid: 'pratichig@adnatesolutions.com'
    };
    this.clearErrors();
  }

  clearErrors() {
    this.errors = {
      policy_name: '',
      purchase_date: '',
      expiry_date: '',
      to_mailid: ''
    };
  }

  validateForm(): boolean {
    this.clearErrors();
    let isValid = true;
    const todayStr = new Date().toISOString().split('T')[0];

    if (!this.newPolicy.policy_name.trim()) {
      this.errors.policy_name = 'Policy name is required';
      isValid = false;
    }

    if (this.newPolicy.policy_purchase_date > todayStr) {
      this.errors.purchase_date = 'Purchase date cannot be in the future';
      isValid = false;
    }

    if (this.newPolicy.policy_expiry_date && this.newPolicy.policy_expiry_date < todayStr) {
      this.errors.expiry_date = 'Expiry date cannot be in the past';
      isValid = false;
    }

    const toEmails = this.newPolicy.to_mailid.trim();
    if (toEmails) {
      if (toEmails.includes(' ') && !toEmails.includes(';')) {
        this.errors.to_mailid = 'Multiple emails must be separated by a semicolon (;)';
        isValid = false;
      } else {
        const parts = toEmails.split(';').map(p => p.trim()).filter(Boolean);
        for (const part of parts) {
          if (part.includes(' ')) {
            this.errors.to_mailid = 'Emails must be separated by a semicolon (;) without missing delimiters';
            isValid = false;
            break;
          }
        }
      }
    }

    return isValid;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  async onSavePolicy() {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;
    try {
      await this.adminDataService.addPolicyDetail(this.newPolicy);
      this.showAddModal = false;
      await this.loadPolicies();
    } catch (error) {
      console.error('Error saving policy:', error);
      alert('Failed to save policy. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'badge-default';
    const s = status.toLowerCase();
    if (s === 'active' || s === 'completed') return 'badge-green';
    if (s === 'draft' || s === 'pending') return 'badge-blue';
    if (s === 'expired' || s === 'inactive') return 'badge-red';
    return 'badge-default';
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
