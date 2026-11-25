import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../core/access/module-access.guard';
import { permissionGuard } from '../../core/access/permission.guard';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../../core/access/permission.service';
import { UotContextStore } from '../uot/state/uot-context.store';
import { auditoriaRoutes } from './auditoria/auditoria.routes';
import { reportesRoutes } from './reportes/reportes.routes';
const dashboardRoleGuard: CanActivateFn = (_route, state) => {
    const router = inject(Router);
    if (inject(UotContextStore).isGeneral()) return router.createUrlTree(['/seleccionar-uot'], {queryParams:{returnUrl:state.url}});
    const p = inject(PermissionService);
    return p.has('REPORTES_CONTROL_VER') && p.hasAny(['DASHBOARD_BI_VER','DASHBOARD_APAPPSS_VER'])
      ? true : router.createUrlTree(['/forbidden']);
};
export const reportesControlRoutes: Routes = [
    {
        path: 'reportes-control/dashboard',
        data: { breadcrumb: 'Dashboard', module: 'DASHBOARD_BI', permissions: ['DASHBOARD_BI_VER', 'REPORTES_CONTROL_VER'] },
        canActivate: [dashboardRoleGuard],
        loadComponent: () => import('./dashboard/adapter/in/ui/pages/dashboard-bi/dashboard-bi')
            .then(m => m.DashboardBiPage),
    },
    ...reportesRoutes,
    ...auditoriaRoutes,
    { path: 'reportes-control/reportes', redirectTo: 'reportes', pathMatch: 'full' },
    { path: 'reportes-control/auditoria', redirectTo: 'auditoria', pathMatch: 'full' },
];
