import { inject, Injectable } from '@angular/core';

import { CatalogoFiltro } from '../../domain/catalogo-filtro.model';
import { CATALOGOS_GATEWAY, CatalogosGateway } from '../port/out/catalogos.gateway';

@Injectable()
export class ListarCatalogosUseCase {
  private readonly gateway: CatalogosGateway = inject(CATALOGOS_GATEWAY);

  execute(filter: CatalogoFiltro) {
    return this.gateway.list(filter);
  }
}
