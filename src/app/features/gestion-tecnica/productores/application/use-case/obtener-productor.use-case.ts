import { inject, Injectable } from '@angular/core';

import { PRODUCTORES_GATEWAY, ProductoresGateway } from '../port/out/productores.gateway';

@Injectable()
export class ObtenerProductorUseCase {
  private readonly gateway: ProductoresGateway = inject(PRODUCTORES_GATEWAY);
  execute(id: number) {
    return this.gateway.get(id);
  }
}
