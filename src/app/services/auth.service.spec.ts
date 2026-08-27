import { TestBed } from '@angular/core/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService (anonymous)', () => {
  let service: AuthService;
  let afAuth: any;

  beforeEach(() => {
    afAuth = {
      currentUser: Promise.resolve(null),
      signInAnonymously: jasmine.createSpy('signInAnonymously').and.resolveTo({ user: { uid: 'anon-123' } }),
      authState: of(null)
    };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AngularFireAuth, useValue: afAuth }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('reutiliza usuário autenticado existente', async () => {
    afAuth.currentUser = Promise.resolve({ uid: 'user-1' });
    const uid = await service.ensureAnonymous();
    expect(uid).toBe('user-1');
    expect(afAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('executa signInAnonymously quando não há usuário', async () => {
    afAuth.currentUser = Promise.resolve(null);
    const uid = await service.ensureAnonymous();
    expect(afAuth.signInAnonymously).toHaveBeenCalled();
    expect(uid).toBe('anon-123');
  });

  it('retorna null em falha de autenticação', async () => {
    afAuth.currentUser = Promise.resolve(null);
    (afAuth.signInAnonymously as jasmine.Spy).and.rejectWith(new Error('blocked'));
    const uid = await service.ensureAnonymous();
    expect(uid).toBeNull();
  });
});
