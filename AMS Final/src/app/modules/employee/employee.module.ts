import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { EmployeeDashboardComponent } from './dashboard/dashboard.component';
import { MyAssetsComponent } from './my-assets/my-assets.component';
import { RequestAssetComponent } from './request-asset/request-asset.component';
import { ReturnAssetComponent } from './return-asset/return-asset.component';
import { ExtendWarrantyComponent } from './extend-warranty/extend-warranty.component';
import { MyRequestsComponent } from './my-requests/my-requests.component';

const routes: Routes = [
  { path: 'dashboard', component: EmployeeDashboardComponent },
  { path: 'my-assets', component: MyAssetsComponent },
  { path: 'my-requests', component: MyRequestsComponent },
  { path: 'request-asset', component: RequestAssetComponent },
  { path: 'return-asset', component: ReturnAssetComponent },
  { path: 'extend-warranty', component: ExtendWarrantyComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  declarations: [
    EmployeeDashboardComponent,
    MyAssetsComponent,
    MyRequestsComponent,
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
export class EmployeeModule { }
