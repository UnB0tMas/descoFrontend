import { inject, Injectable } from '@angular/core';

import {
  AUTH_GATEWAY,
  AuthGateway,
  TwoFactorChallengeInput,
} from '../port/out/auth.gateway';

@Injectable()
export class SolicitarSegundoFactorUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);

  execute(input: TwoFactorChallengeInput) {
    return this.gateway.requestTwoFactor(input);
  }
}
