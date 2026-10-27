import { Routes } from '@angular/router';
import { cobrosCompradoresRoutes } from './cobros-compradores/cobros-compradores.routes';
import { gastosRoutes } from './gastos/gastos.routes';
import { liquidacionesRoutes } from './liquidaciones/liquidaciones.routes';
import { pagosSociosRoutes } from './pagos-socios/pagos-socios.routes';
export const finanzasRoutes: Routes = [
    {
        path: 'finanzas',
        data: { breadcrumb: 'Finanzas' },
        children: [
            ...gastosRoutes,
            ...liquidacionesRoutes,
            ...pagosSociosRoutes,
            ...cobrosCompradoresRoutes,
        ],
    },
];
