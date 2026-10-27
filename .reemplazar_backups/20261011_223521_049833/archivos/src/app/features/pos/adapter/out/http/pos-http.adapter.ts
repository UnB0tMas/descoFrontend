import { Injectable, inject } from '@angular/core';
import { forkJoin, map } from 'rxjs';

import { POSVentasService } from '../../../../../infrastructure/openapi/generated/api/pOSVentas.service';
import { SaleCreateRequest } from '../../../../../infrastructure/openapi/generated/model/saleCreateRequest';
import { SaleManualCustomerRequest } from '../../../../../infrastructure/openapi/generated/model/saleManualCustomerRequest';
import { unwrapApiResponse } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import { IdentityResolverService } from '../../../../../shared/identity/identity-resolver.service';
import { ResourceApiService } from '../../../../recursos/shared/resource-api.service';
import {
  PosCustomer,
  PosCustomerResolution,
  PosCustomerResolutionSource,
  PosDocumentType,
  PosManualCustomerInput,
  PosPaymentMethod,
  PosProduct,
  PosSaleCreateInput,
  PosSaleSnapshot,
  PosWarehouse,
  PosCustomerType,
} from '../../../domain/pos.model';
import { PosGateway } from '../../../application/port/out/pos.gateway';

@Injectable()
export class PosHttpAdapter implements PosGateway {
  private readonly sales = inject(POSVentasService);
  private readonly resources = inject(ResourceApiService);
  private readonly identities = inject(IdentityResolverService);

