import { computed, inject, Injectable, signal } from '@angular/core';

import {
  EMPTY_SESSION_STATE,
  SessionState,
  SessionTokens,
} from './session-state.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storage = inject(TokenStorageService);
  private readonly stateSignal = signal<SessionState>(this.restore());

  readonly state = this.stateSignal.asReadonly();
  readonly authenticated = computed(() => this.stateSignal().authenticated);
  readonly tokens = computed(() => this.stateSignal().tokens);
  readonly accessToken = computed(
    () => this.stateSignal().tokens?.accessToken ?? null,
  );
  readonly refreshToken = computed(
    () => this.stateSignal().tokens?.refreshToken ?? null,
  );

  setTokens(tokens: SessionTokens): void {
    this.storage.write(tokens);
    this.stateSignal.set({
      authenticated: true,
      tokens,
    });
  }

  clear(): void {
    this.storage.clear();
    this.stateSignal.set(EMPTY_SESSION_STATE);
  }

  snapshot(): SessionState {
    return this.stateSignal();
  }

  private restore(): SessionState {
    const tokens = this.storage.read();

    if (!tokens) {
      return EMPTY_SESSION_STATE;
    }

    return {
      authenticated: true,
      tokens,
    };
  }
}
