import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AuthContext,
  AuthFlowResult,
  AuthRefreshResult,
} from '../../../domain/auth-context.model';
import { AuthChallenge } from '../../../domain/auth-challenge.model';

export interface LoginCredentials {
  nombreUsuario: string;
  password: string;
}

export interface EmailVerificationConfirmation {
  usuarioId?: number | null;
  nombreUsuario?: string | null;
  correlacionId?: string | null;
  codigo: string;
}

export interface TwoFactorChallengeInput {
  usuarioId: number;
  correlacionId: string;
}

export interface TwoFactorVerificationInput extends TwoFactorChallengeInput {
  codigo: string;
}

export interface PasswordResetInput {
  nombreUsuario: string;
  codigo: string;
  nuevoPassword: string;
  confirmarPassword: string;
}

export interface AuthGateway {
  login(credentials: LoginCredentials): Observable<AuthFlowResult>;

  requestEmailVerification(nombreUsuario: string): Observable<void>;

  confirmEmailVerification(
    input: EmailVerificationConfirmation,
  ): Observable<void>;

  requestTwoFactor(
    input: TwoFactorChallengeInput,
  ): Observable<AuthChallenge>;

  verifyTwoFactor(
    input: TwoFactorVerificationInput,
  ): Observable<AuthFlowResult>;

  requestPasswordRecovery(nombreUsuario: string): Observable<void>;

  resetPassword(input: PasswordResetInput): Observable<void>;

  refresh(refreshToken: string): Observable<AuthRefreshResult>;

  currentContext(): Observable<AuthContext>;

  logout(): Observable<void>;

  logoutOthers(): Observable<void>;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY');
