import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminBannersPage } from './banners.page';
import { AdminAuthGuard } from '../admin-auth.guard';

const routes: Routes = [
  { path: '', component: AdminBannersPage, canActivate: [AdminAuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BannersRoutingModule { }