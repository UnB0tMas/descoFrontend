export type AuthStep =
  | 'AUTHENTICATED'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'TWO_FACTOR_REQUIRED';

export function isAuthenticatedStep(step: string | null | undefined): step is 'AUTHENTICATED' {
  return step === 'AUTHENTICATED';
}
