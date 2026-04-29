import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { HeroService } from '../../../core/services/hero.service';
import { NotificationService } from 'src/app/core/services/notification.service';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-allocation-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class AllocationReportsComponent implements OnInit {
  loading = false;
  selectedReport: string | null = null;
  reportData: any[] = [];
  
  // Filters
  startDate: string = '';
  endDate: string = '';
  categoryFilter: string = '';

  reports: ReportConfig[] = [
    { id: 'inventory', title: 'Current Inventory Snap-Shot', description: 'Live status of all managed assets including availability.', icon: 'inventory_2' },
    { id: 'deployment', title: 'Asset Deployment Log', description: 'Historical history of asset allocations and assignments.', icon: 'history' },
    { id: 'warranty', title: 'Warranty & Retirement Forecast', description: 'Forecast of assets reaching end-of-service in coming months.', icon: 'event' }
  ];

  constructor(
    private assetService: AssetService,
    private requestService: RequestService,
    private hs: HeroService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {}

  async generateReport(type: string): Promise<void> {
    this.selectedReport = type;
    this.loading = true;
    this.reportData = [];

    try {
      if (type === 'inventory') {
        const [assets, users] = await Promise.all([
          this.assetService.fetchAssetsFromService(),
          this.hs.ajax('GetAllUserRoleProjectDetails', 'http://schemas.cordys.com/AMS_Database_Metadata', {})
        ]);

        // Build User Map
        const userTuples = this.hs.xmltojson(users, 'tuple');
        const userList = Array.isArray(userTuples) ? userTuples : (userTuples ? [userTuples] : []);
        const userMap = new Map<string, string>();
        userList.forEach((u: any) => {
          const ud = u?.old?.m_users || u?.m_users || {};
          if (ud.user_id) userMap.set(ud.user_id, ud.name || 'Unknown');
        });

        this.reportData = assets.map(a => {
          // Priority: 1. Service Map Name, 2. Global User Map, 3. Unassigned (for available)
          let assignedUser = 'Unassigned';
          if (a.status.toLowerCase() !== 'available') {
            assignedUser = a.assignedToName || userMap.get(a.assignedTo || '') || 'Unknown User';
          }

          return {
            'Asset Tag': a.assetTag,
            'Name': a.name,
            'Category': a.category,
            'Sub-Category': a.type,
            'Status': a.status,
            'Assigned User': assignedUser
          };
        });
      } 
      else if (type === 'deployment') {
        const res = await this.hs.ajax('Getallrequest', 'http://schemas.cordys.com/AMS_Database_Metadata', {});
        const tuples = this.hs.xmltojson(res, 't_asset_requests');
        const data = Array.isArray(tuples) ? tuples : (tuples ? [tuples] : []);
        
        const formatDate = (dateStr: string) => {
          if (!dateStr || dateStr === 'N/A') return 'N/A';
          try {
            const d = new Date(dateStr);
            return d.getFullYear() + '-' + 
                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(d.getDate()).padStart(2, '0');
          } catch { return dateStr; }
        };

        this.reportData = data
          .map((t: any) => {
            const r = t || {};
            const u = t?.m_users || {};
            // Attempt to get asset name from temp1 (sub-category name) or asset_type
            const assetName = r.temp1 && r.temp1 !== '-' ? r.temp1 : r.asset_type;
            
            return {
              'Request ID': r.request_id,
              'Assigned Date': formatDate(r.created_at),
              'Employee': u.name || 'N/A',
              'Asset': r.asset_type,
              'Asset Name': assetName,
              'Return Date': r.temp4 && r.temp4 !== 'null' ? formatDate(r.temp4) : 'N/A'
            };
          })
          .filter(r => r['Assigned Date'] !== 'N/A');
      }
      else if (type === 'warranty') {
        const assets = await this.assetService.fetchAssetsFromService();
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        this.reportData = assets
          .filter(a => a.warrantyExpiry)
          .map(a => ({
            'Asset Tag': a.assetTag,
            'Name': a.name,
            'Category': a.category,
            'Purchase Date': a.purchaseDate || 'N/A',
            'Warranty Expiry': a.warrantyExpiry
          }))
          .sort((a,b) => new Date(a['Warranty Expiry']).getTime() - new Date(b['Warranty Expiry']).getTime());
      }

      this.notification.showToast(`${this.reports.find(r => r.id === type)?.title} Generated`, 'success');
    } catch (err) {
      console.error('Report Generation Error:', err);
      this.notification.showToast('Failed to generate report data', 'error');
    } finally {
      this.loading = false;
    }
  }

  downloadCSV(): void {
    if (this.reportData.length === 0) return;

    const headers = Object.keys(this.reportData[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...this.reportData.map(row => 
        headers.map(header => JSON.stringify(row[header])).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getSelectedReportTitle(): string {
    return this.reports.find(r => r.id === this.selectedReport)?.title || 'Report';
  }

  getHeaders(): string[] {
    return this.reportData.length > 0 ? Object.keys(this.reportData[0]) : [];
  }
}
