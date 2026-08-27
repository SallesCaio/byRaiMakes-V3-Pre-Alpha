import { Injectable } from '@angular/core';

// Estado de sessão administrativa (mesma fonte do app.component / admin-guard).
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private readonly KEY = 'adminSession';
  private readonly EXP = 'sessionExpiry';

  isAdmin(): boolean {
    const s = localStorage.getItem(this.KEY);
    const e = localStorage.getItem(this.EXP);
    return !!(s && e && Date.now() < parseInt(e, 10));
  }

  // Rota correta para o ícone superior: dashboard se autenticado, senão login.
  adminTargetUrl(): string {
    return this.isAdmin() ? '/admin/dashboard' : '/admin/login';
  }
}
