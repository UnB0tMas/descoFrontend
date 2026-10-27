import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faEye,
  faPen,
  faPlus,
  faRotate,
  faRotateLeft,
  faUsersGear,
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin, finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { ListarOrganizacionesUseCase } from '../../../../../../organizaciones/application/use-case/listar-organizaciones.use-case';
import { ListarRolesUseCase } from '../../../../../../roles-permisos/application/use-case/listar-roles.use-case';
import { ListarEmpleadosUseCase } from '../../../../../../empleados/application/use-case/listar-empleados.use-case';
import { DeshabilitarCuentaUseCase } from '../../../../../application/use-case/deshabilitar-cuenta.use-case';
import { ListarUsuariosUseCase } from '../../../../../application/use-case/listar-usuarios.use-case';
import { ObtenerUsuarioUseCase } from '../../../../../application/use-case/obtener-usuario.use-case';
import { ReactivarCuentaUseCase } from '../../../../../application/use-case/reactivar-cuenta.use-case';
import { Usuario } from '../../../../../domain/usuario.model';
import { UsuarioFormComponent } from '../usuario-form/usuario-form';

@Component({
  selector: 'app-usuarios-list-page',
  standalone: true,
  imports: [
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    PageHeaderComponent,
    UsuarioFormComponent,
  ],
  templateUrl: './usuarios-list.html',
  styleUrl: './usuarios-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosListPage implements OnInit {
  @ViewChild(UsuarioFormComponent)
  private formModal!: UsuarioFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirmDialog!: ActionConfirmDialogComponent;

  private readonly listUseCase = inject(ListarUsuariosUseCase);
  private readonly getUseCase = inject(ObtenerUsuarioUseCase);
  private readonly disableUseCase = inject(DeshabilitarCuentaUseCase);
  private readonly reactivateUseCase = inject(ReactivarCuentaUseCase);
  private readonly organizationsUseCase = inject(ListarOrganizacionesUseCase);
  private readonly employeesUseCase = inject(ListarEmpleadosUseCase);
  private readonly rolesUseCase = inject(ListarRolesUseCase);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly actionUserId = signal<number | null>(null);
  readonly detailLoadingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly referencesError = signal<string | null>(null);
  readonly result = signal<PageResult<Usuario>>(emptyPageResult(20));

  readonly companies = signal<readonly AdminSelectOption[]>([]);
  readonly employees = signal<readonly AdminSelectOption[]>([]);
  readonly roles = signal<readonly AdminSelectOption[]>([]);

  readonly stateFilter = signal('');
  readonly companyFilter = signal<number | null>(null);

  readonly pageIcon = faUsersGear;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly disableIcon = faBan;
  readonly reactivateIcon = faRotateLeft;
  readonly refreshIcon = faRotate;

  ngOnInit(): void {
    this.loadReferences();
    this.load(1);
  }

  loadReferences(): void {
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    forkJoin({
      companies: loadAllAdminPages((page, size) =>
        this.organizationsUseCase.execute(page, size),
      ),
      employees: loadAllAdminPages((page, size) =>
        this.employeesUseCase.execute({ activo: true, page, size }),
      ),
      roles: loadAllAdminPages((page, size) =>
        this.rolesUseCase.execute(page, size),
      ),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ companies, employees, roles }) => {
          this.companies.set(
            companies.map((company) => ({
              value: company.empresaId,
              label: company.razonSocial,
              description: company.estado ? company.ruc : `${company.ruc} · Inactiva`,
            })),
          );

          this.employees.set(
            employees
              .filter((employee) => employee.estado && !employee.usuarioId)
              .map((employee) => ({
                value: employee.empleadoId,
                label: `${this.employeeName(employee)} · ${employee.numeroDocumento}`,
                description: `${employee.empresa}${employee.area ? ` · ${employee.area}` : ''}`,
              })),
          );

          this.roles.set(
            roles
              .filter((role) => role.estado)
              .map((role) => ({
                value: role.rolId,
                label: role.nombre,
                description: role.codigo,
              })),
          );
        },
        error: (error) => {
          this.companies.set([]);
          this.employees.set([]);
          this.roles.set([]);
          this.referencesError.set(mapOpenApiError(error).message);
        },
      });
  }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute({
        estadoCuenta: this.stateFilter() || undefined,
        empresaId: this.companyFilter() ?? undefined,
        page,
        size,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  changeState(value: string): void {
    this.stateFilter.set(value);
    this.load(1);
  }

  changeCompany(value: string): void {
    const id = Number(value);
    this.companyFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.load(1);
  }

  async create(): Promise<void> {
    if (this.referencesLoading()) {
      return;
    }

    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las opciones', this.referencesError()!);
      return;
    }

    if (this.employees().length === 0) {
      this.toast.info(
        'Sin empleados disponibles',
        'Todos los empleados activos ya tienen una cuenta.',
      );
      return;
    }

    if (this.roles().length === 0) {
      this.toast.warning(
        'Sin roles disponibles',
        'Primero debe existir al menos un rol activo.',
      );
      return;
    }

    const result = await this.formModal.openCreate({
      employees: this.employees(),
      roles: this.roles(),
    });

    if (result.saved) {
      this.loadReferences();
      this.load(1);
    }
  }

  edit(user: Usuario): void {
    if (this.detailLoadingId()) {
      return;
    }

    this.detailLoadingId.set(user.usuarioId);

    this.getUseCase
      .execute(user.usuarioId)
      .pipe(finalize(() => this.detailLoadingId.set(null)))
      .subscribe({
        next: async (detail) => {
          const result = await this.formModal.openEdit(detail);

          if (result.saved) {
            this.load();
          }
        },
        error: (error) =>
          this.toast.error(
            'No se pudo abrir la cuenta',
            mapOpenApiError(error).message,
          ),
      });
  }

  async disable(user: Usuario): Promise<void> {
    if (this.actionUserId()) {
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

    this.actionUserId.set(user.usuarioId);

    this.disableUseCase
      .execute(user.usuarioId, confirmation.reason)
      .pipe(finalize(() => this.actionUserId.set(null)))
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

  async reactivate(user: Usuario): Promise<void> {
    if (this.actionUserId()) {
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

    this.actionUserId.set(user.usuarioId);

    this.reactivateUseCase
      .execute(user.usuarioId)
      .pipe(finalize(() => this.actionUserId.set(null)))
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

  isDisabled(user: Usuario): boolean {
    return (user.estadoCuenta || '').toUpperCase() === 'DESHABILITADA';
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

  private employeeName(employee: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
  }): string {
    return [
      employee.nombres,
      employee.apellidoPaterno,
      employee.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' ');
  }
}
