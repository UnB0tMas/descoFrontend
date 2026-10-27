import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../core/access/module-access.guard';
import { permissionGuard } from '../../core/access/permission.guard';
import { POS_PROVIDERS } from './pos.providers';

export const posRoutes: Routes = [
  {
    path: 'pos',
    data: {
      breadcrumb: 'POS',
      module: 'POS',
      permission: 'POS_OPERAR',
    },
    canActivate: [
      moduleAccessGuard,
      permissionGuard,
    ],
    providers: POS_PROVIDERS,
    loadComponent: () =>
      import('./adapter/in/ui/pages/pos-page/pos-page').then(
        (module) => module.PosPage,
      ),
  },
];
