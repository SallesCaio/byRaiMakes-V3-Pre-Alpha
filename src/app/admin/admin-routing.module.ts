import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLoginPage } from './login/login.page';
import { AdminDashboardPage } from './dashboard/dashboard.page';
import { AdminProdutosPage } from './produtos/produtos.page';
import { AdminProdutoFormPage } from './produto-form/produto-form.page';
import { AdminAuthGuard } from './admin-auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: AdminLoginPage },
  { path: 'dashboard', component: AdminDashboardPage, canActivate: [AdminAuthGuard] },
  { path: 'produtos', component: AdminProdutosPage, canActivate: [AdminAuthGuard] },
  { path: 'produto-form', component: AdminProdutoFormPage, canActivate: [AdminAuthGuard] },
  { path: 'produto-form/:id', component: AdminProdutoFormPage, canActivate: [AdminAuthGuard] },
  { path: 'banners', loadChildren: () => import('./banners/banners-routing.module').then(m => m.BannersRoutingModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }