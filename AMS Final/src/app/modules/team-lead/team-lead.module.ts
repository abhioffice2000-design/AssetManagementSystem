import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { LeadDashboardComponent } from './dashboard/dashboard.component';
import { PendingApprovalsComponent } from './pending-approvals/pending-approvals.component';

const routes: Routes = [
  { path: 'dashboard', component: LeadDashboardComponent },
  { path: 'pending-approval', component: PendingApprovalsComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  declarations: [LeadDashboardComponent, PendingApprovalsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class TeamLeadModule { }
