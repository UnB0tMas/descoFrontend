import { AccessModule } from './access-module.model';
import { AccessPermission } from './access-permission.model';
import { AccessRole } from './access-role.model';
import { AccessUser } from './access-user.model';

export interface AccessContext {
  usuario: AccessUser;
  roles: readonly AccessRole[];
  modulos: readonly AccessModule[];
  permisos: readonly AccessPermission[];
}
