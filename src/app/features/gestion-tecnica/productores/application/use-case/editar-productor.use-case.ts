import { inject, Injectable } from '@angular/core';
import { ProductorUpdate } from '../../domain/productor.model';
import { PRODUCTORES_GATEWAY, ProductoresGateway } from '../port/out/productores.gateway';

@Injectable()
export class EditarProductorUseCase {
  private readonly gateway: ProductoresGateway = inject(PRODUCTORES_GATEWAY);
  execute(id: number, input: ProductorUpdate) {
    return this.gateway.update(id, input);
  }
}
