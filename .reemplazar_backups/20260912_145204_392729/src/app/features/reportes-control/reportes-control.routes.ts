import { Routes } from '@angular/router';
import { auditoriaRoutes } from './auditoria/auditoria.routes';
import { reportesRoutes } from './reportes/reportes.routes';
export const reportesControlRoutes: Routes = [
    ...reportesRoutes,
    ...auditoriaRoutes,
];
