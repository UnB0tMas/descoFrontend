import { inject, Injectable } from '@angular/core';

import { CatalogoItemCreate, CatalogoItemUpdate } from '../../domain/catalogo-item.model';
import { CATALOGOS_GATEWAY, CatalogosGateway } from '../port/out/catalogos.gateway';

@Injectable()
export class CrearItemCatalogoUseCase {
  private readonly gateway: CatalogosGateway = inject(CATALOGOS_GATEWAY);

  execute(input: CatalogoItemCreate) {
    return this.gateway.create(input);
  }
}
