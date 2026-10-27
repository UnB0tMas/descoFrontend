import { Injectable, inject } from '@angular/core';
import { map, switchMap, tap } from 'rxjs';

// Estos simbolos se generan automaticamente desde los operationId y @Schema del backend.
import { ConveniosService } from '../../../../../infrastructure/openapi/generated/api/convenios.service';
import { ConvenioDetalleResponse } from '../../../../../infrastructure/openapi/generated/model/convenioDetalleResponse';
import { ConvenioAsociacionResponse } from '../../../../../infrastructure/openapi/generated/model/convenioAsociacionResponse';
import { ConvenioModuloPermisoResponse } from '../../../../../infrastructure/openapi/generated/model/convenioModuloPermisoResponse';
import { ConvenioModuloUsuarioResponse } from '../../../../../infrastructure/openapi/generated/model/convenioModuloUsuarioResponse';
import { ConvenioModuloResponse } from '../../../../../infrastructure/openapi/generated/model/convenioModuloResponse';
import { unwrapApiResponse } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import { ConveniosModulesStore } from '../../../state/convenios-modules.store';

@Injectable({ providedIn: 'root' })
export class ConveniosApiService {
  private readonly api = inject(ConveniosService);
  private readonly store = inject(ConveniosModulesStore);

  loadActive() {
    return this.api.conveniosModulosActivos({}, 'body', false, { transferCache: false }).pipe(
      map((r) => unwrapApiResponse<ConvenioModuloResponse[]>(r) ?? []),
      tap((modules) => this.store.set(modules.map((m) => ({ codigo: m.codigo ?? '', nombre: m.nombre ?? '' })))),
    );
  }

  list() {
    return this.api.conveniosListar({}, 'body', false, { transferCache: false }).pipe(
      map((r) => unwrapApiResponse<ConvenioDetalleResponse[]>(r) ?? []),
    );
  }

  configure(id: number, codigo: string, habilitado: boolean) {
    return this.api.conveniosConfigurarModulo(
      { id, codigo, convenioModuloRequest: { habilitado } },
      'body', false, { transferCache: false },
    ).pipe(
      map((r) => unwrapApiResponse<void>(r)),
      switchMap(() => this.loadActive()),
      map(() => undefined),
    );
  }

  associations() {
    return this.api.conveniosAsociacionesActivas({}, 'body', false, { transferCache: false }).pipe(
      map((r) => unwrapApiResponse<ConvenioAsociacionResponse[]>(r) ?? []),
    );
  }

  permissions(code: string) {
    return this.api.conveniosPermisosModulo({ codigo: code }, 'body', false, { transferCache: false }).pipe(
      map((r) => unwrapApiResponse<ConvenioModuloPermisoResponse[]>(r) ?? []),
    );
  }

  users(code: string) {
    return this.api.conveniosUsuariosModulo({ codigo: code }, 'body', false, { transferCache: false }).pipe(
      map((r) => unwrapApiResponse<ConvenioModuloUsuarioResponse[]>(r) ?? []),
    );
  }

  assignUser(code: string, usuarioId: number, permisos: string[]) {
    return this.api.conveniosAsignarPermisosUsuario(
      { codigo: code, usuarioId, convenioModuloUsuarioPermisosRequest: { permisos } },
      'body', false, { transferCache: false },
    ).pipe(map((r) => unwrapApiResponse<void>(r)));
  }
}
