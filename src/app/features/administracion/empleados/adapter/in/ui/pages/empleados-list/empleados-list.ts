import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightFromBracket,
  faEye,
  faPen,
  faPlus,
  faRotate,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

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
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { ListarOrganizacionesUseCase } from '../../../../../../organizaciones/application/use-case/listar-organizaciones.use-case';
import { Area } from '../../../../../../organizaciones/domain/area.model';
import { ListarEmpleadosUseCase } from '../../../../../application/use-case/listar-empleados.use-case';
import { ObtenerEmpleadoUseCase } from '../../../../../application/use-case/obtener-empleado.use-case';
import { RetirarEmpleadoUseCase } from '../../../../../application/use-case/retirar-empleado.use-case';
import { Empleado } from '../../../../../domain/empleado.model';
import { EmpleadoFormComponent } from '../empleado-form/empleado-form';

@Component({
  selector: 'app-empleados-list-page',
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
    EmpleadoFormComponent,
  ],
  templateUrl: './empleados-list.html',
  styleUrl: './empleados-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadosListPage implements OnInit {
  @ViewChild(EmpleadoFormComponent)
  private formModal!: EmpleadoFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirmDialog!: ActionConfirmDialogComponent;

  private readonly listUseCase = inject(ListarEmpleadosUseCase);
  private readonly getUseCase = inject(ObtenerEmpleadoUseCase);
  private readonly retireUseCase = inject(RetirarEmpleadoUseCase);
  private readonly organizationsUseCase = inject(ListarOrganizacionesUseCase);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(false);
  readonly referencesLoading = signal(false);
  readonly retiringId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly referencesError = signal<string | null>(null);
  readonly result = signal<PageResult<Empleado>>(emptyPageResult(20));
  readonly areas = signal<readonly Area[]>([]);

  readonly unitFilter = signal<number | null>(null);
  readonly areaFilter = signal<number | null>(null);
  readonly activeFilter = signal<boolean | null>(true);

  readonly pageIcon = faUsers;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly retireIcon = faArrowRightFromBracket;
  readonly refreshIcon = faRotate;

  readonly isGeneral = computed(() => this.uot.modo() === 'GENERAL');
  readonly units = computed(() => this.uot.memberships());
  readonly contextUotId = computed(() =>
    this.isGeneral() ? this.unitFilter() : this.uot.selectedId(),
  );
  readonly contextUotName = computed(() => {
    const id = this.contextUotId();
    return id
      ? this.units().find((unit) => unit.uotId === id)?.nombre ?? 'UOT'
      : 'Todas mis UOT';
  });
  readonly activeAreas = computed(() => {
    const uotId = this.contextUotId();
    return this.areas().filter(
      (area) => area.estado && (!uotId || area.uotId === uotId),
    );
  });

  ngOnInit(): void {
    this.unitFilter.set(this.uot.modo() === 'ESPECIFICA' ? this.uot.selectedId() : null);
    this.loadReferences();
    this.load(1);
  }

  loadReferences(): void {
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    loadAllAdminPages((page, size) =>
      this.organizationsUseCase.areas(page, size, this.contextUotId() ?? undefined),
    )
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (areas) => this.areas.set(areas),
        error: (error) => {
          this.areas.set([]);
          this.referencesError.set(mapOpenApiError(error).message);
        },
      });
  }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute({
        uotId: this.contextUotId() ?? undefined,
        areaId: this.areaFilter() ?? undefined,
        activo: this.activeFilter() ?? undefined,
        page,
        size,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  changeUot(value: string): void {
    const id = Number(value);
    this.unitFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.areaFilter.set(null);
    this.loadReferences();
    this.load(1);
  }

  changeArea(value: string): void {
    const id = Number(value);
    this.areaFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.load(1);
  }

  changeActive(value: string): void {
    this.activeFilter.set(value === 'true' ? true : value === 'false' ? false : null);
    this.load(1);
  }

  async create(): Promise<void> {
    if (this.referencesLoading()) return;
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las áreas', this.referencesError()!);
      return;
    }

    const result = await this.formModal.open({
      areas: this.areas().filter((area) => area.estado),
      preferredUotId: this.contextUotId() ?? undefined,
    });
    if (result.saved) {
      this.loadReferences();
      this.load(1);
    }
  }

  edit(employee: Empleado): void {
    const key = this.rowKey(employee);
    if (this.editingId()) return;
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las áreas', this.referencesError()!);
      return;
    }

    this.editingId.set(key);
    this.getUseCase.execute(employee.empleadoId, employee.uotId)
      .pipe(finalize(() => this.editingId.set(null)))
      .subscribe({
        next: async (detail) => {
          const result = await this.formModal.open(
            {
              areas: this.areas().filter((area) => area.estado),
              preferredUotId: employee.uotId,
            },
            detail,
          );
          if (result.saved) this.load();
        },
        error: (error) => this.toast.error('No se pudo abrir el empleado', mapOpenApiError(error).message),
      });
  }

  async retire(employee: Empleado): Promise<void> {
    const key = this.rowKey(employee);
    if (!employee.estado || this.retiringId()) return;

    const confirmation = await this.confirmDialog.show({
      title: 'Retirar empleado de la UOT',
      message: `Se cerrará la adscripción de ${this.fullName(employee)} en ${employee.uotNombre}. Si trabaja en otra UOT, su cuenta seguirá activa allí.`,
      tone: 'danger',
      confirmLabel: 'Retirar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo del retiro.',
      minimumReasonLength: 5,
    });
    if (!confirmation.confirmed || !confirmation.reason) return;

    this.retiringId.set(key);
    this.retireUseCase.execute(employee.empleadoId, employee.uotId, confirmation.reason)
      .pipe(finalize(() => this.retiringId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Adscripción del empleado retirada');
          this.load();
        },
        error: (error) => this.toast.error('No se pudo retirar al empleado', mapOpenApiError(error).message),
      });
  }

  fullName(employee: Empleado): string {
    return [employee.nombres, employee.apellidoPaterno, employee.apellidoMaterno]
      .filter(Boolean)
      .join(' ');
  }

  rowKey(employee: Empleado): string {
    return `${employee.empleadoId}-${employee.uotId}`;
  }
}
