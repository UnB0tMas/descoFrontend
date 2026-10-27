import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';
export const parcelasCultivosRoutes: Routes = [
  {path:'parcelas-cultivos',data:{breadcrumb:'Parcelas y cultivos',module:'CULTIVOS',permission:'CULTIVOS_LISTAR'},canActivate:[moduleAccessGuard,permissionGuard],loadComponent:()=>import('./adapter/in/ui/pages/parcelas-cultivos-list/parcelas-cultivos-list').then(m=>m.ParcelasCultivosListPage)},
  {path:'parcelas-cultivos/expediente/:parcelaId',data:{breadcrumb:'Expediente de cultivo',module:'CULTIVOS',permission:'CULTIVOS_VER'},canActivate:[moduleAccessGuard,permissionGuard],loadComponent:()=>import('./adapter/in/ui/pages/expediente-cultivo/expediente-cultivo').then(m=>m.ExpedienteCultivoPage)},
];
