import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  InventoryAssetCreateRequest,
  InventoryAssetRetireRequest,
  InventoryAssetUpdateRequest,
  InventoryMileageUpdateRequest,
  InventorySupplyCreateRequest,
  InventorySupplyMovementAnnulRequest,
  InventorySupplyMovementRequest,
  InventorySupplyUpdateRequest,
  InventoryVehicleRegisterRequest,
  InventarioYVehculosService,
} from '../../../../../../infrastructure/openapi/generated';
import { InventarioVehiculosGateway } from '../../../application/port/out/inventario-vehiculos.gateway';
import {
  BienInventarioCreate,
  BienInventarioFiltro,
  BienInventarioUpdate,
} from '../../../domain/bien-inventario.model';
import { MovimientoSuministroCreate } from '../../../domain/movimiento-suministro.model';
import { SuministroCreate, SuministroUpdate } from '../../../domain/suministro.model';
import { KilometrajeUpdate, VehiculoCreate } from '../../../domain/vehiculo.model';
import { InventarioVehiculosHttpMapper } from './inventario-vehiculos-http.mapper';

@Injectable()
export class InventarioVehiculosHttpAdapter implements InventarioVehiculosGateway {
  private readonly api = inject(InventarioYVehculosService);
  private readonly mapper = inject(InventarioVehiculosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  listAssets(filter: BienInventarioFiltro) {
    return this.api
      .inventarioBienesListar(
        {
          empresaId: filter.empresaId,
          tipoBienId: filter.tipoBienId,
          estadoBien: filter.estadoBien,
          pagina: filter.page,
          tamano: filter.size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.assetsPage(response, filter.size)));
  }

  getAsset(id: number) {
    return this.api
      .inventarioBienesVer(
        { id },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.detail(response)));
  }

  createAsset(input: BienInventarioCreate) {
    const inventoryAssetCreateRequest: InventoryAssetCreateRequest = input;
    return this.idempotency.idempotent(
      'inventario:bienes:crear',
      inventoryAssetCreateRequest,
      (key) =>
        this.api
          .inventarioBienesCrear(
            {
              xIdempotencyKey: key,
              inventoryAssetCreateRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.createdId(response))),
    );
  }

  updateAsset(id: number, input: BienInventarioUpdate) {
    const inventoryAssetUpdateRequest: InventoryAssetUpdateRequest = input;
    return this.idempotency.idempotent(
      `inventario:bienes:editar:${id}`,
      inventoryAssetUpdateRequest,
      (key) =>
        this.api
          .inventarioBienesEditar(
            {
              id,
              xIdempotencyKey: key,
              inventoryAssetUpdateRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  retireAsset(id: number, motivo: string) {
    const inventoryAssetRetireRequest: InventoryAssetRetireRequest = { motivo };
    return this.idempotency.idempotent(
      `inventario:bienes:baja:${id}`,
      inventoryAssetRetireRequest,
      (key) =>
        this.api
          .inventarioBienesBaja(
            {
              id,
              xIdempotencyKey: key,
              inventoryAssetRetireRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  getVehicle(id: number) {
    return this.getAsset(id).pipe(
      map((detail) => this.mapper.vehicle(detail)),
    );
  }

  registerVehicle(id: number, input: VehiculoCreate) {
    const inventoryVehicleRegisterRequest: InventoryVehicleRegisterRequest = input;
    return this.idempotency.idempotent(
      `inventario:vehiculos:registrar:${id}`,
      inventoryVehicleRegisterRequest,
      (key) =>
        this.api
          .inventarioVehiculosRegistrar(
            {
              id,
              xIdempotencyKey: key,
              inventoryVehicleRegisterRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.createdId(response))),
    );
  }

  updateMileage(id: number, input: KilometrajeUpdate) {
    const inventoryMileageUpdateRequest: InventoryMileageUpdateRequest = input;
    return this.idempotency.idempotent(
      `inventario:vehiculos:kilometraje:${id}`,
      inventoryMileageUpdateRequest,
      (key) =>
        this.api
          .inventarioVehiculosKilometraje(
            {
              id,
              xIdempotencyKey: key,
              inventoryMileageUpdateRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  listSupplies(page: number, size: number) {
    return this.api
      .inventarioSuministrosListar(
        { pagina: page, tamano: size },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.suppliesPage(response, size)));
  }

  createSupply(input: SuministroCreate) {
    const inventorySupplyCreateRequest: InventorySupplyCreateRequest = input;
    return this.idempotency.idempotent(
      'inventario:suministros:crear',
      inventorySupplyCreateRequest,
      (key) =>
        this.api
          .inventarioSuministrosCrear(
            {
              xIdempotencyKey: key,
              inventorySupplyCreateRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.createdId(response))),
    );
  }

  updateSupply(id: number, input: SuministroUpdate) {
    const inventorySupplyUpdateRequest: InventorySupplyUpdateRequest = input;
    return this.idempotency.idempotent(
      `inventario:suministros:editar:${id}`,
      inventorySupplyUpdateRequest,
      (key) =>
        this.api
          .inventarioSuministrosEditar(
            {
              id,
              xIdempotencyKey: key,
              inventorySupplyUpdateRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  movements(suministroId?: number) {
    return this.api
      .inventarioSuministrosKardex(
        { suministroId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.movements(response)));
  }

  registerMovement(id: number, input: MovimientoSuministroCreate) {
    const inventorySupplyMovementRequest: InventorySupplyMovementRequest = input;
    return this.idempotency.idempotent(
      `inventario:suministros:movimiento:${id}`,
      inventorySupplyMovementRequest,
      (key) =>
        this.api
          .inventarioSuministrosMovimientoRegistrar(
            {
              id,
              xIdempotencyKey: key,
              inventorySupplyMovementRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.createdId(response))),
    );
  }

  annulMovement(id: number, motivo: string) {
    const inventorySupplyMovementAnnulRequest: InventorySupplyMovementAnnulRequest = {
      motivo,
    };
    return this.idempotency.idempotent(
      `inventario:suministros:movimiento-anular:${id}`,
      inventorySupplyMovementAnnulRequest,
      (key) =>
        this.api
          .inventarioSuministrosMovimientoAnular(
            {
              id,
              xIdempotencyKey: key,
              inventorySupplyMovementAnnulRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }
}
