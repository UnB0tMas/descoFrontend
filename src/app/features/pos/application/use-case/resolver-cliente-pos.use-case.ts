import { Inject, Injectable } from '@angular/core';

import {
  PosCustomerType,
  PosDocumentType,
  PosManualCustomerInput,
} from '../../domain/pos.model';
import { POS_GATEWAY, PosGateway } from '../port/out/pos.gateway';

@Injectable()
export class ResolverClientePosUseCase {
  constructor(
    @Inject(POS_GATEWAY)
    private readonly gateway: PosGateway,
  ) {}

  resolve(
    type: PosCustomerType,
    documentType: PosDocumentType,
    documentNumber: string,
  ) {
    return this.gateway.resolveCustomer(
      type,
      documentType,
      documentNumber,
    );
  }

  registerManual(input: PosManualCustomerInput) {
    return this.gateway.registerManualCustomer(input);
  }
}
