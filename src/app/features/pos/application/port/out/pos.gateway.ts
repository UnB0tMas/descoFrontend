import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  PosCustomerResolution,
  PosTechnicalEmployee, PosTechnicalLine, PosTechnicalDelivery, PosTechnicalRecord,
  PosSaleRecord, PosSaleDetail,
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
  listTechnicalCatalog(uotId: number, warehouseId: number): Observable<readonly PosProduct[]>;
  listTechnicalEmployees(uotId: number): Observable<readonly PosTechnicalEmployee[]>;
  listTechnicalDeliveries(uotId: number): Observable<readonly PosTechnicalRecord[]>;
  registerTechnicalDelivery(uotId: number, warehouseId: number, employeeId: number,
    lines: readonly PosTechnicalLine[], reason: string, observation?: string): Observable<PosTechnicalDelivery>;
  listSales(uotId: number): Observable<readonly PosSaleRecord[]>;
  getSaleDetail(saleId: number): Observable<PosSaleDetail>;
  cancelSale(saleId: number, reason: string): Observable<void>;
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
