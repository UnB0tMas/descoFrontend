import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const proveedoresRoutes:Routes=[{
  path:'proveedores',
  data:{breadcrumb:'Proveedores',module:'ORGANIZACIONES',permission:'ORGANIZACIONES_LISTAR'},
  canActivate:[moduleAccessGuard,permissionGuard],
  loadComponent:()=>import('./proveedores-page').then(m=>m.ProveedoresPage),
}];
