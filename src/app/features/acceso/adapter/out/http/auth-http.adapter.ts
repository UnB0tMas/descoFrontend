import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import {
  SKIP_ACCESS_TOKEN,
  SKIP_SESSION_REFRESH,
} from '../../../../../core/http/context/http-context.tokens';
import {
  AutenticacinService,
  EmailVerificationConfirmRequest,
  EmailVerificationRequest,
  LoginRequest,
  PasswordRecoveryRequest,
  PasswordResetRequest,
  RefreshTokenRequest,
  TwoFactorRequest,
  TwoFactorVerifyRequest,
} from '../../../../../infrastructure/openapi/generated';
import {
  AuthGateway,
  EmailVerificationConfirmation,
  LoginCredentials,
  PasswordResetInput,
  TwoFactorChallengeInput,
  TwoFactorVerificationInput,
} from '../../../application/port/out/auth.gateway';
import { AuthHttpMapper } from './auth-http.mapper';

@Injectable()
export class AuthHttpAdapter implements AuthGateway {
  private readonly api = inject(AutenticacinService);
  private readonly mapper = inject(AuthHttpMapper);

  login(credentials: LoginCredentials) {
    const loginRequest: LoginRequest = credentials;

    return this.api
      .authLogin(
        { loginRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.flow(response)));
  }

  requestEmailVerification(nombreUsuario: string) {
    const emailVerificationRequest: EmailVerificationRequest = {
      nombreUsuario,
    };

    return this.api
      .authRequestEmailVerification(
        { emailVerificationRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  confirmEmailVerification(input: EmailVerificationConfirmation) {
    const emailVerificationConfirmRequest: EmailVerificationConfirmRequest = {
      usuarioId: input.usuarioId ?? undefined,
      nombreUsuario: input.nombreUsuario ?? undefined,
      correlacionId: input.correlacionId ?? undefined,
      codigo: input.codigo,
    };

    return this.api
      .authConfirmEmailVerification(
        { emailVerificationConfirmRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  requestTwoFactor(input: TwoFactorChallengeInput) {
    const twoFactorRequest: TwoFactorRequest = input;

    return this.api
      .authRequestTwoFactor(
        { twoFactorRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.challengeResponse(response)));
  }

  verifyTwoFactor(input: TwoFactorVerificationInput) {
    const twoFactorVerifyRequest: TwoFactorVerifyRequest = input;

    return this.api
      .authVerifyTwoFactor(
        { twoFactorVerifyRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.flow(response)));
  }

  requestPasswordRecovery(nombreUsuario: string) {
    const passwordRecoveryRequest: PasswordRecoveryRequest = {
      nombreUsuario,
    };

    return this.api
      .authRequestPasswordRecovery(
        { passwordRecoveryRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  resetPassword(input: PasswordResetInput) {
    const passwordResetRequest: PasswordResetRequest = input;

    return this.api
      .authResetPassword(
        { passwordResetRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  refresh(refreshToken: string) {
    const refreshTokenRequest: RefreshTokenRequest = { refreshToken };

    return this.api
      .authRefresh(
        { refreshTokenRequest },
        'body',
        false,
        this.publicOptions(),
      )
      .pipe(map((response) => this.mapper.refresh(response)));
  }

  currentContext() {
    return this.api
      .authGetCurrentUser(
        undefined,
        'body',
        false,
        this.privateOptions(),
      )
      .pipe(map((response) => this.mapper.currentContext(response)));
  }

  logout() {
    return this.api
      .authLogout(
        undefined,
        'body',
        false,
        this.privateOptions(true),
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  logoutOthers() {
    return this.api
      .authLogoutOthers(
        undefined,
        'body',
        false,
        this.privateOptions(true),
      )
      .pipe(map((response) => this.mapper.voidResponse(response)));
  }

  private publicOptions() {
    return {
      context: new HttpContext()
        .set(SKIP_ACCESS_TOKEN, true)
        .set(SKIP_SESSION_REFRESH, true),
      transferCache: false,
    };
  }

  private privateOptions(skipRefresh = false) {
    const context = new HttpContext();

    if (skipRefresh) {
      context.set(SKIP_SESSION_REFRESH, true);
    }

    return {
      context,
      transferCache: false,
    };
  }
}
