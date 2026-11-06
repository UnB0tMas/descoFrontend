import { Provider } from '@angular/core';
import { SALIDAS_E2_GATEWAY } from './application/port/salidas-e2.gateway';
import { SalidasE2UseCase } from './application/use-case/salidas-e2.use-case';
import { SalidasE2HttpAdapter } from './adapter/out/http/salidas-e2-http.adapter';
export function provideSalidasE2(): Provider[] {
  return [SalidasE2HttpAdapter,{provide: SALIDAS_E2_GATEWAY, useExisting: SalidasE2HttpAdapter},SalidasE2UseCase];
}
