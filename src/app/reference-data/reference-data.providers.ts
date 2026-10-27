import { Provider } from '@angular/core';

import { REFERENCE_DATA_GATEWAY } from '../core/reference-data/reference-data.gateway';
import { ReferenceDataHttpAdapter } from './reference-data-http.adapter';

export function provideReferenceData(): Provider[] {
  return [
    ReferenceDataHttpAdapter,
    {
      provide: REFERENCE_DATA_GATEWAY,
      useExisting: ReferenceDataHttpAdapter,
    },
  ];
}
