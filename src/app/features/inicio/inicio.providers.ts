import { Provider } from '@angular/core';

import { INICIO_GATEWAY } from './application/port/out/inicio.gateway';
import { ObtenerDashboardUseCase } from './application/use-case/obtener-dashboard.use-case';
import { InicioHttpAdapter } from './adapter/out/http/inicio-http.adapter';
import { InicioHttpMapper } from './adapter/out/http/inicio-http.mapper';

export function provideInicio(): Provider[] {
  return [
    InicioHttpMapper,
    InicioHttpAdapter,
    {
      provide: INICIO_GATEWAY,
      useExisting: InicioHttpAdapter,
    },
    ObtenerDashboardUseCase,
  ];
}
