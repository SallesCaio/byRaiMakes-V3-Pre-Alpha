import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import 'firebase/compat/auth'; // registra firebase.auth globalmente (RecaptchaVerifier p/ SMS Auth)

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// AngularFire compat SDK inicializa por FirebaseModule (firebase.module.ts)
// Nenhum initializeApp modular aqui — evita conflito entre SDK modular e compat

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));