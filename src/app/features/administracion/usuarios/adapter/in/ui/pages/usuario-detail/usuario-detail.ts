import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faBan,
  faComputer,
  faFloppyDisk,
  faKey,
  faPen,
  faPlus,
  faRotate,
  faRotateLeft,
  faShieldHalved,
  faTrashCan,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { closeAnimatedDialog, openAnimatedDialog } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { ListarRolesUseCase } from '../../../../../../roles-permisos/application/use-case/listar-roles.use-case';
import { AsignarRolUsuarioUseCase } from '../../../../../application/use-case/asignar-rol-usuario.use-case';
import { DeshabilitarCuentaUseCase } from '../../../../../application/use-case/deshabilitar-cuenta.use-case';
import { ObtenerUsuarioUseCase } from '../../../../../application/use-case/obtener-usuario.use-case';
import { ReactivarCuentaUseCase } from '../../../../../application/use-case/reactivar-cuenta.use-case';
import { RetirarRolUsuarioUseCase } from '../../../../../application/use-case/retirar-rol-usuario.use-case';
import { UsuarioDetalle, UsuarioRol } from '../../../../../domain/usuario.model';
import { UsuarioFormComponent } from '../usuario-form/usuario-form';

@Component({
  selector: 'app-usuario-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    ActionConfirmDialogComponent,
    FormErrorComponent,
    PageHeaderComponent,
    UsuarioFormComponent,
  ],
  templateUrl: './usuario-detail.html',
  styleUrl: './usuario-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioDetailPage implements OnInit {
  @ViewChild(UsuarioFormComponent)
  private formModal!: UsuarioFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirmDialog!: ActionConfirmDialogComponent;

  @ViewChild('roleDialog', { static: true })
  private readonly roleDialog!: ElementRef<HTMLDialogElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly getUseCase = inject(ObtenerUsuarioUseCase);
  private readonly disableUseCase = inject(DeshabilitarCuentaUseCase);
  private readonly reactivateUseCase = inject(ReactivarCuentaUseCase);
  private readonly assignRoleUseCase = inject(AsignarRolUsuarioUseCase);
  private readonly removeRoleUseCase = inject(RetirarRolUsuarioUseCase);
  private readonly rolesUseCase = inject(ListarRolesUseCase);
  private readonly toast = inject(ToastService);

  readonly userId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly rolesLoading = signal(true);
  readonly accountActionLoading = signal(false);
  readonly roleSaving = signal(false);
  readonly removingRoleId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly roleError = signal<string | null>(null);
  readonly rolesError = signal<string | null>(null);
  readonly detail = signal<UsuarioDetalle | null>(null);
  readonly availableRoles = signal<readonly AdminSelectOption[]>([]);

  readonly pageIcon = faShieldHalved;
  readonly backIcon = faArrowLeft;
  readonly editIcon = faPen;
  readonly refreshIcon = faRotate;
  readonly disableIcon = faBan;
  readonly reactivateIcon = faRotateLeft;
  readonly roleIcon = faKey;
  readonly addIcon = faPlus;
  readonly removeIcon = faTrashCan;
  readonly deviceIcon = faComputer;
  readonly userIcon = faUser;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;

  readonly roleForm = this.fb.nonNullable.group({
    rolId: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadRoles();
    this.load();
  }

  load(): void {
    if (!Number.isFinite(this.userId) || this.userId <= 0) {
      this.errorMessage.set('El usuario solicitado no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.getUseCase
      .execute(this.userId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  loadRoles(): void {
    this.rolesLoading.set(true);
    this.rolesError.set(null);

    loadAllAdminPages((page, size) => this.rolesUseCase.execute(page, size))
      .pipe(finalize(() => this.rolesLoading.set(false)))
      .subscribe({
        next: (roles) =>
          this.availableRoles.set(
            roles
              .filter((role) => role.estado)
              .map((role) => ({
                value: role.rolId,
                label: role.nombre,
                description: role.codigo,
              })),
          ),
        error: (error) => {
          this.availableRoles.set([]);
          this.rolesError.set(mapOpenApiError(error).message);
        },
      });
  }

  async edit(): Promise<void> {
    const user = this.detail();

    if (!user) {
      return;
    }

    const result = await this.formModal.openEdit(user);

    if (result.saved) {
      this.load();
    }
  }

  async disable(): Promise<void> {
    const user = this.detail();

    if (!user || this.accountActionLoading()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: 'Deshabilitar cuenta',
      message: `La cuenta "${user.nombreUsuario}" dejará de poder ingresar al sistema.`,
      tone: 'danger',
      confirmLabel: 'Deshabilitar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo de la deshabilitación.',
      minimumReasonLength: 5,
    });

    if (!confirmation.confirmed || !confirmation.reason) {
      return;
    }

    this.accountActionLoading.set(true);

    this.disableUseCase
      .execute(user.usuarioId, confirmation.reason)
      .pipe(finalize(() => this.accountActionLoading.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Cuenta deshabilitada');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo deshabilitar la cuenta',
            mapOpenApiError(error).message,
          ),
      });
  }

  async reactivate(): Promise<void> {
    const user = this.detail();

    if (!user || this.accountActionLoading()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: 'Reactivar cuenta',
      message: `La cuenta "${user.nombreUsuario}" volverá a estar disponible.`,
      tone: 'primary',
      confirmLabel: 'Reactivar',
      cancelLabel: 'Cancelar',
      requiresReason: false,
    });

    if (!confirmation.confirmed) {
      return;
    }

    this.accountActionLoading.set(true);

    this.reactivateUseCase
      .execute(user.usuarioId)
      .pipe(finalize(() => this.accountActionLoading.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Cuenta reactivada');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo reactivar la cuenta',
            mapOpenApiError(error).message,
          ),
      });
  }

  openAssignRole(): void {
    if (this.rolesLoading()) {
      return;
    }

    if (this.rolesError()) {
      this.toast.error('No se pudieron cargar los roles', this.rolesError()!);
      return;
    }

    const selected = new Set(
      this.detail()?.roles
        .filter((role) => role.estado)
        .map((role) => role.rolId) ?? [],
    );

    const firstAvailable = this.availableRoles().find(
      (role) => !selected.has(role.value),
    );

    this.roleForm.reset({ rolId: firstAvailable?.value ?? 0 });
    this.roleError.set(null);
    openAnimatedDialog(this.roleDialog.nativeElement);
  }

  closeRoleDialog(): void {
    if (this.roleSaving()) {
      return;
    }

    closeAnimatedDialog(this.roleDialog.nativeElement, () => {
      this.roleError.set(null);
    });
  }

  roleOptions(): readonly AdminSelectOption[] {
    const selected = new Set(
      this.detail()?.roles
        .filter((role) => role.estado)
        .map((role) => role.rolId) ?? [],
    );

    return this.availableRoles().filter(
      (role) => !selected.has(role.value),
    );
  }

  assignRole(): void {
    this.roleForm.markAllAsTouched();

    const user = this.detail();
    const roleId = Number(this.roleForm.controls.rolId.value);

    if (!user || this.roleForm.invalid || this.roleSaving()) {
      return;
    }

    this.roleSaving.set(true);
    this.roleError.set(null);

    this.assignRoleUseCase
      .execute(user.usuarioId, roleId)
      .pipe(finalize(() => this.roleSaving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Rol asignado');
          this.closeRoleDialog();
          this.load();
        },
        error: (error) =>
          this.roleError.set(mapOpenApiError(error).message),
      });
  }

  async removeRole(role: UsuarioRol): Promise<void> {
    const user = this.detail();

    if (!user || !role.estado || this.removingRoleId()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: 'Retirar rol',
      message: `El rol "${role.nombre}" dejará de estar asignado a la cuenta.`,
      tone: 'danger',
      confirmLabel: 'Retirar rol',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo del retiro del rol.',
      minimumReasonLength: 5,
    });

    if (!confirmation.confirmed || !confirmation.reason) {
      return;
    }

    this.removingRoleId.set(role.rolId);

    this.removeRoleUseCase
      .execute(user.usuarioId, role.rolId, confirmation.reason)
      .pipe(finalize(() => this.removingRoleId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Rol retirado');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo retirar el rol',
            mapOpenApiError(error).message,
          ),
      });
  }

  isDisabled(): boolean {
    return (this.detail()?.estadoCuenta || '').toUpperCase() === 'DESHABILITADA';
  }

  accountStateLabel(state: string | null): string {
    switch ((state || '').toUpperCase()) {
      case 'ACTIVA':
        return 'Activa';
      case 'DESHABILITADA':
        return 'Deshabilitada';
      case 'PENDIENTE_VALIDACION':
        return 'Pendiente de validación';
      case 'BLOQUEADA':
        return 'Bloqueada';
      default:
        return state || 'Sin estado';
    }
  }
}
