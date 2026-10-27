export type PosCustomerType = 'PERSONA' | 'EMPRESA';
export type PosDocumentType = 'DNI' | 'RUC';
export type PosCustomerSource = 'LOCAL' | 'FACTILIZA' | 'MANUAL';
export type PosCustomerResolutionSource = PosCustomerSource | 'PENDING';

export interface PosWarehouse {
  warehouseId: number;
  code: string;
  name: string;
}

export interface PosPaymentMethod {
  paymentMethodId: number;
  code: string;
  name: string;
  requiresOperationNumber: boolean;
}

export interface PosProduct {
  productId: number;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  category: string | null;
  unitPrice: number;
  initialPrice: number;
  currency: string;
  stockAvailable: number;
  imageFileId: number | null;
  imageUrl: string | null;
}

export interface PosCustomer {
  type: PosCustomerType;
  personId: number | null;
  companyId: number | null;
  documentType: PosDocumentType;
  documentNumber: string;
  displayName: string;
  source?: PosCustomerSource;
}

export interface PosCustomerResolution {
  customer: PosCustomer | null;
  found: boolean;
  manualEntryAllowed: boolean;
  source: PosCustomerResolutionSource;
  importedAutomatically: boolean;
  message: string;
}

export interface PosManualCustomerInput {
  uotId: number;
  type: PosCustomerType;
  documentType: PosDocumentType;
  documentNumber: string;
  names?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  businessName?: string;
  phone?: string;
  email?: string;
}

export interface PosCartItem {
  productId: number;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  initialPrice: number;
  currency: string;
  quantity: number;
  stockAvailable: number;
  imageFileId: number | null;
  imageUrl: string | null;
}

export interface PosCartDraft {
  version: 1;
  userId: number;
  uotId: number;
  warehouseId: number | null;
  customer: PosCustomer | null;
  items: PosCartItem[];
  pendingSaleId: number | null;
  creationUncertain: boolean;
  createIdempotencyKey: string;
  paymentIdempotencyKey: string;
  deliveryIdempotencyKey: string;
  updatedAt: string;
}

export interface PosSaleCreateInput {
  uotId: number;
  warehouseId: number;
  customer: PosCustomer;
  items: readonly PosCartItem[];
  observation?: string;
}

export interface PosSaleSnapshot {
  saleId: number;
  total: number;
  paid: number;
  balance: number;
  state: string;
  currency: string;
}

export interface PosCheckoutInput {
  uotId: number;
  warehouseId: number;
  customer: PosCustomer;
  items: readonly PosCartItem[];
  paymentMethodId: number;
  paymentOperation?: string;
  observation?: string;
  pendingSaleId: number | null;
  createIdempotencyKey: string;
  paymentIdempotencyKey: string;
  deliveryIdempotencyKey: string;
}

export interface PosCheckoutResult {
  saleId: number;
  total: number;
  currency: string;
  state: string;
}

export interface PosTechnicalEmployee { employeeId: number; code: string; name: string; }
export interface PosTechnicalLine { productId: number; name: string; quantity: number; stockAvailable: number; unit: string; }
export interface PosTechnicalDelivery { deliveryId: number; movementId: number; }
export interface PosTechnicalRecord {
  deliveryId: number; warehouseId: number; warehouse: string; employee: string;
  date: string; reason: string; movementId: number;
}
export interface PosSaleRecord {
  saleId: number; uotId: number; warehouseId: number; date: string;
  customer: string; total: number; paid: number; balance: number;
  currency: string; state: string;
}
export interface PosSaleLine { product: string; quantity: number; unitPrice: number; subtotal: number; }
export interface PosSaleDetail { sale: PosSaleRecord; lines: readonly PosSaleLine[]; }
