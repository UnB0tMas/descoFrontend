import { inject, Injectable } from '@angular/core';
import { ProductorCreate } from '../../domain/productor.model';
import { PRODUCTORES_GATEWAY, ProductoresGateway } from '../port/out/productores.gateway';

@Injectable()
export class CrearProductorUseCase {
  private readonly gateway: ProductoresGateway = inject(PRODUCTORES_GATEWAY);
  execute(input: ProductorCreate) {
    return this.gateway.create(input);
  }
}
