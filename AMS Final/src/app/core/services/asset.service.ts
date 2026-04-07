import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Asset, AssetType, AssetStatus, AssetCondition, AssetCategory } from '../models/asset.model';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private assets: Asset[] = [
    {
      id: 'AST001', assetTag: 'HW-LAP-001', name: 'Dell Latitude 5540', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Business', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-03-15', warrantyExpiry: '2027-03-15',
      vendor: 'Dell Technologies', serialNumber: 'DL5540-HYD-001', cost: 85000,
      condition: AssetCondition.GOOD, specifications: 'i7-1365U, 16GB RAM, 512GB SSD'
    },
    {
      id: 'AST002', assetTag: 'HW-LAP-002', name: 'MacBook Pro 14"', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Premium', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR004', assignedToName: 'Suresh Patel', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-01-10', warrantyExpiry: '2027-01-10',
      vendor: 'Apple Inc.', serialNumber: 'MBP14-HYD-002', cost: 195000,
      condition: AssetCondition.GOOD, specifications: 'M3 Pro, 18GB RAM, 512GB SSD'
    },
    {
      id: 'AST003', assetTag: 'HW-MON-001', name: 'Dell UltraSharp U2723QE', type: AssetType.HARDWARE,
      category: 'Monitor', subCategory: '4K', status: AssetStatus.AVAILABLE,
      location: 'Hyderabad - Store', purchaseDate: '2024-06-20', warrantyExpiry: '2027-06-20',
      vendor: 'Dell Technologies', serialNumber: 'DU27-HYD-001', cost: 45000,
      condition: AssetCondition.NEW
    },
    {
      id: 'AST004', assetTag: 'SW-LIC-001', name: 'Microsoft 365 Business', type: AssetType.SOFTWARE,
      category: 'Productivity Suite', subCategory: 'License', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Cloud', purchaseDate: '2024-01-01', warrantyExpiry: '2025-12-31',
      vendor: 'Microsoft', serialNumber: 'MS365-BUS-001', cost: 12000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST005', assetTag: 'HW-LAP-003', name: 'HP EliteBook 840', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Business', status: AssetStatus.AVAILABLE,
      location: 'Bangalore - Store', purchaseDate: '2024-08-10', warrantyExpiry: '2027-08-10',
      vendor: 'HP Inc.', serialNumber: 'HPE840-BLR-001', cost: 78000,
      condition: AssetCondition.NEW, specifications: 'i5-1345U, 16GB RAM, 256GB SSD'
    },
    {
      id: 'AST006', assetTag: 'NW-RTR-001', name: 'Cisco Catalyst 9200', type: AssetType.NETWORK,
      category: 'Router', subCategory: 'Enterprise', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR003', assignedToName: 'IT Infrastructure', department: 'IT', team: 'Network',
      location: 'Hyderabad - Server Room', purchaseDate: '2023-11-01', warrantyExpiry: '2026-11-01',
      vendor: 'Cisco Systems', serialNumber: 'CC9200-HYD-001', cost: 320000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST007', assetTag: 'HW-LAP-004', name: 'Lenovo ThinkPad X1 Carbon', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Ultra-Premium', status: AssetStatus.IN_REPAIR,
      location: 'Hyderabad - Service Center', purchaseDate: '2023-06-15', warrantyExpiry: '2026-06-15',
      vendor: 'Lenovo', serialNumber: 'LTP-X1C-HYD-001', cost: 165000,
      condition: AssetCondition.FAIR, specifications: 'i7-1365U, 32GB RAM, 1TB SSD'
    },
    {
      id: 'AST008', assetTag: 'PR-KBD-001', name: 'Logitech MX Keys', type: AssetType.PERIPHERAL,
      category: 'Keyboard', subCategory: 'Wireless', status: AssetStatus.AVAILABLE,
      location: 'Hyderabad - Store', purchaseDate: '2024-09-01', warrantyExpiry: '2026-09-01',
      vendor: 'Logitech', serialNumber: 'LMX-KBD-001', cost: 8500,
      condition: AssetCondition.NEW
    },
    {
      id: 'AST009', assetTag: 'SW-LIC-002', name: 'JetBrains IntelliJ IDEA', type: AssetType.SOFTWARE,
      category: 'Development Tools', subCategory: 'IDE License', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR004', assignedToName: 'Suresh Patel', department: 'Engineering', team: 'Frontend',
      location: 'Cloud', purchaseDate: '2024-04-01', warrantyExpiry: '2025-03-31',
      vendor: 'JetBrains', serialNumber: 'JB-IDEA-001', cost: 15000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST010', assetTag: 'HW-MON-002', name: 'LG 27UK850-W', type: AssetType.HARDWARE,
      category: 'Monitor', subCategory: '4K', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-05-10', warrantyExpiry: '2027-05-10',
      vendor: 'LG Electronics', serialNumber: 'LG27-HYD-002', cost: 38000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST011', assetTag: 'HW-LAP-005', name: 'Dell Inspiron 15', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Standard', status: AssetStatus.AVAILABLE,
      location: 'Chennai - Store', purchaseDate: '2024-10-01', warrantyExpiry: '2027-10-01',
      vendor: 'Dell Technologies', serialNumber: 'DI15-CHN-001', cost: 55000,
      condition: AssetCondition.NEW, specifications: 'i5-1235U, 8GB RAM, 256GB SSD'
    },
    {
      id: 'AST012', assetTag: 'FR-DSK-001', name: 'Standing Desk Motorized', type: AssetType.FURNITURE,
      category: 'Desk', subCategory: 'Motorized', status: AssetStatus.AVAILABLE,
      location: 'Hyderabad - Store', purchaseDate: '2024-07-15', warrantyExpiry: '2029-07-15',
      vendor: 'Featherlite', serialNumber: 'FL-DSK-HYD-001', cost: 28000,
      condition: AssetCondition.NEW
    },
    {
      id: 'AST013', assetTag: 'PR-MSE-001', name: 'Logitech MX Master 3S', type: AssetType.PERIPHERAL,
      category: 'Mouse', subCategory: 'Wireless', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-03-15', warrantyExpiry: '2026-03-15',
      vendor: 'Logitech', serialNumber: 'LMX-MSE-001', cost: 7500,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST014', assetTag: 'SW-LIC-003', name: 'Adobe Creative Cloud', type: AssetType.SOFTWARE,
      category: 'Design Tools', subCategory: 'License', status: AssetStatus.AVAILABLE,
      location: 'Cloud', purchaseDate: '2024-01-01', warrantyExpiry: '2025-12-31',
      vendor: 'Adobe', serialNumber: 'ACC-LIC-003', cost: 35000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST015', assetTag: 'HW-LAP-006', name: 'MacBook Air M2', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Standard', status: AssetStatus.RETIRED,
      location: 'Hyderabad - Store', purchaseDate: '2022-01-10', warrantyExpiry: '2025-01-10',
      vendor: 'Apple Inc.', serialNumber: 'MBA-M2-HYD-001', cost: 125000,
      condition: AssetCondition.POOR
    }
  ];

  private categories: AssetCategory[] = [
    { id: 'CAT001', name: 'Laptop', type: AssetType.HARDWARE, subCategories: ['Standard', 'Business', 'Premium', 'Ultra-Premium'], icon: 'laptop_mac' },
    { id: 'CAT002', name: 'Monitor', type: AssetType.HARDWARE, subCategories: ['FHD', '4K', 'Ultra-wide'], icon: 'desktop_windows' },
    { id: 'CAT003', name: 'Desktop', type: AssetType.HARDWARE, subCategories: ['Workstation', 'Standard'], icon: 'computer' },
    { id: 'CAT004', name: 'Productivity Suite', type: AssetType.SOFTWARE, subCategories: ['License', 'Subscription'], icon: 'apps' },
    { id: 'CAT005', name: 'Development Tools', type: AssetType.SOFTWARE, subCategories: ['IDE License', 'Platform License'], icon: 'code' },
    { id: 'CAT006', name: 'Design Tools', type: AssetType.SOFTWARE, subCategories: ['License', 'Subscription'], icon: 'brush' },
    { id: 'CAT007', name: 'Router', type: AssetType.NETWORK, subCategories: ['Enterprise', 'Standard'], icon: 'router' },
    { id: 'CAT008', name: 'Switch', type: AssetType.NETWORK, subCategories: ['Managed', 'Unmanaged'], icon: 'device_hub' },
    { id: 'CAT009', name: 'Keyboard', type: AssetType.PERIPHERAL, subCategories: ['Wired', 'Wireless', 'Mechanical'], icon: 'keyboard' },
    { id: 'CAT010', name: 'Mouse', type: AssetType.PERIPHERAL, subCategories: ['Wired', 'Wireless'], icon: 'mouse' },
    { id: 'CAT011', name: 'Desk', type: AssetType.FURNITURE, subCategories: ['Standard', 'Motorized', 'Standing'], icon: 'table_restaurant' },
    { id: 'CAT012', name: 'Chair', type: AssetType.FURNITURE, subCategories: ['Standard', 'Ergonomic', 'Executive'], icon: 'chair' }
  ];

  getAssets(): Asset[] {
    return [...this.assets];
  }

  getAssetById(id: string): Asset | undefined {
    return this.assets.find(a => a.id === id);
  }

  getAssetsByUser(userId: string): Asset[] {
    return this.assets.filter(a => a.assignedTo === userId);
  }

  getAssetsByType(type: AssetType): Asset[] {
    return this.assets.filter(a => a.type === type);
  }

  getAssetsByStatus(status: AssetStatus): Asset[] {
    return this.assets.filter(a => a.status === status);
  }

  getAssetsByDepartment(department: string): Asset[] {
    return this.assets.filter(a => a.department === department);
  }

  getAssetsByTeam(team: string): Asset[] {
    return this.assets.filter(a => a.team === team);
  }

  getCategories(): AssetCategory[] {
    return [...this.categories];
  }

  getCategoriesByType(type: AssetType): AssetCategory[] {
    return this.categories.filter(c => c.type === type);
  }

  addAsset(asset: Asset): void {
    this.assets.push(asset);
  }

  updateAsset(updated: Asset): void {
    const idx = this.assets.findIndex(a => a.id === updated.id);
    if (idx >= 0) this.assets[idx] = updated;
  }

  deleteAsset(id: string): void {
    this.assets = this.assets.filter(a => a.id !== id);
  }

  getAssetStats() {
    return {
      total: this.assets.length,
      available: this.assets.filter(a => a.status === AssetStatus.AVAILABLE).length,
      allocated: this.assets.filter(a => a.status === AssetStatus.ALLOCATED).length,
      inRepair: this.assets.filter(a => a.status === AssetStatus.IN_REPAIR).length,
      retired: this.assets.filter(a => a.status === AssetStatus.RETIRED).length,
      totalValue: this.assets.reduce((sum, a) => sum + a.cost, 0),
      byType: Object.values(AssetType).map(type => ({
        type,
        count: this.assets.filter(a => a.type === type).length,
        value: this.assets.filter(a => a.type === type).reduce((s, a) => s + a.cost, 0)
      })),
      byCategory: this.categories.map(cat => ({
        category: cat.name,
        type: cat.type,
        count: this.assets.filter(a => a.category === cat.name).length
      })),
      warrantyExpiringSoon: this.assets.filter(a => {
        const expiry = new Date(a.warrantyExpiry);
        const now = new Date();
        const diff = expiry.getTime() - now.getTime();
        return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
      }).length
    };
  }

  getTeamWiseHolding() {
    const teamMap = new Map<string, { department: string; team: string; count: number; value: number }>();
    this.assets.filter(a => a.team).forEach(a => {
      const key = `${a.department}-${a.team}`;
      if (!teamMap.has(key)) {
        teamMap.set(key, { department: a.department!, team: a.team!, count: 0, value: 0 });
      }
      const entry = teamMap.get(key)!;
      entry.count++;
      entry.value += a.cost;
    });
    return Array.from(teamMap.values());
  }
}
