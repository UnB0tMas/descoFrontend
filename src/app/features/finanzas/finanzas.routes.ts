import { convenioModuleGuard } from '../convenios/convenio-module.guard';
import { Routes } from '@angular/router';
import { cobrosCompradoresRoutes } from './cobros-compradores/cobros-compradores.routes';
import { gastosRoutes } from './gastos/gastos.routes';
import { liquidacionesRoutes } from './liquidaciones/liquidaciones.routes';
import { pagosSociosRoutes } from './pagos-socios/pagos-socios.routes';
export const finanzasRoutes: Routes = [
    {
        path: 'finanzas',
        canActivate: [convenioModuleGuard],
        data: { breadcrumb: 'Finanzas del convenio', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
        children: [
            ...gastosRoutes,
            ...liquidacionesRoutes,
            ...pagosSociosRoutes,
            ...cobrosCompradoresRoutes,
            { path: 'pagos-socios', redirectTo: 'pagos', pathMatch: 'full' },
            { path: 'cobros-compradores', redirectTo: 'cobros', pathMatch: 'full' },
        ],
    },
];
