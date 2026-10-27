import { Provider } from '@angular/core';

import { environment } from '../../../environments/environment';
import { BASE_PATH } from './generated';

export function provideOpenApi(): Provider[] {
  return [
    {
      provide: BASE_PATH,
      useValue: environment.apiBaseUrl,
    },
  ];
}
