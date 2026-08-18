import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { getPerformance } from 'firebase/performance';
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import 'firebase/compat/auth'; // registra firebase.auth globalmente (RecaptchaVerifier p/ SMS Auth)

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Firebase Performance Monitoring
const firebaseApp = initializeApp(environment.firebase);
getPerformance(firebaseApp);

// App Check com reCAPTCHA Enterprise (obrigatorio p/ Phone Auth SMS)
// A chave e publica (site key), pode ficar no fonte
initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaEnterpriseProvider('6LdYp4wtAAAAAHSu2Qd0EQ6uyHvnohhTr8dlxKgE'),
  isTokenAutoRefreshEnabled: true
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
