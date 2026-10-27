import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  CatalogCreateRequest,
  CatalogDisableRequest,
  CatalogUpdateRequest,
  CatlogosService,
} from '../../../../../../infrastructure/openapi/generated';
import { CatalogosGateway } from '../../../application/port/out/catalogos.gateway';
import { CatalogoFiltro } from '../../../domain/catalogo-filtro.model';
import {
  CatalogoItemCreate,
  CatalogoItemUpdate,
} from '../../../domain/catalogo-item.model';
import { CatalogosHttpMapper } from './catalogos-http.mapper';

@Injectable()
export class CatalogosHttpAdapter implements CatalogosGateway {
  private readonly api = inject(CatlogosService);
  private readonly mapper = inject(CatalogosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: CatalogoFiltro) {
    return this.api
      .catalogosListar(
        {
          catalogo: filter.catalogo,
          pagina: filter.page,
          tamano: filter.size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.page(response, filter.size)));
  }

  create(input: CatalogoItemCreate) {
    const catalogCreateRequest: CatalogCreateRequest = this.compact(input);

    return this.api
      .catalogosCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          catalogCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  update(id: number, input: CatalogoItemUpdate) {
    const catalogUpdateRequest: CatalogUpdateRequest = this.compact(input);

    return this.api
      .catalogosEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          catalogUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  disable(id: number, catalogo: string, motivo: string) {
    const catalogDisableRequest: CatalogDisableRequest = {
      catalogo,
      motivo,
    };

    return this.api
      .catalogosDeshabilitar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          catalogDisableRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  private compact<T extends object>(value: T): T {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        ([, item]) => item !== undefined && item !== null && item !== '',
      ),
    ) as T;
  }
}
