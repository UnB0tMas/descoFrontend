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
  readonly retiringId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly referencesError = signal<string | null>(null);
  readonly result = signal<PageResult<Empleado>>(emptyPageResult(20));
  readonly areas = signal<readonly Area[]>([]);

  readonly areaFilter = signal<number | null>(null);
  readonly activeFilter = signal<boolean | null>(true);

  readonly pageIcon = faUsers;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly retireIcon = faArrowRightFromBracket;
  readonly refreshIcon = faRotate;

  readonly hasSpecificUot = computed(
    () => this.uot.modo() === 'ESPECIFICA' && (this.uot.selectedId() ?? 0) > 0,
  );
  readonly uotName = computed(() => this.uot.selected()?.nombre ?? 'UOT no seleccionada');
  readonly activeAreas = computed(() => this.areas().filter((area) => area.estado));

  ngOnInit(): void {
    if (!this.hasSpecificUot()) return;
    this.loadReferences();
    this.load(1);
  }

  loadReferences(): void {
    if (!this.hasSpecificUot()) return;
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    loadAllAdminPages((page, size) => this.organizationsUseCase.areas(page, size))
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
    if (!this.hasSpecificUot()) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute({
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
    if (!this.requireSpecificUot() || this.referencesLoading()) return;
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las áreas', this.referencesError()!);
      return;
    }

    const result = await this.formModal.open({ areas: this.activeAreas() });
    if (result.saved) this.load(1);
  }

  edit(employee: Empleado): void {
    if (!this.requireSpecificUot() || this.editingId()) return;
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las áreas', this.referencesError()!);
      return;
    }

    this.editingId.set(employee.empleadoId);
    this.getUseCase.execute(employee.empleadoId)
      .pipe(finalize(() => this.editingId.set(null)))
      .subscribe({
        next: async (detail) => {
          const result = await this.formModal.open({ areas: this.activeAreas() }, detail);
          if (result.saved) this.load();
        },
        error: (error) => this.toast.error('No se pudo abrir el empleado', mapOpenApiError(error).message),
      });
  }

  async retire(employee: Empleado): Promise<void> {
    if (!this.requireSpecificUot() || !employee.estado || this.retiringId()) return;

    const confirmation = await this.confirmDialog.show({
      title: 'Retirar empleado',
      message: `Se retirará a ${this.fullName(employee)} de ${this.uotName()}.`,
      tone: 'danger',
      confirmLabel: 'Retirar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo del retiro.',
      minimumReasonLength: 5,
    });
    if (!confirmation.confirmed || !confirmation.reason) return;

    this.retiringId.set(employee.empleadoId);
    this.retireUseCase.execute(employee.empleadoId, confirmation.reason)
      .pipe(finalize(() => this.retiringId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Empleado retirado');
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

  private requireSpecificUot(): boolean {
    if (this.hasSpecificUot()) return true;
    this.toast.info('Selecciona una UOT', 'Los empleados se administran dentro de una UOT específica.');
    return false;
  }
}
