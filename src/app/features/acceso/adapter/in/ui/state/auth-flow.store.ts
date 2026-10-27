import { Injectable, signal } from '@angular/core';

import { AuthChallenge } from '../../../../domain/auth-challenge.model';

@Injectable()
export class AuthFlowStore {
  private readonly challengeSignal = signal<AuthChallenge | null>(null);
  private readonly recoveryUserSignal = signal<string | null>(null);

  readonly challenge = this.challengeSignal.asReadonly();
  readonly recoveryUser = this.recoveryUserSignal.asReadonly();

  setChallenge(challenge: AuthChallenge | null): void {
    this.challengeSignal.set(challenge);
  }

  clearChallenge(): void {
    this.challengeSignal.set(null);
  }

  setRecoveryUser(nombreUsuario: string | null): void {
    this.recoveryUserSignal.set(nombreUsuario?.trim() || null);
  }

  clear(): void {
    this.challengeSignal.set(null);
    this.recoveryUserSignal.set(null);
  }
}
