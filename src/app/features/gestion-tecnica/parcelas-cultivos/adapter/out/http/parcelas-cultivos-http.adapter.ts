import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  CropCreateRequest,
  CropFinishRequest,
  CropUpdateRequest,
  ParcelasYCultivosService,
  PlotCreateRequest,
  PlotUpdateRequest,
} from '../../../../../../infrastructure/openapi/generated';
import { ParcelasCultivosGateway } from '../../../application/port/out/parcelas-cultivos.gateway';
import {
  CultivoFiltro,
  CultivoInput,
  CultivoUpdate,
} from '../../../domain/cultivo.model';
import { ParcelaInput } from '../../../domain/parcela.model';
import { ParcelasCultivosHttpMapper } from './parcelas-cultivos-http.mapper';

@Injectable()
export class ParcelasCultivosHttpAdapter implements ParcelasCultivosGateway {
  private readonly api = inject(ParcelasYCultivosService);
  private readonly mapper = inject(ParcelasCultivosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: CultivoFiltro) {
    return this.api
      .cultivosListar(
        {
          predioId: filter.predioId,
          socioId: filter.socioId,
          variedadPaltaId: filter.variedadPaltaId,
          situacionCultivo: filter.situacionCultivo,
          buscar: filter.buscar,
          pagina: filter.page,
          tamano: filter.size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.page(response, filter.size)));
  }

  getExpediente(parcelaId?: number, cultivoId?: number) {
    return this.api
      .cultivosVerExpediente(
        {
          parcelaId,
          parcelaCultivoId: cultivoId,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.detail(response)));
  }

  createPlot(input: ParcelaInput) {
    const plotCreateRequest: PlotCreateRequest = {
      predioId: input.predioId,
      nombre: input.nombre,
      areaHa: input.areaHa,
    };

    return this.api
      .parcelasCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          plotCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.created(response)));
  }

  updatePlot(id: number, input: ParcelaInput) {
    const plotUpdateRequest: PlotUpdateRequest = {
      predioId: input.predioId,
      nombre: input.nombre,
      areaHa: input.areaHa,
    };

    return this.api
      .parcelasEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          plotUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  createCrop(parcelaId: number, input: CultivoInput) {
    const cropCreateRequest: CropCreateRequest = {
      parcelaId,
      variedadPaltaId: input.variedadPaltaId,
      fechaInicio: input.fechaInicio,
    };

    return this.api
      .cultivosCrear(
        {
          id: parcelaId,
          xIdempotencyKey: this.idempotency.create(),
          cropCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.created(response)));
  }

  updateCrop(id: number, input: CultivoUpdate) {
    const cropUpdateRequest: CropUpdateRequest = {
      variedadPaltaId: input.variedadPaltaId,
      fechaInicio: input.fechaInicio,
    };

    return this.api
      .cultivosEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          cropUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  finishCrop(id: number, fechaFin: string, motivo: string) {
    const cropFinishRequest: CropFinishRequest = {
      fechaFin,
      motivo,
    };

    return this.api
      .cultivosFinalizar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          cropFinishRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }
}
