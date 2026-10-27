import { inject, Injectable } from '@angular/core';

import { DashboardFilter } from '../../domain/dashboard-filter.model';
import {
  INICIO_GATEWAY,
  InicioGateway,
} from '../port/out/inicio.gateway';

@Injectable()
export class ObtenerDashboardUseCase {
  private readonly gateway: InicioGateway = inject(INICIO_GATEWAY);

  execute(filter: DashboardFilter) {
    return this.gateway.getDashboard(filter);
  }
}
