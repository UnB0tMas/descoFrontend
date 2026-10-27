import { Routes } from '@angular/router';
import { auditoriaRoutes } from './auditoria/auditoria.routes';
import { reportesRoutes } from './reportes/reportes.routes';
export const reportesControlRoutes: Routes = [
    ...reportesRoutes,
    ...auditoriaRoutes,
    { path: 'reportes-control/reportes', redirectTo: 'reportes', pathMatch: 'full' },
    { path: 'reportes-control/auditoria', redirectTo: 'auditoria', pathMatch: 'full' },
];
