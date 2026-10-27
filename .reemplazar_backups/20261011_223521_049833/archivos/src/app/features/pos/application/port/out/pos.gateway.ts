import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  PosCustomerResolution,
  PosDocumentType,
  PosManualCustomerInput,
  PosPaymentMethod,
  PosProduct,
  PosSaleCreateInput,
  PosSaleSnapshot,
  PosWarehouse,
} from '../../../domain/pos.model';
import { PosCustomer, PosCustomerType } from '../../../domain/pos.model';

export interface PosGateway {
  listWarehouses(uotId: number): Observable<readonly PosWarehouse[]>;
  listCatalog(uotId: number, warehouseId: number): Observable<readonly PosProduct[]>;
  listPaymentMethods(): Observable<readonly PosPaymentMethod[]>;

  resolveCustomer(
    type: PosCustomerType,
    documentType: PosDocumentType,
    documentNumber: string,
  ): Observable<PosCustomerResolution>;

  registerManualCustomer(input: PosManualCustomerInput): Observable<PosCustomer>;

  createSale(
    input: PosSaleCreateInput,
    idempotencyKey: string,
  ): Observable<number>;

  getSale(saleId: number): Observable<PosSaleSnapshot>;

  paySale(
    saleId: number,
    paymentMethodId: number,
    amount: number,
    operationNumber: string | undefined,
    idempotencyKey: string,
  ): Observable<void>;

  deliverSale(
    saleId: number,
    idempotencyKey: string,
  ): Observable<void>;
}

export const POS_GATEWAY =
  new InjectionToken<PosGateway>('POS_GATEWAY');
