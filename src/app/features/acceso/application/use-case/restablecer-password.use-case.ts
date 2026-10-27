import { inject, Injectable } from '@angular/core';

import {
  AUTH_GATEWAY,
  AuthGateway,
  PasswordResetInput,
} from '../port/out/auth.gateway';

@Injectable()
export class RestablecerPasswordUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);

  execute(input: PasswordResetInput) {
    return this.gateway.resetPassword(input);
  }
}
