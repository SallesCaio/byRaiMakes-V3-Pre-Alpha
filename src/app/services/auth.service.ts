import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  async login(email: string, senha: string) {
    return this.afAuth.signInWithEmailAndPassword(email, senha);
  }

  logout() {
    return this.afAuth.signOut().then(() => {
      this.router.navigate(['/home']);
    });
  }

  isLoggedIn(): Observable<boolean> {
    return this.afAuth.authState.pipe(
      map(user => !!user)
    );
  }

  // Anonymous Auth silencioso para visitantes (H0.9.2).
  // Reutiliza usuário autenticado; senão signInAnonymously.
  // Retorna null em falha para impedir criação do pedido.
  async ensureAnonymous(): Promise<string | null> {
    const current = await this.afAuth.currentUser;
    if (current) return current.uid;
    try {
      const cred = await this.afAuth.signInAnonymously();
      return cred.user ? cred.user.uid : null;
    } catch (e) {
      console.error('Falha ao autenticar anonimamente', e);
      return null;
    }
  }
}