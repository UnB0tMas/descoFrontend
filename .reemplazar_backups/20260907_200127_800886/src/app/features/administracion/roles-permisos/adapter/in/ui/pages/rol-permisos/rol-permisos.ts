import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faCheckDouble,
  faFloppyDisk,
  faKey,
  faLock,
  faMagnifyingGlass,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessStore } from '../../../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { ActualizarPermisosRolUseCase } from '../../../../../application/use-case/actualizar-permisos-rol.use-case';
import { ObtenerRolUseCase } from '../../../../../application/use-case/obtener-rol.use-case';
import { PermisoAsignable } from '../../../../../domain/rol-permiso.model';
import { RolDetalle } from '../../../../../domain/rol.model';

interface PermissionGroup {
  moduleCode: string;
  moduleName: string;
  permissions: readonly PermisoAsignable[];
}

@Component({
  selector: 'app-rol-permisos-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    FaIconComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './rol-permisos.html',
  styleUrl: './rol-permisos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolPermisosPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly access = inject(AccessStore);
  private readonly getUseCase = inject(ObtenerRolUseCase);
  private readonly updateUseCase = inject(ActualizarPermisosRolUseCase);
  private readonly toast = inject(ToastService);

  readonly roleId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<RolDetalle | null>(null);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly search = signal('');
  readonly reason = signal('');

  readonly pageIcon = faKey;
  readonly backIcon = faArrowLeft;
  readonly searchIcon = faMagnifyingGlass;
  readonly selectIcon = faCheckDouble;
  readonly saveIcon = faFloppyDisk;
  readonly refreshIcon = faRotate;
  readonly lockIcon = faLock;
  readonly checkIcon = faCheck;

  readonly assignable = computed<readonly PermisoAsignable[]>(() => {
    const unique = new Map<number, PermisoAsignable>();

    for (const permission of this.access.permissions()) {
      if (!permission.permisoId) {
        continue;
      }

      unique.set(permission.permisoId, {
        permisoId: permission.permisoId,
        codigo: permission.codigo,
        nombre: permission.nombre || permission.codigo,
        descripcion: permission.descripcion,
        accion: permission.accion,
        moduloCodigo: permission.codigoModulo || 'GENERAL',
        moduloNombre:
          this.access
            .modules()
            .find((module) => module.codigo === permission.codigoModulo)
            ?.nombre ||
          permission.codigoModulo ||
          'General',
        sensible: permission.sensible,
        requiereMotivo: permission.requiereMotivo,
      });
    }

    return [...unique.values()].sort(
      (a, b) =>
        a.moduloNombre.localeCompare(b.moduloNombre) ||
        a.nombre.localeCompare(b.nombre),
    );
  });

  readonly groups = computed<readonly PermissionGroup[]>(() => {
    const term = this.search().trim().toLowerCase();
    const grouped = new Map<string, PermissionGroup>();

    for (const permission of this.assignable()) {
      const searchable =
        `${permission.nombre} ${permission.codigo} ${permission.moduloNombre}`.toLowerCase();

      if (term && !searchable.includes(term)) {
        continue;
      }

      const current = grouped.get(permission.moduloCodigo);

      if (current) {
        grouped.set(permission.moduloCodigo, {
          ...current,
          permissions: [...current.permissions, permission],
        });
      } else {
        grouped.set(permission.moduloCodigo, {
          moduleCode: permission.moduloCodigo,
          moduleName: permission.moduloNombre,
          permissions: [permission],
        });
      }
    }

    return [...grouped.values()];
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.getUseCase
      .execute(this.roleId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.selectedIds.set(
            new Set(
              detail.permisos
                .filter((permission) => permission.estado)
                .map((permission) => permission.permisoId),
            ),
          );
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggle(id: number, checked: boolean): void {
    const next = new Set(this.selectedIds());

    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    this.selectedIds.set(next);
  }

  toggleGroup(group: PermissionGroup): void {
    const next = new Set(this.selectedIds());
    const allSelected = group.permissions.every((permission) =>
      next.has(permission.permisoId),
    );

    for (const permission of group.permissions) {
      if (allSelected) {
        next.delete(permission.permisoId);
      } else {
        next.add(permission.permisoId);
      }
    }

    this.selectedIds.set(next);
  }

  save(): void {
    const role = this.detail()?.rol;

    if (!role || role.esSistema || this.saving()) {
      return;
    }

    this.saving.set(true);

    this.updateUseCase
      .execute(role.rolId, {
        permisoIds: [...this.selectedIds()],
        motivo: this.reason().trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Permisos actualizados');
          void this.router.navigate([
            '/administracion/roles-permisos',
            role.rolId,
          ]);
        },
        error: (error) =>
          this.toast.error(
            'No se pudieron actualizar los permisos',
            mapOpenApiError(error).message,
          ),
      });
  }
}
