import { inject, Injectable } from '@angular/core';

import { PRODUCTORES_GATEWAY, ProductoresGateway } from '../port/out/productores.gateway';

@Injectable()
export class RetirarProductorUseCase {
  private readonly gateway: ProductoresGateway = inject(PRODUCTORES_GATEWAY);
  execute(id: number, fechaRetiro: string, motivo: string) {
    return this.gateway.retire(id, fechaRetiro, motivo);
  }
}
