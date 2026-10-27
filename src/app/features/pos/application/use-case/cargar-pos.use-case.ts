import { Inject, Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';

import { POS_GATEWAY, PosGateway } from '../port/out/pos.gateway';

@Injectable()
export class CargarPosUseCase {
  constructor(
    @Inject(POS_GATEWAY)
    private readonly gateway: PosGateway,
  ) {}

  context(uotId: number) {
    return forkJoin({
      warehouses: this.gateway.listWarehouses(uotId),
      paymentMethods: this.gateway.listPaymentMethods(),
    });
  }

  catalog(uotId: number, warehouseId: number) {
    return this.gateway.listCatalog(uotId, warehouseId);
  }
}
