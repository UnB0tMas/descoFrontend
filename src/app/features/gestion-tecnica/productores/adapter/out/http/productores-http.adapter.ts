import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  ProducerCreateRequest,
  ProducerRetireRequest,
  ProducerUpdateRequest,
  ProductoresService,
} from '../../../../../../infrastructure/openapi/generated';
import { ProductoresGateway } from '../../../application/port/out/productores.gateway';
import { ProductorFiltro } from '../../../domain/productor-filtro.model';
import { ProductorCreate, ProductorUpdate } from '../../../domain/productor.model';
import { ProductoresHttpMapper } from './productores-http.mapper';

@Injectable()
export class ProductoresHttpAdapter implements ProductoresGateway {
  private readonly api = inject(ProductoresService);
  private readonly mapper = inject(ProductoresHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: ProductorFiltro) {
    return this.api
      .productoresListar(
        {
          buscar: filter.buscar,
          asociacionId: filter.asociacionId,
          situacion: filter.situacion,
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
      .productoresVer({ id }, 'body', false, { transferCache: false })
      .pipe(map((response) => this.mapper.detail(response)));
  }

  create(input: ProductorCreate) {
    const producerCreateRequest: ProducerCreateRequest = {
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      telefono: input.telefono,
      correo: input.correo,
      fechaNacimiento: input.fechaNacimiento,
      fechaAlta: input.fechaAlta,
      asociacionId: input.asociacionId,
      fechaDesde: input.fechaDesde,
      situacionMembresia: input.situacionMembresia,
      ubicacion: { ...input.ubicacion },
    };

    return this.api
      .productoresCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          producerCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  update(id: number, input: ProductorUpdate) {
    const producerUpdateRequest: ProducerUpdateRequest = {
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      telefono: input.telefono,
      correo: input.correo,
      fechaNacimiento: input.fechaNacimiento,
      asociacionId: input.asociacionId,
      fechaDesde: input.fechaDesde,
      situacionMembresia: input.situacionMembresia,
      ubicacion: { ...input.ubicacion },
    };

    return this.api
      .productoresEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          producerUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  retire(id: number, fechaRetiro: string, motivo: string) {
    const producerRetireRequest: ProducerRetireRequest = { fechaRetiro, motivo };

    return this.api
      .productoresRetirar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          producerRetireRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

}