  listWarehouses(uotId: number) {
    return this.resources
      .listWarehouses(uotId)
      .pipe(
        map((items) =>
          items
            .filter(
              (item) =>
                item.estado !== false
                && item.permiteSalida !== false
                && Number(item.almacenId ?? 0) > 0,
            )
            .map(
              (item): PosWarehouse => ({
                warehouseId: Number(item.almacenId),
                code: item.codigo?.trim() ?? '',
                name: item.nombre?.trim() ?? 'Almacén',
              }),
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
      );
  }

  listCatalog(uotId: number, warehouseId: number) {
    return forkJoin({
      products: this.resources.listAllProducts(uotId),
      stock: this.resources.listStock(uotId, warehouseId),
    }).pipe(
      map(({ products, stock }) => {
        const stockByProduct = new Map(
          stock
            .filter(
              (item) =>
                Number(item.almacenId ?? 0) === warehouseId
                && Number(item.productoId ?? 0) > 0,
            )
            .map(
              (item) => [
                Number(item.productoId),
                Number(item.stockDisponible ?? 0),
              ] as const,
            ),
        );

        return products
          .map((item): PosProduct => ({
            productId: Number(item.productoId ?? 0),
            code: item.codigo?.trim() ?? '',
            name: item.nombre?.trim() ?? 'Producto',
            description: item.descripcion?.trim() || null,
            unit:
              item.unidadMedidaNombre?.trim()
              || item.unidadMedidaCodigo?.trim()
              || 'UND',
            category:
              item.categoriaNombre?.trim()
              || item.categoriaCodigo?.trim()
              || null,
            unitPrice: Number(item.precioVigente ?? 0),
            initialPrice: Number(item.precioInicial ?? 0),
            currency: item.moneda?.trim().toUpperCase() || 'PEN',
            stockAvailable:
              stockByProduct.get(Number(item.productoId ?? 0)) ?? 0,
            imageFileId:
              Number(item.archivoPrincipalId ?? 0) > 0
                ? Number(item.archivoPrincipalId)
                : null,
            imageUrl: item.imagenPrincipalUrl?.trim() || null,
          }))
          .filter(
            (item) =>
              item.productId > 0
              && item.unitPrice > 0
              && item.stockAvailable > 0,
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }

  listPaymentMethods() {
    return this.sales
      .ventasMetodosPagoListar(
        {},
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map(
          (response) =>
            (unwrapApiResponse(response) ?? [])
              .map(
                (item): PosPaymentMethod => ({
                  paymentMethodId: Number(item.metodoPagoId ?? 0),
                  code: item.codigo?.trim() ?? '',
                  name: item.nombre?.trim() ?? 'Método de pago',
                  requiresOperationNumber:
                    item.requiereNumeroOperacion === true,
                }),
              )
              .filter((item) => item.paymentMethodId > 0),
        ),
      );
  }

  resolveCustomer(
    type: PosCustomerType,
    documentType: PosDocumentType,
    documentNumber: string,
  ) {
    return this.identities
      .resolve(
        type,
        documentType,
        documentNumber,
      )
      .pipe(
        map((result): PosCustomerResolution => {
          const source: PosCustomerResolutionSource =
            result.found
              ? result.insertedAutomatically
                ? 'FACTILIZA'
                : 'LOCAL'
              : result.manualEntryAllowed
                ? 'MANUAL'
                : 'PENDING';

          const customer =
            result.found && result.entityId
              ? {
                  type,
                  personId:
                    type === 'PERSONA'
                      ? result.entityId
                      : null,
                  companyId:
                    type === 'EMPRESA'
                      ? result.entityId
                      : null,
                  documentType,
                  documentNumber:
                    result.documentNumber ?? documentNumber,
                  displayName:
                    type === 'EMPRESA'
                      ? result.businessName
                        ?? result.message
                        ?? documentNumber
                      : this.personName(result)
                        || result.message
                        || documentNumber,
                  source:
                    source === 'PENDING'
                      ? 'LOCAL'
                      : source,
                }
              : null;

          return {
            customer,
            found: result.found,
            manualEntryAllowed: result.manualEntryAllowed,
            source,
            importedAutomatically: result.insertedAutomatically,
            message: this.customerResolutionMessage(
              source,
              result.message,
            ),
          };
        }),
      );
  }

  registerManualCustomer(input: PosManualCustomerInput) {
    const body: SaleManualCustomerRequest = {
      uotId: input.uotId,
      tipoCliente: input.type,
      tipoDocumento: input.documentType,
      numeroDocumento: input.documentNumber,
      nombres: input.names,
      apellidoPaterno: input.paternalSurname,
      apellidoMaterno: input.maternalSurname,
      razonSocial: input.businessName,
      telefono: input.phone,
      correo: input.email,
    };

    return this.sales
      .ventasClientesRegistrarManual(
        {
          saleManualCustomerRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response): PosCustomer => {
          const item = unwrapApiResponse(response);

          if (!item) {
            throw new Error(
              'El backend no devolvió el cliente registrado.',
            );
          }

          const personId =
            Number(item.clientePersonaId ?? 0) > 0
              ? Number(item.clientePersonaId)
              : null;
          const companyId =
            Number(item.clienteEmpresaId ?? 0) > 0
              ? Number(item.clienteEmpresaId)
              : null;

          return {
            type: item.tipoCliente === 'EMPRESA'
              ? 'EMPRESA'
              : 'PERSONA',
            personId,
            companyId,
            documentType:
              item.tipoDocumento === 'RUC'
                ? 'RUC'
                : 'DNI',
            documentNumber:
              item.numeroDocumento?.trim()
              || input.documentNumber,
            displayName:
              item.nombreCliente?.trim()
              || input.businessName
              || [
                input.names,
                input.paternalSurname,
                input.maternalSurname,
              ]
                .filter(Boolean)
                .join(' ')
              || input.documentNumber,
            source: 'MANUAL',
          };
        }),
      );
  }

  createSale(
    input: PosSaleCreateInput,
    idempotencyKey: string,
  ) {
    const body: SaleCreateRequest = {
      uotId: input.uotId,
      almacenId: input.warehouseId,
      clientePersonaId:
        input.customer.personId ?? undefined,
      clienteEmpresaId:
        input.customer.companyId ?? undefined,
      detalle: input.items.map((item) => ({
        productoId: item.productId,
        cantidad: item.quantity,
      })),
      separar: false,
      observacion: input.observation?.trim() || undefined,
    };

    return this.sales
      .ventasCrear(
        {
          xIdempotencyKey: idempotencyKey,
          saleCreateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => {
          const saleId =
            Number(
              unwrapApiResponse(response)?.ventaId ?? 0,
            );

          if (saleId <= 0) {
            throw new Error(
              'El backend no devolvió el identificador de la venta.',
            );
          }

          return saleId;
        }),
      );
  }

  getSale(saleId: number) {
    return this.sales
      .ventasVer(
        { id: saleId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response): PosSaleSnapshot => {
          const detail = unwrapApiResponse(response);
          const sale = detail?.venta;

          if (!sale?.ventaId) {
            throw new Error(
              'No fue posible recuperar la venta.',
            );
          }

          return {
            saleId: Number(sale.ventaId),
            total: Number(sale.total ?? 0),
            paid: Number(sale.pagado ?? 0),
            balance: Number(sale.saldo ?? 0),
            state: sale.estadoVenta?.trim().toUpperCase() || 'REGISTRADA',
            currency: sale.moneda?.trim().toUpperCase() || 'PEN',
          };
        }),
      );
  }

  paySale(
    saleId: number,
    paymentMethodId: number,
    amount: number,
    operationNumber: string | undefined,
    idempotencyKey: string,
  ) {
    return this.sales
      .ventasRegistrarPago(
        {
          id: saleId,
          xIdempotencyKey: idempotencyKey,
          salePaymentRequest: {
            metodoPagoId: paymentMethodId,
            importe: amount,
            numeroOperacion:
              operationNumber?.trim() || undefined,
          },
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map(() => void 0));
  }

  deliverSale(
    saleId: number,
    idempotencyKey: string,
  ) {
    return this.sales
      .ventasEntregar(
        {
          id: saleId,
          xIdempotencyKey: idempotencyKey,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map(() => void 0));
  }

  private customerResolutionMessage(
    source: PosCustomerResolutionSource,
    fallback: string,
  ): string {
    switch (source) {
      case 'FACTILIZA':
        return 'El cliente no existía en DESCO. Factiliza validó el documento y el backend guardó el registro automáticamente.';
      case 'LOCAL':
        return 'Cliente encontrado en DESCO. Se reutilizará el registro existente.';
      case 'MANUAL':
        return 'Factiliza no pudo completar la validación con datos utilizables. Puede registrar el cliente manualmente.';
      default:
        return fallback?.trim()
          || 'La validación automática sigue en proceso. Intente nuevamente en unos segundos.';
    }
  }

  private personName(
    result: {
      names: string | null;
      paternalSurname: string | null;
      maternalSurname: string | null;
    },
  ): string {
    return [
      result.names,
      result.paternalSurname,
      result.maternalSurname,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .trim();
  }
}
