import { Provider } from '@angular/core';
import { PRODUCTORES_GATEWAY } from './application/port/out/productores.gateway';
import { CrearProductorUseCase } from './application/use-case/crear-productor.use-case';
import { EditarProductorUseCase } from './application/use-case/editar-productor.use-case';
import { ListarProductoresUseCase } from './application/use-case/listar-productores.use-case';
import { ObtenerProductorUseCase } from './application/use-case/obtener-productor.use-case';
import { RetirarProductorUseCase } from './application/use-case/retirar-productor.use-case';
import { ProductoresHttpAdapter } from './adapter/out/http/productores-http.adapter';
import { ProductoresHttpMapper } from './adapter/out/http/productores-http.mapper';

export function provideProductores(): Provider[] {
  return [
    ProductoresHttpMapper,
    ProductoresHttpAdapter,
    { provide: PRODUCTORES_GATEWAY, useExisting: ProductoresHttpAdapter },
    ListarProductoresUseCase,
    ObtenerProductorUseCase,
    CrearProductorUseCase,
    EditarProductorUseCase,
    RetirarProductorUseCase,
  ];
}
