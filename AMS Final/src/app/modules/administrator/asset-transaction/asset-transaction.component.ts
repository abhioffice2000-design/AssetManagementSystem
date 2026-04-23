import { Component, OnInit } from '@angular/core';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { AdminDataService, AssetRequest } from 'src/app/core/services/admin-data.service';

Chart.register(...registerables);

@Component({
  selector: 'app-asset-transaction',
  templateUrl: './asset-transaction.component.html',
  styleUrls: ['./asset-transaction.component.scss']
})
export class AssetTransactionComponent implements OnInit {

  allRequests: AssetRequest[] = [];
  filteredRequests: AssetRequest[] = [];
  pagedRequests: AssetRequest[] = [];

  selectedStatus = 'All';
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50];

  isLoading = false;
  errorMessage = '';

  totalTransactions = 0;
  pendingAllocations = 0;
  pendingReturns = 0;
  recentCompletions = 0;

  transactionStatusData: ChartData<'doughnut'> = {
    labels: ['Completed', 'Pending', 'Rejected'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      hoverBackgroundColor: ['#059669', '#d97706', '#dc2626'],
      borderWidth: 0
    }]
  };

  transactionStatusOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    },
    cutout: '70%'
  };

  transactionTrendData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Requests',
      data: [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  transactionTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  statusOptions: string[] = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];

  constructor(private adminDataService: AdminDataService) { }

  ngOnInit(): void {
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.allRequests = await this.adminDataService.getAllRequests();
      this.allRequests.sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt));
      this.updateStatusOptions();
      this.updateDashboardCards();
      this.updateCharts();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading asset requests:', error);
      this.errorMessage = 'Unable to load asset requests. Please try again.';
      this.allRequests = [];
      this.filteredRequests = [];
      this.pagedRequests = [];
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.setPage(1);
    this.applyFilters();
  }

  onStatusChange(value: string): void {
    this.selectedStatus = value;
    this.setPage(1);
    this.applyFilters();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize = Number(value);
    this.setPage(1);
    this.updatePagedData();
  }

  setPage(page: number): void {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.updatePagedData();
  }

  nextPage(): void {
    this.setPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.setPage(this.currentPage - 1);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
      } else if (current >= total - 2) {
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        for (let i = current - 2; i <= current + 2; i++) pages.push(i);
      }
    }
    return pages;
  }

  get startRecord(): number {
    return this.filteredRequests.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRequests.length);
  }

  getStatusClass(status: string): string {
    const normalizedStatus = status.trim().toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  private applyFilters(): void {
    const statusFilter = this.selectedStatus.trim().toLowerCase();
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredRequests = this.allRequests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status.trim().toLowerCase() === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        request.requestId.toLowerCase().includes(search) ||
        request.userName.toLowerCase().includes(search) ||
        request.userEmail.toLowerCase().includes(search) ||
        request.subCategory.toLowerCase().includes(search) ||
        request.reason.toLowerCase().includes(search) ||
        request.urgency.toLowerCase().includes(search)
      );
    });

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePagedData();
  }

  private updatePagedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pagedRequests = this.filteredRequests.slice(startIndex, startIndex + this.pageSize);
  }

  private updateDashboardCards(): void {
    this.totalTransactions = this.allRequests.length;
    this.pendingAllocations = this.allRequests.filter(r => r.status.toLowerCase() === 'pending').length;
    this.pendingReturns = this.allRequests.filter(r => r.status.toLowerCase() === 'approved').length;
    this.recentCompletions = this.allRequests.filter(r => r.status.toLowerCase() === 'completed' || r.status.toLowerCase() === 'rejected').length;
  }

  private updateCharts(): void {
    const approvedOrCompleted = this.allRequests.filter(r => {
      const status = r.status.toLowerCase();
      return status === 'approved' || status === 'completed';
    }).length;
    const pending = this.allRequests.filter(r => r.status.toLowerCase() === 'pending').length;
    const rejected = this.allRequests.filter(r => r.status.toLowerCase() === 'rejected').length;

    this.transactionStatusData = {
      ...this.transactionStatusData,
      datasets: [{
        ...this.transactionStatusData.datasets[0],
        data: [approvedOrCompleted, pending, rejected]
      }]
    };

    const trend = this.getLastSixMonthsTrend();
    this.transactionTrendData = {
      labels: trend.labels,
      datasets: [{
        ...this.transactionTrendData.datasets[0],
        data: trend.counts
      }]
    };
  }

  private getLastSixMonthsTrend(): { labels: string[], counts: number[] } {
    const validDates = this.allRequests
      .map(request => new Date(request.createdAt))
      .filter(date => !Number.isNaN(date.getTime()));
    const anchorDate = validDates.length
      ? new Date(Math.max(...validDates.map(date => date.getTime())))
      : new Date();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels: string[] = [];
    const monthKeys: string[] = [];
    const countsByMonth = new Map<string, number>();

    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - index, 1);
      const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      monthKeys.push(monthKey);
      labels.push(`${months[monthDate.getMonth()]} ${String(monthDate.getFullYear()).slice(2)}`);
      countsByMonth.set(monthKey, 0);
    }

    this.allRequests.forEach((request) => {
      const date = new Date(request.createdAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (countsByMonth.has(monthKey)) {
        countsByMonth.set(monthKey, (countsByMonth.get(monthKey) || 0) + 1);
      }
    });

    return {
      labels,
      counts: monthKeys.map((key) => countsByMonth.get(key) || 0)
    };
  }

  private toMillis(dateValue: string): number {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  getStatusLabel(status: string): string {
    if (!status) {
      return 'Pending';
    }
    const lowered = status.toLowerCase();
    if (lowered === 'approved' || lowered === 'completed') {
      return 'Completed';
    }
    if (lowered === 'rejected') {
      return 'Rejected';
    }
    return 'Pending';
  }

  downloadDocument(doc: string): void {
    if (!doc || !doc.includes('|')) {
      alert('The attached document was not successfully stored by the backend database. This is a known database configuration limitation where document fields are unmapped or restricted by length.');
      return;
    }
    const parts = doc.split('|');
    const fileName = parts.shift() || 'document.bin';
    const base64Data = parts.join('|'); // Rejoin in case base64 happened to have a pipe character
    
    // Create an invisible link to trigger the download
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatSubcategory(subCatId: string): string {
    if (!subCatId || subCatId === '-') return '-';
    
    const subCatMap: { [key: string]: string } = {
      'cat_001': 'Laptop',
      'cat_002': 'Software License',
      'cat_003': 'Monitor',
      'cat_004': 'Peripheral'
    };
    
    // Return mapped name if exists, otherwise return the id itself (in case it's already a name).
    return subCatMap[subCatId.toLowerCase()] || subCatId;
  }

  // Keeping this just in case other parts of the component still depend on it
  formatAssetType(type: string): string {
    if (!type) {
      return '-';
    }
    if (type.startsWith('typ_')) {
      return 'Hardware';
    }
    return type;
  }

  getRequesterInitials(name: string): string {
    const normalizedName = (name || '').trim();
    if (!normalizedName) {
      return '?';
    }

    const parts = normalizedName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  private updateStatusOptions(): void {
    const rawStatuses = this.allRequests.map(r => r.status);
    const uniqueStatuses = new Set<string>();
    rawStatuses.forEach(s => {
      if (s) {
        const normalized = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        uniqueStatuses.add(normalized);
      }
    });
    
    // Ensure standard statuses are present if they exist in data, but also include any others
    const standard = ['Pending', 'Approved', 'Rejected', 'Completed'];
    const current = Array.from(uniqueStatuses).sort();
    
    // Merge standard and any other unique statuses found
    this.statusOptions = ['All', ...new Set([...standard.filter(s => current.includes(s)), ...current])];
  }

  trackByRequestId(index: number, request: AssetRequest): string {
    return request.requestId || `${index}`;
  }
}
