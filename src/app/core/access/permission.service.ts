import { inject, Injectable } from '@angular/core';

import { AccessPermission } from './models/access-permission.model';
import { AccessStore } from './access.store';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly store = inject(AccessStore);

  has(code: string): boolean {
    const normalized = this.normalize(code);
    return this.store.permissions().some((permission) =>
      this.effectiveCodes(permission).includes(normalized),
    );
  }

  hasAny(codes: readonly string[]): boolean {
    return codes.some((code) => this.has(code));
  }

  hasAll(codes: readonly string[]): boolean {
    return codes.every((code) => this.has(code));
  }

  private effectiveCodes(permission: AccessPermission): readonly string[] {
    const codes = new Set<string>();
    if (permission.codigo?.trim()) codes.add(this.normalize(permission.codigo));

    const module = permission.codigoModulo?.trim();
    const action = permission.accion?.trim();
    if (module && action) {
      const normalizedModule = this.normalize(module);
      const normalizedAction = this.normalize(action);
      codes.add(`${normalizedModule}_${normalizedAction}`);

      if (normalizedModule === 'VALIDACION_IDENTIDAD') {
        if (normalizedAction === 'VER') codes.add('VALIDACIONIDENTIDAD_CONSULTAR');
        if (normalizedAction === 'CREAR') codes.add('VALIDACIONIDENTIDAD_IMPORTAR');
        if (normalizedAction === 'EDITAR') codes.add('VALIDACIONIDENTIDAD_EDITAR');
      }
    }

    return Array.from(codes);
  }

  private normalize(value: string): string {
    return value.trim().toUpperCase();
  }
}
