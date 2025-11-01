// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Importa o Web Component FilterPro
import '@filterpro/filter-pro';

import { AppModule } from './app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));