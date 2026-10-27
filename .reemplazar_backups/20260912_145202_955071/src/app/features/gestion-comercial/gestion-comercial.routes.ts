import { Routes } from '@angular/router';
import { ajustesPrecioRoutes } from './ajustes-precio/ajustes-precio.routes';
import { incidenciasRoutes } from './incidencias/incidencias.routes';
export const gestionComercialRoutes: Routes = [
    {
        path: 'gestion-comercial',
        data: { breadcrumb: 'Gestión comercial' },
        children: [...incidenciasRoutes, ...ajustesPrecioRoutes],
    },
];
