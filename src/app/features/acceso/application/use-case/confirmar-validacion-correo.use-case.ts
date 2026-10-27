import { inject, Injectable } from '@angular/core';

import {
  AUTH_GATEWAY,
  AuthGateway,
  EmailVerificationConfirmation,
} from '../port/out/auth.gateway';

@Injectable()
export class ConfirmarValidacionCorreoUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);

  execute(input: EmailVerificationConfirmation) {
    return this.gateway.confirmEmailVerification(input);
  }
}
