import { Routes } from '@angular/router';

const list = () => import('./adapter/in/ui/pages/bandeja-documentos').then(m => m.BandejaDocumentosPage);

/** Disponible para cualquier usuario autenticado con UOT principal activa. */
export const gestionDocumentariaRoutes: Routes = [
  {path:'documentos',pathMatch:'full',redirectTo:'documentos/recibidos'},
  {path:'documentos/recibidos',data:{breadcrumb:'Bandeja de entrada',bandeja:'RECIBIDOS'},loadComponent:list},
  {path:'documentos/enviados',data:{breadcrumb:'Enviados',bandeja:'ENVIADOS',redaccion:true},loadComponent:list},
  {path:'documentos/pendientes',data:{breadcrumb:'Pendientes',bandeja:'PENDIENTES'},loadComponent:list},
  {path:'documentos/todos',data:{breadcrumb:'Todos mis hilos',bandeja:'TODOS'},loadComponent:list},
  {path:'documentos/finalizados',data:{breadcrumb:'Finalizados',bandeja:'FINALIZADOS'},loadComponent:list},
  {path:'documentos/borradores',data:{breadcrumb:'Borradores'},
    loadComponent:()=>import('./adapter/in/ui/pages/borradores-documentos').then(m=>m.BorradoresDocumentosPage)},
  {path:'documentos/seguimiento',pathMatch:'full',redirectTo:'documentos/mis-documentos'},
  {path:'documentos/enviar',pathMatch:'full',redirectTo:'documentos/enviados'},
  {path:'documentos/mis-documentos',data:{breadcrumb:'Mis documentos'},
    loadComponent:()=>import('./adapter/in/ui/pages/mis-documentos').then(m=>m.MisDocumentosPage)},
  {path:'documentos/salidas/nueva',redirectTo:'/gestion-tecnica/visitas?solicitar=1',pathMatch:'full'},
  {path:'documentos/:id/seguimiento',data:{breadcrumb:'Seguimiento'},
    loadComponent:()=>import('./adapter/in/ui/pages/seguimiento-documento').then(m=>m.SeguimientoDocumentoPage)},
  {path:'documentos/:id',data:{breadcrumb:'Documento'},
    loadComponent:()=>import('./adapter/in/ui/pages/detalle-documento').then(m=>m.DetalleDocumentoPage)},
];
