import { Injectable } from '@angular/core';

// Rota do ícone superior de administração.
// A autorização real é feita pelo AdminAuthGuard (admins/{uid}); não usar localStorage.
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  // Ícone sempre aponta para a tela de login; o guard redireciona para o dashboard se for admin.
  adminTargetUrl(): string {
    return '/admin/login';
  }
}
