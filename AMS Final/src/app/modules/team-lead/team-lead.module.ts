import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { LeadDashboardComponent } from './dashboard/dashboard.component';
import { PendingApprovalsComponent } from './pending-approvals/pending-approvals.component';
import { MyAssetComponent } from './my-asset/my-asset.component';
import { RequestAssetComponent } from './request-asset/request-asset.component';
import { ReturnAssetComponent } from './return-asset/return-asset.component';
import { ExtendWarrantyComponent } from './extend-warranty/extend-warranty.component';

const routes: Routes = [
  { path: 'dashboard', component: LeadDashboardComponent },
  { path: 'pending-approval', component: PendingApprovalsComponent },
  { path: 'my-asset', component: MyAssetComponent },
  { path: 'request-asset', component: RequestAssetComponent },
  { path: 'return-asset', component: ReturnAssetComponent },
  { path: 'extend-warranty', component: ExtendWarrantyComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    LeadDashboardComponent, 
    PendingApprovalsComponent,
    MyAssetComponent,
    RequestAssetComponent,
    ReturnAssetComponent,
    ExtendWarrantyComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class TeamLeadModule { }
