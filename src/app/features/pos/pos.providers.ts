import { Provider } from '@angular/core';

import { PosHttpAdapter } from './adapter/out/http/pos-http.adapter';
import { POS_GATEWAY } from './application/port/out/pos.gateway';
import { CargarPosUseCase } from './application/use-case/cargar-pos.use-case';
import { ProcesarVentaPosUseCase } from './application/use-case/procesar-venta-pos.use-case';
import { ResolverClientePosUseCase } from './application/use-case/resolver-cliente-pos.use-case';
import { PosCartStore } from './state/pos-cart.store';

export const POS_PROVIDERS: Provider[] = [
  PosCartStore,
  PosHttpAdapter,
  {
    provide: POS_GATEWAY,
    useExisting: PosHttpAdapter,
  },
  CargarPosUseCase,
  ResolverClientePosUseCase,
  ProcesarVentaPosUseCase,
];
