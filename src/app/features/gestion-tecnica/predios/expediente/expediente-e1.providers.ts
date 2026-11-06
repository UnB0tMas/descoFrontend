import { Provider } from '@angular/core';
import { EXPEDIENTE_E1_GATEWAY } from './application/expediente-e1.gateway';
import { ExpedienteE1UseCase } from './application/expediente-e1.use-case';
import { ExpedienteE1HttpAdapter } from './adapter/expediente-e1-http.adapter';

export function provideExpedienteE1(): Provider[] {
  return [ExpedienteE1HttpAdapter,
    { provide: EXPEDIENTE_E1_GATEWAY, useExisting: ExpedienteE1HttpAdapter },
    ExpedienteE1UseCase];
}
