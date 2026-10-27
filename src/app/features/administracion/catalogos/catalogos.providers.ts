import { Provider } from '@angular/core';

import { CATALOGOS_GATEWAY } from './application/port/out/catalogos.gateway';
import { CrearItemCatalogoUseCase } from './application/use-case/crear-item-catalogo.use-case';
import { DeshabilitarItemCatalogoUseCase } from './application/use-case/deshabilitar-item-catalogo.use-case';
import { EditarItemCatalogoUseCase } from './application/use-case/editar-item-catalogo.use-case';
import { ListarCatalogosUseCase } from './application/use-case/listar-catalogos.use-case';
import { CatalogosHttpAdapter } from './adapter/out/http/catalogos-http.adapter';
import { CatalogosHttpMapper } from './adapter/out/http/catalogos-http.mapper';

export function provideCatalogos(): Provider[] {
  return [
    CatalogosHttpMapper,
    CatalogosHttpAdapter,
    {
      provide: CATALOGOS_GATEWAY,
      useExisting: CatalogosHttpAdapter,
    },
    ListarCatalogosUseCase,
    CrearItemCatalogoUseCase,
    EditarItemCatalogoUseCase,
    DeshabilitarItemCatalogoUseCase,
  ];
}
