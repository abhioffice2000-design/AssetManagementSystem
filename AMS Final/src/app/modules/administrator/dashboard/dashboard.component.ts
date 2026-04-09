import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  userStats: any = {};
  assetStats: any = {};
  reqStats: any = {};
  activeProjects = 0;

  assetStatusChartType: 'doughnut' = 'doughnut';
  requestTrendChartType: 'line' = 'line';
  assetCategoryChartType: 'bar' = 'bar';
  userRoleChartType: 'pie' = 'pie';

  assetStatusChartData: ChartData<'doughnut', number[], string> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  requestTrendChartData: ChartData<'line', number[], string> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  assetCategoryChartData: ChartData<'bar', number[], string> = {
    labels: [],
    datasets: [{ data: [] }]
  };
  userRoleChartData: ChartData<'pie', number[], string> = {
    labels: [],
    datasets: [{ data: [] }]
  };

  assetStatusChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  requestTrendChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  assetCategoryChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  userRoleChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  constructor(
    private assetService: AssetService,
    private requestService: RequestService,
    private adminDataService: AdminDataService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    this.assetStats = this.assetService.getAssetStats();
    this.reqStats = this.requestService.getRequestStats();
    this.userStats = await this.getResolvedUserStats();
    const roleStats = await this.getResolvedRoleStats();
    this.activeProjects = await this.getResolvedActiveProjectCount();

    this.assetStatusChartData = {
      labels: ['Available', 'Allocated', 'Maintenance'],
      datasets: [
        {
          data: [
            this.assetStats.available,
            this.assetStats.allocated,
            this.assetStats.inRepair
          ],
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b'],
          borderWidth: 0
        }
      ]
    };

    const requestTrend = this.buildRequestTrend(this.requestService.getRequests());
    this.requestTrendChartData = {
      labels: requestTrend.labels,
      datasets: [
        {
          data: requestTrend.counts,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 3
        }
      ]
    };

    this.assetCategoryChartData = {
      labels: this.assetStats.byCategory.map((item: any) => item.category),
      datasets: [
        {
          data: this.assetStats.byCategory.map((item: any) => item.count),
          backgroundColor: [
            '#6366f1',
            '#0ea5e9',
            '#14b8a6',
            '#f59e0b',
            '#8b5cf6',
            '#22c55e',
            '#ef4444',
            '#64748b'
          ],
          borderWidth: 0
        }
      ]
    };

    this.userRoleChartData = {
      labels: roleStats.map((item: any) => item.name),
      datasets: [
        {
          data: roleStats.map((item: any) => item.userCount),
          backgroundColor: ['#0f172a', '#2563eb', '#f59e0b', '#14b8a6', '#8b5cf6'],
          borderWidth: 0
        }
      ]
    };
  }

  private async getResolvedUserStats(): Promise<any> {
    try {
      const users = await this.adminDataService.GetAllUserRoleProjectDetails();
      return this.adminDataService.getUserStatsFromUsers(users);
    } catch (error) {
      console.error('Unable to load DB user stats for dashboard.', error);
      return this.adminDataService.getUserStatsFromUsers([]);
    }
  }

  private async getResolvedRoleStats(): Promise<Array<{ name: string; userCount: number }>> {
    try {
      return await this.adminDataService.getRolesFromDB();
    } catch (error) {
      console.error('Unable to load DB role stats for dashboard.', error);
      return [];
    }
  }

  private async getResolvedActiveProjectCount(): Promise<number> {
    try {
      const activeProjects = await this.adminDataService.getProjectsByStatus('Active');
      return activeProjects.length;
    } catch (error) {
      console.error('Unable to load DB project stats for dashboard.', error);
      return 0;
    }
  }

  private buildRequestTrend(requests: Array<{ requestDate: string }>): { labels: string[]; counts: number[] } {
    if (!requests.length) {
      return { labels: [], counts: [] };
    }

    const monthMap = new Map<string, number>();
    requests.forEach(request => {
      const date = new Date(request.requestDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });

    const monthKeys = [...monthMap.keys()].sort();
    const latestKey = monthKeys[monthKeys.length - 1];
    if (!latestKey) {
      return { labels: [], counts: [] };
    }

    const [latestYear, latestMonth] = latestKey.split('-').map(Number);
    const labels: string[] = [];
    const counts: number[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(latestYear, latestMonth - 1 - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      labels.push(`${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`);
      counts.push(monthMap.get(key) || 0);
    }

    return { labels, counts };
  }
}
