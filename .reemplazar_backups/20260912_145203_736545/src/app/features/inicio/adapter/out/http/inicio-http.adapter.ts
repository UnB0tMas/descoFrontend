import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { ApiEnvelope } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import { InicioGateway } from '../../../application/port/out/inicio.gateway';
import { DashboardFilter } from '../../../domain/dashboard-filter.model';
import { InicioHttpMapper } from './inicio-http.mapper';

@Injectable()
export class InicioHttpAdapter implements InicioGateway {
  private readonly http = inject(HttpClient);
  private readonly mapper = inject(InicioHttpMapper);
  private readonly baseUrl = environment.apiBaseUrl;

  getDashboard(filter: DashboardFilter) {
    let params = new HttpParams();

    const desde = filter.desde?.trim();
    const hasta = filter.hasta?.trim();

    if (desde) {
      params = params.set('desde', desde);
    }

    if (hasta) {
      params = params.set('hasta', hasta);
    }

    return this.http
      .get<ApiEnvelope<unknown>>(
        `${this.baseUrl}/api/v1/dashboard`,
        {
          params,
          transferCache: false,
        },
      )
      .pipe(
        map((response) =>
          this.mapper.dashboard(response),
        ),
      );
  }
}
