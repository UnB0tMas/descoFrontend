import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { SESSION_STORAGE_KEYS } from './session.constants';
import { SessionTokens } from './session-state.model';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly platformId = inject(PLATFORM_ID);

  read(): SessionTokens | null {
    if (!this.isBrowser()) {
      return null;
    }

    const accessToken = sessionStorage.getItem(SESSION_STORAGE_KEYS.accessToken);
    const refreshToken = sessionStorage.getItem(SESSION_STORAGE_KEYS.refreshToken);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: sessionStorage.getItem(
        SESSION_STORAGE_KEYS.accessTokenExpiresAt,
      ),
      refreshTokenExpiresAt: sessionStorage.getItem(
        SESSION_STORAGE_KEYS.refreshTokenExpiresAt,
      ),
    };
  }

  write(tokens: SessionTokens): void {
    if (!this.isBrowser()) {
      return;
    }

    sessionStorage.setItem(SESSION_STORAGE_KEYS.accessToken, tokens.accessToken);
    sessionStorage.setItem(SESSION_STORAGE_KEYS.refreshToken, tokens.refreshToken);

    this.setOptional(
      SESSION_STORAGE_KEYS.accessTokenExpiresAt,
      tokens.accessTokenExpiresAt,
    );
    this.setOptional(
      SESSION_STORAGE_KEYS.refreshTokenExpiresAt,
      tokens.refreshTokenExpiresAt,
    );
  }

  clear(): void {
    if (!this.isBrowser()) {
      return;
    }

    Object.values(SESSION_STORAGE_KEYS).forEach((key) => {
      sessionStorage.removeItem(key);
    });
  }

  private setOptional(key: string, value: string | null): void {
    if (value) {
      sessionStorage.setItem(key, value);
      return;
    }

    sessionStorage.removeItem(key);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
