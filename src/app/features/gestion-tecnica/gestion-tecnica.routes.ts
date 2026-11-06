import { Routes } from '@angular/router';

import { gestionProductivaRoutes } from './gestion-productiva/gestion-productiva.routes';
import { censosRoutes } from './censos/censos.routes';
import { evaluacionesRoutes } from './evaluaciones/evaluaciones.routes';
import { parcelasCultivosRoutes } from './parcelas-cultivos/parcelas-cultivos.routes';
import { prediosRoutes } from './predios/predios.routes';
import { produccionRoutes } from './produccion/produccion.routes';
import { productoresRoutes } from './productores/productores.routes';
import { salidasRoutes } from './salidas/salidas.routes';
import { sanidadRoutes } from './sanidad/sanidad.routes';
import { visitasRoutes } from './visitas/visitas.routes';

export const gestionTecnicaRoutes: Routes = [
  {
    path: 'gestion-tecnica',
    data: { breadcrumb: 'Gestión técnica' },
    children: [
      { path: 'cultivos', redirectTo: 'parcelas-cultivos', pathMatch: 'full' },
      { path: 'produccion-disponible', redirectTo: 'produccion', pathMatch: 'full' },
      ...productoresRoutes,
      ...gestionProductivaRoutes,
      ...prediosRoutes,
      ...parcelasCultivosRoutes,
      ...censosRoutes,
      ...salidasRoutes,
      ...visitasRoutes,
      ...evaluacionesRoutes,
      ...sanidadRoutes,
      ...produccionRoutes,
    ],
  },
];
