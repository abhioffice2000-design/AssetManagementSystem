import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { AllocationDashboardComponent } from './dashboard/dashboard.component';
import { AllocationInventoryComponent } from './inventory/inventory.component';
import { AllocationTicketsComponent } from './tickets/tickets.component';
import { AllocationReportsComponent } from './reports/reports.component';

const routes: Routes = [
  { path: 'dashboard', component: AllocationDashboardComponent },
  { path: 'inventory', component: AllocationInventoryComponent },
  { path: 'tickets', component: AllocationTicketsComponent },
  { path: 'reports', component: AllocationReportsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    AllocationDashboardComponent,
    AllocationInventoryComponent,
    AllocationTicketsComponent,
    AllocationReportsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class AllocationTeamModule { }
