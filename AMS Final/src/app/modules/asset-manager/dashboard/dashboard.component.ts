import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { RequestService } from '../../../core/services/request.service';
import { ApprovalStage } from '../../../core/models/request.model';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class ManagerDashboardComponent implements OnInit {
  // Top-level stats
  totalInventory = 0;
  allocatedAssets = 0;
  pendingRequests = 0;
  availableAssets = 0;

  // Type breakdown with sub-categories
  typeBreakdown: TypeBreakdown[] = [];

  // Total for percentage calculation
  grandTotal = 0;

  constructor(
    private assetService: AssetService,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Hardcoded dashboard data — replace with service calls later
    this.totalInventory = 15;
    this.allocatedAssets = 7;
    this.pendingRequests = 4;
    this.availableAssets = 5;
    this.grandTotal = this.totalInventory;

    this.typeBreakdown = [
      {
        type: 'Hardware',
        icon: 'computer',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        count: 8,
        subCategories: [
          { name: 'Laptop', count: 5 },
          { name: 'Monitor', count: 2 },
          { name: 'Desktop', count: 1 }
        ]
      },
      {
        type: 'Software',
        icon: 'code',
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.1)',
        count: 3,
        subCategories: [
          { name: 'Productivity Suite', count: 1 },
          { name: 'Development Tools', count: 1 },
          { name: 'Design Tools', count: 1 }
        ]
      },
      {
        type: 'Network',
        icon: 'router',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        count: 1,
        subCategories: [
          { name: 'Router', count: 1 }
        ]
      },
      {
        type: 'Peripheral',
        icon: 'mouse',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        count: 2,
        subCategories: [
          { name: 'Keyboard', count: 1 },
          { name: 'Mouse', count: 1 }
        ]
      },
      {
        type: 'Furniture',
        icon: 'chair',
        color: '#ec4899',
        bgColor: 'rgba(236, 72, 153, 0.1)',
        count: 1,
        subCategories: [
          { name: 'Desk', count: 1 }
        ]
      }
    ];
  }

  getTypePercentage(count: number): number {
    if (this.grandTotal === 0) return 0;
    return Math.round((count / this.grandTotal) * 100);
  }

  getSubCatPercentage(subCount: number, typeCount: number): number {
    if (typeCount === 0) return 0;
    return Math.round((subCount / typeCount) * 100);
  }
}

interface SubCategory {
  name: string;
  count: number;
}

interface TypeBreakdown {
  type: string;
  icon: string;
  color: string;
  bgColor: string;
  count: number;
  subCategories: SubCategory[];
}
