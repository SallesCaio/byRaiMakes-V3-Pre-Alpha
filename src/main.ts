import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { getPerformance } from 'firebase/performance';
import { initializeApp } from 'firebase/app';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Firebase Performance Monitoring (observabilidade sem Sentry/LogRocket)
const firebaseApp = initializeApp(environment.firebase);
getPerformance(firebaseApp);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
