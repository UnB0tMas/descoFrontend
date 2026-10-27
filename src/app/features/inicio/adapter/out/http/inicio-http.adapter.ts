import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { DashboardService } from '../../../../../infrastructure/openapi/generated';
import { InicioGateway } from '../../../application/port/out/inicio.gateway';
import { DashboardFilter } from '../../../domain/dashboard-filter.model';
import { InicioHttpMapper } from './inicio-http.mapper';

@Injectable()
export class InicioHttpAdapter implements InicioGateway {
  private readonly api = inject(DashboardService);
  private readonly mapper = inject(InicioHttpMapper);

  getDashboard(filter: DashboardFilter) {
    const desde = filter.desde?.trim() || undefined;
    const hasta = filter.hasta?.trim() || undefined;

    return this.api
      .dashboardResumen(
        { desde, hasta },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.dashboard(response)));
  }
}
