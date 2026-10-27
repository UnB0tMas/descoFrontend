import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Dashboard } from '../../../domain/dashboard.model';
import { DashboardFilter } from '../../../domain/dashboard-filter.model';

export interface InicioGateway {
  getDashboard(filter: DashboardFilter): Observable<Dashboard>;
}

export const INICIO_GATEWAY =
  new InjectionToken<InicioGateway>('INICIO_GATEWAY');
