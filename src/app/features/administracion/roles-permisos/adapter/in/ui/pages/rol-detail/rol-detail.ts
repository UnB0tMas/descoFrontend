import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBan,
  faCircleInfo,
  faKey,
  faLock,
  faRotate,
  faShieldHalved,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { DeshabilitarRolUseCase } from '../../../../../application/use-case/deshabilitar-rol.use-case';
import { ObtenerRolUseCase } from '../../../../../application/use-case/obtener-rol.use-case';
import { RolDetalle } from '../../../../../domain/rol.model';

@Component({
  selector: 'app-rol-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    PageHeaderComponent,
  ],
  templateUrl: './rol-detail.html',
  styleUrl: './rol-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getUseCase = inject(ObtenerRolUseCase);
  private readonly disableUseCase = inject(DeshabilitarRolUseCase);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly disabling = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<RolDetalle | null>(null);

  readonly permissionPage = signal(1);
  readonly permissionSize = signal(10);
  readonly userPage = signal(1);
  readonly userSize = signal(10);

  readonly roleId = Number(this.route.snapshot.paramMap.get('id'));

  readonly pageIcon = faShieldHalved;
  readonly backIcon = faArrowLeft;
  readonly refreshIcon = faRotate;
  readonly permissionsIcon = faKey;
  readonly usersIcon = faUserGroup;
  readonly disableIcon = faBan;
  readonly lockIcon = faLock;
  readonly infoIcon = faCircleInfo;

  readonly activePermissions = computed(
    () => this.detail()?.permisos.filter((permission) => permission.estado) ?? [],
  );

  readonly permissionTotalPages = computed(() =>
    this.totalPages(this.activePermissions().length, this.permissionSize()),
  );

  readonly pagedPermissions = computed(() =>
    this.slicePage(
      this.activePermissions(),
      this.permissionPage(),
      this.permissionSize(),
    ),
  );

  readonly users = computed(() => this.detail()?.usuarios ?? []);

  readonly userTotalPages = computed(() =>
    this.totalPages(this.users().length, this.userSize()),
  );

  readonly pagedUsers = computed(() =>
    this.slicePage(this.users(), this.userPage(), this.userSize()),
  );

  readonly systemRoleReason =
    'Este es un rol base administrado por el sistema. Su definición está protegida para mantener estable la matriz oficial de acceso.';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!Number.isFinite(this.roleId) || this.roleId <= 0) {
      this.errorMessage.set('El rol solicitado no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.getUseCase
      .execute(this.roleId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.permissionPage.set(1);
          this.userPage.set(1);
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  changePermissionPage(page: number): void {
    this.permissionPage.set(this.safePage(page, this.permissionTotalPages()));
  }

  changePermissionSize(size: number): void {
    this.permissionSize.set(size);
    this.permissionPage.set(1);
  }

  changeUserPage(page: number): void {
    this.userPage.set(this.safePage(page, this.userTotalPages()));
  }

  changeUserSize(size: number): void {
    this.userSize.set(size);
    this.userPage.set(1);
  }

  async disable(dialog: ActionConfirmDialogComponent): Promise<void> {
    const role = this.detail()?.rol;

    if (!role || this.disabling()) {
      return;
    }

    if (role.esSistema) {
      this.toast.info(
        'Rol base protegido',
        'Los roles base no pueden deshabilitarse desde la interfaz porque forman parte de la matriz oficial de acceso.',
      );
      return;
    }

    const confirmation = await dialog.show({
      title: 'Deshabilitar rol',
      message: `El rol "${role.nombre}" dejará de estar disponible.`,
      tone: 'danger',
      confirmLabel: 'Deshabilitar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica por qué debe deshabilitarse este rol.',
      minimumReasonLength: 5,
    });

    if (!confirmation.confirmed || !confirmation.reason) {
      return;
    }

    this.disabling.set(true);

    this.disableUseCase
      .execute(role.rolId, confirmation.reason)
      .pipe(finalize(() => this.disabling.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Rol deshabilitado');
          void this.router.navigate(['/administracion/roles-permisos']);
        },
        error: (error) =>
          this.toast.error(
            'No se pudo deshabilitar el rol',
            mapOpenApiError(error).message,
          ),
      });
  }

  private totalPages(totalRecords: number, size: number): number {
    return totalRecords === 0 ? 0 : Math.ceil(totalRecords / size);
  }

  private safePage(page: number, totalPages: number): number {
    if (totalPages <= 0) {
      return 1;
    }

    return Math.min(Math.max(1, page), totalPages);
  }

  private slicePage<T>(
    values: readonly T[],
    page: number,
    size: number,
  ): readonly T[] {
    const start = (page - 1) * size;
    return values.slice(start, start + size);
  }
}
