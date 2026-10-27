import { inject, Injectable } from '@angular/core';

import { CATALOGOS_GATEWAY, CatalogosGateway } from '../port/out/catalogos.gateway';

@Injectable()
export class DeshabilitarItemCatalogoUseCase {
  private readonly gateway: CatalogosGateway = inject(CATALOGOS_GATEWAY);

  execute(id: number, catalogo: string, motivo: string) {
    return this.gateway.disable(id, catalogo, motivo);
  }
}
