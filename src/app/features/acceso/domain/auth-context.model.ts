import { AccessContext } from '../../../core/access/models/access-context.model';
import { AccessModule } from '../../../core/access/models/access-module.model';
import { AccessPermission } from '../../../core/access/models/access-permission.model';
import { AccessRole } from '../../../core/access/models/access-role.model';
import { AccessUser } from '../../../core/access/models/access-user.model';
import { AuthChallenge } from './auth-challenge.model';
import { AuthStep } from './auth-step.model';
import { AuthToken } from './auth-token.model';

export type AuthUser = AccessUser;
export type AuthRole = AccessRole;
export type AuthModule = AccessModule;
export type AuthPermission = AccessPermission;
export type AuthContext = AccessContext;

export interface AuthFlowResult {
  paso: AuthStep;
  tokens: AuthToken | null;
  contexto: AuthContext | null;
  desafio: AuthChallenge | null;
}

export interface AuthRefreshResult {
  tokens: AuthToken;
  contexto: AuthContext;
}
