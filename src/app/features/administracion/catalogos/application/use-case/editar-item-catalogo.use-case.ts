import { inject, Injectable } from '@angular/core';

import { CatalogoItemCreate, CatalogoItemUpdate } from '../../domain/catalogo-item.model';
import { CATALOGOS_GATEWAY, CatalogosGateway } from '../port/out/catalogos.gateway';

@Injectable()
export class EditarItemCatalogoUseCase {
  private readonly gateway: CatalogosGateway = inject(CATALOGOS_GATEWAY);

  execute(id: number, input: CatalogoItemUpdate) {
    return this.gateway.update(id, input);
  }
}
