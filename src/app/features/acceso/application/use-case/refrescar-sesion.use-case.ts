import { inject, Injectable } from '@angular/core';
import { throwError, tap } from 'rxjs';

import { AccessService } from '../../../../core/access/access.service';
import { SessionStore } from '../../../../core/session/session.store';
import { AUTH_GATEWAY, AuthGateway } from '../port/out/auth.gateway';

@Injectable()
export class RefrescarSesionUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessService);

  execute() {
    const refreshToken = this.session.refreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('La sesión ya no está disponible.'));
    }

    return this.gateway.refresh(refreshToken).pipe(
      tap((result) => {
        this.session.setTokens({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          accessTokenExpiresAt: result.tokens.accessTokenExpiraUtc,
          refreshTokenExpiresAt: result.tokens.refreshTokenExpiraUtc,
        });
        this.access.hydrate(result.contexto);
      }),
    );
  }
}
