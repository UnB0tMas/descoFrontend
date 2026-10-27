export interface AuthToken {
  accessToken: string;
  tokenType: string;
  accessTokenExpiraUtc: string | null;
  refreshToken: string;
  refreshTokenExpiraUtc: string | null;
  sesionPublicaId: string | null;
}
