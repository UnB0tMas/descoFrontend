import { convenioModuleGuard } from '../convenios/convenio-module.guard';
import { Routes } from '@angular/router';
import { provideE4 } from './e4/e4.providers';
import { provideE5 } from './e5/e5.providers';
import { provideGastos } from '../finanzas/gastos/gastos.providers';
import { provideCobrosCompradores } from '../finanzas/cobros-compradores/cobros-compradores.providers';
import { permissionGuard } from '../../core/access/permission.guard';
import { ajustesPrecioRoutes } from './ajustes-precio/ajustes-precio.routes';
import { incidenciasRoutes } from './incidencias/incidencias.routes';

const commercialWorkspace = () =>
  import('./shared/ui/commercial-workspace/commercial-workspace').then(m => m.CommercialWorkspacePage);

const campaignsPage = () =>
  import('./campaigns/campaigns-page').then(m => m.CampaignsPage);

export const gestionComercialRoutes: Routes = [
  {
    path: 'gestion-comercial',
    canActivate: [convenioModuleGuard],
    data: { breadcrumb: 'Comercialización asociativa', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
    children: [
      {
        path: 'campanias',
        data: { breadcrumb: 'Campañas', permission: 'CAMPANIAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: campaignsPage,
      },
      {
        path: 'campanias/:id/proceso-venta/socios/:participacionId',
        data: { breadcrumb: 'Detalle de socio', permission: 'JABAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./campaigns/campaign-sale-partner-detail').then(m => m.CampaignSalePartnerDetailPage),
      },
      {
        path: 'campanias/:id/proceso-venta',
        data: { breadcrumb: 'Proceso de venta', permission: 'JABAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./campaigns/campaign-sale-process').then(m => m.CampaignSaleProcessPage),
      },
      {
        path: 'campanias/:id',
        data: { breadcrumb: 'Detalle de campaña', permission: 'CAMPANIAS_VER' },
        canActivate: [permissionGuard],
        loadComponent: campaignsPage,
      },
      {
        path: 'compradores',
        data: { breadcrumb: 'Compradores APAPPSS', permission: 'APAPPSS_COMPRADORES_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./compradores/apappss-buyers-page').then(m => m.ApappssBuyersPage),
      },
      { path: 'participantes', redirectTo: 'campanias', pathMatch: 'full' },
      {
        path: 'operativos',
        data: { breadcrumb: 'Operativos', workspace: 'operations', permission: 'OPERATIVOS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'entregas',
        data: { breadcrumb: 'Entregas', workspace: 'deliveries', permission: 'ENTREGAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      { path: 'jabas', redirectTo: 'campanias', pathMatch: 'full' },
      { path: 'precios', redirectTo: 'campanias', pathMatch: 'full' },
      {
        path: 'acopio-rapido',
        data: { breadcrumb: 'Acopio individual APAPPSS', permission: 'JABAS_LISTAR' },
        canActivate: [permissionGuard],
        providers: provideE4(),
        loadComponent: () => import('./e4/adapter/in/ui/e4-page').then(m => m.E4Page),
      },
      {
        path: 'finanzas-apappss',
        data: { breadcrumb: 'Finanzas y liquidaciones APAPPSS', permission: 'LIQUIDACIONES_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./e5/adapter/in/ui/e5-campaign-list').then(m => m.E5CampaignListPage),
      },
      {
        path: 'finanzas-apappss/:campaniaId',
        data: { breadcrumb: 'Detalle financiero', permission: 'LIQUIDACIONES_LISTAR' },
        canActivate: [permissionGuard],
        providers: [...provideE5(), ...provideGastos(), ...provideCobrosCompradores()],
        loadComponent: () => import('./e5/adapter/in/ui/e5-page').then(m => m.E5Page),
      },
      {
        path: 'pagos-socios/liquidaciones/:liquidacionId',
        data: { breadcrumb: 'Detalle de liquidación', permission: 'APAPPSS_PAGOS_VER' },
        canActivate: [permissionGuard],
        providers: provideE5(),
        loadComponent: () => import('./e5/adapter/in/ui/e5-liquidation-detail').then(m => m.E5LiquidationDetailPage),
      },
      {
        path: 'pagos-socios',
        data: { breadcrumb: 'Pagos a socios', permission: 'APAPPSS_PAGOS_LISTAR' },
        canActivate: [permissionGuard],
        providers: provideE5(),
        loadComponent: () => import('./e5/adapter/in/ui/e5-payments-page').then(m => m.E5PaymentsPage),
      },
      { path: 'campanas', redirectTo: 'campanias', pathMatch: 'full' },
      { path: 'acopio-entregas', redirectTo: 'entregas', pathMatch: 'full' },
      { path: 'control-jabas', redirectTo: 'campanias', pathMatch: 'full' },
      { path: 'condiciones-precios', redirectTo: 'campanias', pathMatch: 'full' },
      { path: 'ajustes-precio', redirectTo: 'ajustes', pathMatch: 'full' },
      ...incidenciasRoutes,
      ...ajustesPrecioRoutes,
    ],
  },
];
