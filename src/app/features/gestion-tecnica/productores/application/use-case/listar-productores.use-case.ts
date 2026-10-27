import { inject, Injectable } from '@angular/core';
import { ProductorFiltro } from '../../domain/productor-filtro.model';
import { PRODUCTORES_GATEWAY, ProductoresGateway } from '../port/out/productores.gateway';

@Injectable()
export class ListarProductoresUseCase {
  private readonly gateway: ProductoresGateway = inject(PRODUCTORES_GATEWAY);
  execute(filter: ProductorFiltro) {
    return this.gateway.list(filter);
  }
}
