import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { from } from 'rxjs';
import { map, tap, take } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({ providedIn: 'root' })
export class AdminAuthGuard implements CanActivate {
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return from(
      (async () => {
        const user = await this.afAuth.currentUser;
        if (!user) return false;
        // ponytail: single doc read validates admin; upgrade to custom claims if many admins needed
        try {
          const snap = await this.firestore.doc(`admins/${user.uid}`).get().toPromise();
          return snap?.exists ?? false;
        } catch {
          // leitura negada ou erro de rede => não é admin
          return false;
        }
      })()
    ).pipe(
      take(1),
      tap(isAdmin => {
        if (!isAdmin) this.router.navigate(['/admin/login']);
      })
    );
  }
}
