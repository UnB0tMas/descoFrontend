import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  PrediosService,
  PropertyCharacteristicsRequest,
  PropertyCreateRequest,
  PropertyLocationRequest,
  PropertyOwnerRequest,
  PropertyRetireRequest,
  PropertyUpdateRequest,
} from '../../../../../../infrastructure/openapi/generated';
import { PrediosGateway } from '../../../application/port/out/predios.gateway';
import { PredioCreate, PredioUpdate } from '../../../domain/predio.model';
import { PredioFiltro } from '../../../domain/predio-filtro.model';
import { PrediosHttpMapper } from './predios-http.mapper';

@Injectable()
export class PrediosHttpAdapter implements PrediosGateway {
  private readonly api = inject(PrediosService);
  private readonly mapper = inject(PrediosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: PredioFiltro) {
    return this.api
      .prediosListar(
        {
          buscar: filter.buscar,
          socioId: filter.socioId,
          distritoCodigo: filter.distritoCodigo,
          soloActivos: filter.soloActivos,
          pagina: filter.page,
          tamano: filter.size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.page(response, filter.size)));
  }

  get(id: number) {
    return this.api
      .prediosVer({ id }, 'body', false, { transferCache: false })
      .pipe(map((response) => this.mapper.detail(response)));
  }

  create(input: PredioCreate) {
    const ubicacion: PropertyLocationRequest = { ...input.ubicacion };
    const caracteristicas: PropertyCharacteristicsRequest = {
      ...input.caracteristicas,
    };
    const titulares: PropertyOwnerRequest[] = input.titulares.map((value) => ({
      ...value,
    }));

    const propertyCreateRequest: PropertyCreateRequest = {
      codigo: input.codigo,
      nombre: input.nombre,
      fechaRegistro: input.fechaRegistro,
      ubicacion,
      caracteristicas,
      titulares,
    };

    return this.api
      .prediosCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          propertyCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.created(response)));
  }

  update(id: number, input: PredioUpdate) {
    const ubicacion: PropertyLocationRequest | undefined = input.ubicacion
      ? { ...input.ubicacion }
      : undefined;
    const caracteristicas: PropertyCharacteristicsRequest | undefined =
      input.caracteristicas ? { ...input.caracteristicas } : undefined;
    const titulares: PropertyOwnerRequest[] | undefined = input.titulares
      ? input.titulares.map((value) => ({ ...value }))
      : undefined;

    const propertyUpdateRequest: PropertyUpdateRequest = {
      codigo: input.codigo,
      nombre: input.nombre,
      fechaTitularidad: input.fechaTitularidad,
      ubicacion,
      caracteristicas,
      titulares,
    };

    return this.api
      .prediosEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          propertyUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  retire(id: number, fechaRetiro: string, motivo: string) {
    const propertyRetireRequest: PropertyRetireRequest = {
      fechaRetiro,
      motivo,
    };

    return this.api
      .prediosRetirar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          propertyRetireRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }
}
