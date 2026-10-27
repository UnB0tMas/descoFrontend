import { AuthStep } from './auth-step.model';

export interface AuthChallenge {
  paso: AuthStep;
  usuarioId: number | null;
  nombreUsuario: string | null;
  correlacionId: string | null;
  correoEnmascarado: string | null;
}
