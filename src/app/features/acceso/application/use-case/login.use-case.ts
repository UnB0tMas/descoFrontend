import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';

import { AccessService } from '../../../../core/access/access.service';
import { SessionStore } from '../../../../core/session/session.store';
import { AuthFlowResult } from '../../domain/auth-context.model';
import { AUTH_GATEWAY, AuthGateway, LoginCredentials } from '../port/out/auth.gateway';

@Injectable()
export class LoginUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessService);

  execute(credentials: LoginCredentials) {
    return this.gateway.login(credentials).pipe(
      tap((result) => this.commitIfAuthenticated(result)),
    );
  }

  private commitIfAuthenticated(result: AuthFlowResult): void {
    if (result.paso !== 'AUTHENTICATED' || !result.tokens || !result.contexto) {
      return;
    }

    this.session.setTokens({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      accessTokenExpiresAt: result.tokens.accessTokenExpiraUtc,
      refreshTokenExpiresAt: result.tokens.refreshTokenExpiraUtc,
    });
    this.access.hydrate(result.contexto);
  }
}
