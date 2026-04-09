import { Injectable } from '@angular/core';

export interface Allocation {
  id: string;
  allocationId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  assetType: string;
  userId: string;
  userName: string;
  department: string;
  team: string;
  allocatedBy: string;
  allocationDate: string;
  expectedReturnDate?: string;
  status: 'Active' | 'Returned' | 'Overdue';
  requestId?: string;
  notes?: string;
}

export interface AssetReturn {
  id: string;
  returnId: string;
  allocationId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  returnedBy: string;
  returnedByName: string;
  department: string;
  receivedBy: string;
  receivedByName: string;
  returnDate: string;
  condition: 'Good' | 'Fair' | 'Damaged' | 'Poor';
  notes?: string;
  requestId?: string;
}

export interface MaintenanceLog {
  id: string;
  logId: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  assetType: string;
  maintenanceType: 'Repair' | 'Servicing' | 'Upgrade' | 'Inspection';
  description: string;
  vendor: string;
  cost: number;
  scheduledDate: string;
  completedDate?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  performedBy?: string;
  notes?: string;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description: string;
  department: string;
  teamLead: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  assetCount: number;
  memberCount: number;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  userCount: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {

  private allocations: Allocation[] = [
    { id: 'ALL001', allocationId: 'ALLOC-2024-001', assetId: 'AST001', assetTag: 'HW-LAP-001', assetName: 'Dell Latitude 5540', assetType: 'Hardware', userId: 'USR005', userName: 'Ananya Desai', department: 'Engineering', team: 'Frontend', allocatedBy: 'Priya Sharma', allocationDate: '2024-03-20', status: 'Active', requestId: 'REQ001' },
    { id: 'ALL002', allocationId: 'ALLOC-2024-002', assetId: 'AST002', assetTag: 'HW-LAP-002', assetName: 'MacBook Pro 14"', assetType: 'Hardware', userId: 'USR004', userName: 'Suresh Patel', department: 'Engineering', team: 'Frontend', allocatedBy: 'Priya Sharma', allocationDate: '2024-01-15', status: 'Active' },
    { id: 'ALL003', allocationId: 'ALLOC-2024-003', assetId: 'AST004', assetTag: 'SW-LIC-001', assetName: 'Microsoft 365 Business', assetType: 'Software', userId: 'USR005', userName: 'Ananya Desai', department: 'Engineering', team: 'Frontend', allocatedBy: 'Kavitha Iyer', allocationDate: '2024-01-01', status: 'Active' },
    { id: 'ALL004', allocationId: 'ALLOC-2024-004', assetId: 'AST006', assetTag: 'NW-RTR-001', assetName: 'Cisco Catalyst 9200', assetType: 'Network', userId: 'USR003', userName: 'Priya Sharma', department: 'IT', team: 'Asset Allocation', allocatedBy: 'Kavitha Iyer', allocationDate: '2023-11-05', status: 'Active' },
    { id: 'ALL005', allocationId: 'ALLOC-2024-005', assetId: 'AST009', assetTag: 'SW-LIC-002', assetName: 'JetBrains IntelliJ IDEA', assetType: 'Software', userId: 'USR004', userName: 'Suresh Patel', department: 'Engineering', team: 'Frontend', allocatedBy: 'Priya Sharma', allocationDate: '2024-04-05', expectedReturnDate: '2025-03-31', status: 'Active' },
    { id: 'ALL006', allocationId: 'ALLOC-2024-006', assetId: 'AST010', assetTag: 'HW-MON-002', assetName: 'LG 27UK850-W', assetType: 'Hardware', userId: 'USR005', userName: 'Ananya Desai', department: 'Engineering', team: 'Frontend', allocatedBy: 'Kavitha Iyer', allocationDate: '2024-05-12', status: 'Active' },
    { id: 'ALL007', allocationId: 'ALLOC-2023-001', assetId: 'AST013', assetTag: 'PR-MSE-001', assetName: 'Logitech MX Master 3S', assetType: 'Peripheral', userId: 'USR005', userName: 'Ananya Desai', department: 'Engineering', team: 'Frontend', allocatedBy: 'Priya Sharma', allocationDate: '2024-03-20', status: 'Active' },
    { id: 'ALL008', allocationId: 'ALLOC-2023-002', assetId: 'AST007', assetTag: 'HW-LAP-004', assetName: 'Lenovo ThinkPad X1 Carbon', assetType: 'Hardware', userId: 'USR006', userName: 'Vikram Singh', department: 'Engineering', team: 'Backend', allocatedBy: 'Priya Sharma', allocationDate: '2023-06-20', expectedReturnDate: '2024-06-20', status: 'Overdue' }
  ];

  private returns: AssetReturn[] = [
    { id: 'RET001', returnId: 'RET-2024-001', allocationId: 'ALLOC-2023-001', assetId: 'AST008', assetTag: 'PR-KBD-001', assetName: 'Logitech MX Keys', returnedBy: 'USR006', returnedByName: 'Vikram Singh', department: 'Engineering', receivedBy: 'USR003', receivedByName: 'Priya Sharma', returnDate: '2024-10-15', condition: 'Good', notes: 'Returned willingly, asset in excellent condition', requestId: 'REQ006' },
    { id: 'RET002', returnId: 'RET-2024-002', allocationId: 'ALLOC-2022-001', assetId: 'AST015', assetTag: 'HW-LAP-006', assetName: 'MacBook Air M2', returnedBy: 'USR007', returnedByName: 'Meera Nair', department: 'Design', receivedBy: 'USR009', receivedByName: 'Kavitha Iyer', returnDate: '2024-08-20', condition: 'Poor', notes: 'Asset degraded - scheduled for retirement' },
    { id: 'RET003', returnId: 'RET-2024-003', allocationId: 'ALLOC-2024-008', assetId: 'AST012', assetTag: 'FR-DSK-001', assetName: 'Standing Desk Motorized', returnedBy: 'USR010', returnedByName: 'Rahul Mehta', department: 'Engineering', receivedBy: 'USR003', receivedByName: 'Priya Sharma', returnDate: '2024-11-30', condition: 'Good', notes: 'Employee resigned, all assets returned' }
  ];

  private maintenanceLogs: MaintenanceLog[] = [
    { id: 'MNT001', logId: 'MNT-2024-001', assetId: 'AST007', assetTag: 'HW-LAP-004', assetName: 'Lenovo ThinkPad X1 Carbon', assetType: 'Hardware', maintenanceType: 'Repair', description: 'Screen replacement due to accidental damage - display unit cracked', vendor: 'Lenovo Service Center', cost: 18000, scheduledDate: '2024-11-01', completedDate: '2024-11-10', status: 'Completed', performedBy: 'Lenovo Technician', notes: 'Warranty partial coverage applied' },
    { id: 'MNT002', logId: 'MNT-2024-002', assetId: 'AST001', assetTag: 'HW-LAP-001', assetName: 'Dell Latitude 5540', assetType: 'Hardware', maintenanceType: 'Servicing', description: 'Annual preventive maintenance and cleaning', vendor: 'Dell Technologies', cost: 3500, scheduledDate: '2024-12-15', status: 'Scheduled', notes: 'Scheduled as per AMC' },
    { id: 'MNT003', logId: 'MNT-2024-003', assetId: 'AST006', assetTag: 'NW-RTR-001', assetName: 'Cisco Catalyst 9200', assetType: 'Network', maintenanceType: 'Upgrade', description: 'Firmware upgrade to latest version and config backup', vendor: 'Cisco Systems', cost: 8000, scheduledDate: '2024-10-20', completedDate: '2024-10-21', status: 'Completed', performedBy: 'Cisco Network Engineer' },
    { id: 'MNT004', logId: 'MNT-2024-004', assetId: 'AST002', assetTag: 'HW-LAP-002', assetName: 'MacBook Pro 14"', assetType: 'Hardware', maintenanceType: 'Inspection', description: 'Quarterly hardware health check and battery calibration', vendor: 'Apple Authorized Service', cost: 2000, scheduledDate: '2024-12-20', status: 'In Progress', performedBy: 'Apple Technician' },
    { id: 'MNT005', logId: 'MNT-2024-005', assetId: 'AST015', assetTag: 'HW-LAP-006', assetName: 'MacBook Air M2', assetType: 'Hardware', maintenanceType: 'Repair', description: 'Battery replacement - capacity degraded to 60%', vendor: 'Apple Authorized Service', cost: 12000, scheduledDate: '2024-07-10', completedDate: '2024-07-15', status: 'Completed', performedBy: 'Apple Technician', notes: 'Post repair decided to retire asset' }
  ];

  private projects: Project[] = [
    { id: 'PRJ001', projectCode: 'PRJ-2024-001', name: 'AMS Platform Development', description: 'Internal Asset Management System development project', department: 'Engineering', teamLead: 'Suresh Patel', startDate: '2024-01-01', status: 'Active', assetCount: 8, memberCount: 5 },
    { id: 'PRJ002', projectCode: 'PRJ-2024-002', name: 'Network Infrastructure Upgrade', description: 'Upgrading office network infrastructure to gigabit standard', department: 'IT', teamLead: 'Arjun Reddy', startDate: '2024-06-01', endDate: '2024-12-31', status: 'Active', assetCount: 4, memberCount: 3 },
    { id: 'PRJ003', projectCode: 'PRJ-2023-001', name: 'UX Redesign Initiative', description: 'Complete redesign of customer-facing applications', department: 'Design', teamLead: 'Meera Nair', startDate: '2023-08-01', endDate: '2024-06-30', status: 'Completed', assetCount: 3, memberCount: 4 },
    { id: 'PRJ004', projectCode: 'PRJ-2024-003', name: 'Cloud Migration', description: 'Moving on-premise services to AWS cloud infrastructure', department: 'Engineering', teamLead: 'Arjun Reddy', startDate: '2024-09-01', status: 'On Hold', assetCount: 0, memberCount: 6 }
  ];

  private roles: Role[] = [
    { id: 'ROL001', name: 'Administrator', code: 'ADMIN', description: 'Full system access including user, asset and configuration management', permissions: ['manage_users', 'manage_assets', 'manage_config', 'view_reports', 'manage_roles', 'manage_projects'], userCount: 1, isActive: true },
    { id: 'ROL002', name: 'Asset Manager', code: 'AM', description: 'Manages asset inventory, approvals and reporting', permissions: ['manage_assets', 'approve_requests', 'view_reports', 'manage_categories'], userCount: 1, isActive: true },
    { id: 'ROL003', name: 'Asset Allocation Team', code: 'AAT', description: 'Handles physical asset allocation and return processing', permissions: ['allocate_assets', 'process_returns', 'view_assets', 'manage_tickets'], userCount: 2, isActive: true },
    { id: 'ROL004', name: 'Team Lead', code: 'TL', description: 'Approves asset requests from team members', permissions: ['approve_team_requests', 'view_team_assets', 'request_assets'], userCount: 2, isActive: true },
    { id: 'ROL005', name: 'Employee', code: 'EMP', description: 'Can request assets, view assigned assets and submit returns', permissions: ['request_assets', 'view_my_assets', 'return_assets', 'extend_warranty'], userCount: 4, isActive: true }
  ];

  getAllocations(): Allocation[] { return [...this.allocations]; }
  getActiveAllocations(): Allocation[] { return this.allocations.filter(a => a.status === 'Active'); }
  getOverdueAllocations(): Allocation[] { return this.allocations.filter(a => a.status === 'Overdue'); }

  getReturns(): AssetReturn[] { return [...this.returns]; }

  getMaintenanceLogs(): MaintenanceLog[] { return [...this.maintenanceLogs]; }
  getMaintenanceByStatus(status: string): MaintenanceLog[] { return this.maintenanceLogs.filter(m => m.status === status); }

  getProjects(): Project[] { return [...this.projects]; }
  getProjectsByStatus(status: string): Project[] { return this.projects.filter(p => p.status === status); }

  getRoles(): Role[] { return [...this.roles]; }

  getAdminStats() {
    return {
      totalAllocations: this.allocations.filter(a => a.status === 'Active').length,
      overdueReturns: this.allocations.filter(a => a.status === 'Overdue').length,
      maintenanceActive: this.maintenanceLogs.filter(m => m.status === 'In Progress' || m.status === 'Scheduled').length,
      activeProjects: this.projects.filter(p => p.status === 'Active').length,
      totalMaintenanceCost: this.maintenanceLogs.filter(m => m.status === 'Completed').reduce((sum, m) => sum + m.cost, 0)
    };
  }
}
