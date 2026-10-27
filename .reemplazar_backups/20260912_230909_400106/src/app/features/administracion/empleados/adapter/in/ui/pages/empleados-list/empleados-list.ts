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

  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly retiringId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<PageResult<Empleado>>(emptyPageResult(20));

  readonly companies = signal<readonly AdminSelectOption[]>([]);
  readonly areas = signal<readonly Area[]>([]);

  readonly companyFilter = signal<number | null>(null);
  readonly areaFilter = signal<number | null>(null);
  readonly activeFilter = signal<boolean | null>(true);

  readonly pageIcon = faUsers;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly retireIcon = faArrowRightFromBracket;
  readonly refreshIcon = faRotate;

  readonly filteredAreas = computed(() => {
    const companyId = this.companyFilter();

    return this.areas().filter(
      (area) =>
        area.estado &&
        (companyId === null || area.empresaId === companyId),
    );
  });

  ngOnInit(): void {
    this.loadReferences();
    this.load(1);
  }

  loadReferences(): void {
    this.referencesLoading.set(true);

    forkJoin({
      companies: this.organizationsUseCase.execute(1, 100),
      areas: this.organizationsUseCase.areas(1, 100),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ companies, areas }) => {
          this.companies.set(
            companies.items.map((company) => ({
              value: company.empresaId,
              label: company.razonSocial,
              description: company.ruc,
            })),
          );
          this.areas.set(areas.items);
        },
        error: () => {
          this.companies.set([]);
          this.areas.set([]);
        },
      });
  }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute({
        empresaId: this.companyFilter() ?? undefined,
        areaId: this.areaFilter() ?? undefined,
        activo: this.activeFilter() ?? undefined,
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

  changeCompany(value: string): void {
    const id = Number(value);
    this.companyFilter.set(Number.isFinite(id) && id > 0 ? id : null);

    if (
      this.areaFilter() !== null &&
      !this.filteredAreas().some(
        (area) => area.areaId === this.areaFilter(),
      )
    ) {
      this.areaFilter.set(null);
    }

    this.load(1);
  }

  changeArea(value: string): void {
    const id = Number(value);
    this.areaFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.load(1);
  }

  changeActive(value: string): void {
    this.activeFilter.set(
      value === 'true' ? true : value === 'false' ? false : null,
    );
    this.load(1);
  }

  async create(): Promise<void> {
    if (this.referencesLoading()) {
      return;
    }

    if (this.companies().length === 0) {
      this.toast.info(
        'Falta una organización',
        'Registra una organización antes de crear empleados.',
      );
      return;
    }

    const result = await this.formModal.open({
      companies: this.companies(),
      areas: this.areas(),
    });

    if (result.saved) {
      this.load(1);
    }
  }

  edit(employee: Empleado): void {
    if (this.editingId()) {
      return;
    }

    this.editingId.set(employee.empleadoId);
    this.getUseCase
      .execute(employee.empleadoId)
      .pipe(finalize(() => this.editingId.set(null)))
      .subscribe({
        next: async (detail) => {
          const result = await this.formModal.open(
            {
              companies: this.companies(),
              areas: this.areas(),
            },
            detail,
          );

          if (result.saved) {
            this.load();
          }
        },
        error: (error) =>
          this.toast.error(
            'No se pudo abrir el empleado',
            mapOpenApiError(error).message,
          ),
      });
  }

  async retire(employee: Empleado): Promise<void> {
    if (!employee.estado || this.retiringId()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: 'Retirar empleado',
      message: `Se registrará el retiro de ${this.fullName(employee)}.`,
      tone: 'danger',
      confirmLabel: 'Retirar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo del retiro.',
      minimumReasonLength: 5,
    });

    if (!confirmation.confirmed || !confirmation.reason) {
      return;
    }

    this.retiringId.set(employee.empleadoId);

    this.retireUseCase
      .execute(employee.empleadoId, confirmation.reason)
      .pipe(finalize(() => this.retiringId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Empleado retirado');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo retirar al empleado',
            mapOpenApiError(error).message,
          ),
      });
  }

  fullName(employee: Empleado): string {
    return [
      employee.nombres,
      employee.apellidoPaterno,
      employee.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' ');
  }
}
