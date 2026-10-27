export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}

export interface SessionState {
  authenticated: boolean;
  tokens: SessionTokens | null;
}

export const EMPTY_SESSION_STATE: SessionState = {
  authenticated: false,
  tokens: null,
};
