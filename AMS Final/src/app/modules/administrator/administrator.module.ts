import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { SharedModule } from '../../shared/shared.module';

import { AdminDashboardComponent } from './dashboard/dashboard.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { MasterDataComponent } from './master-data/master-data.component';
import { AssetTransactionComponent } from './asset-transaction/asset-transaction.component';

const routes: Routes = [
  { path: 'dashboard', component: AdminDashboardComponent },
  { path: 'users', component: UserManagementComponent },
  { path: 'master-data', component: MasterDataComponent },
  { path: 'transactions', component: AssetTransactionComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    AdminDashboardComponent,
    UserManagementComponent,
    MasterDataComponent,
    AssetTransactionComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    NgChartsModule,
    SharedModule
  ]
})
export class AdministratorModule { }
