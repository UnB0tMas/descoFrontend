import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowRightFromBracket,
  faBuilding,
  faClockRotateLeft,
  faIdCard,
  faPen,
  faRotate,
  faShieldHalved,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin, finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { ListarOrganizacionesUseCase } from '../../../../../../organizaciones/application/use-case/listar-organizaciones.use-case';
import { Area } from '../../../../../../organizaciones/domain/area.model';
import { ObtenerEmpleadoUseCase } from '../../../../../application/use-case/obtener-empleado.use-case';
import { RetirarEmpleadoUseCase } from '../../../../../application/use-case/retirar-empleado.use-case';
import { EmpleadoDetalle } from '../../../../../domain/empleado.model';
import { EmpleadoFormComponent } from '../empleado-form/empleado-form';

@Component({
  selector: 'app-empleado-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    ActionConfirmDialogComponent,
    PageHeaderComponent,
    EmpleadoFormComponent,
  ],
  templateUrl: './empleado-detail.html',
  styleUrl: './empleado-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadoDetailPage implements OnInit {
  @ViewChild(EmpleadoFormComponent)
  private formModal!: EmpleadoFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirmDialog!: ActionConfirmDialogComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getUseCase = inject(ObtenerEmpleadoUseCase);
  private readonly retireUseCase = inject(RetirarEmpleadoUseCase);
  private readonly organizationsUseCase = inject(ListarOrganizacionesUseCase);
  private readonly toast = inject(ToastService);

  readonly employeeId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly retiring = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<EmpleadoDetalle | null>(null);
  readonly companies = signal<readonly AdminSelectOption[]>([]);
  readonly areas = signal<readonly Area[]>([]);

  readonly pageIcon = faUser;
  readonly backIcon = faArrowLeft;
  readonly editIcon = faPen;
  readonly retireIcon = faArrowRightFromBracket;
  readonly refreshIcon = faRotate;
  readonly identityIcon = faIdCard;
  readonly organizationIcon = faBuilding;
  readonly historyIcon = faClockRotateLeft;
  readonly accountIcon = faShieldHalved;

  readonly fullName = computed(() => {
    const value = this.detail();

    return value
      ? [value.nombres, value.apellidoPaterno, value.apellidoMaterno]
          .filter(Boolean)
          .join(' ')
      : 'Empleado';
  });

  ngOnInit(): void {
    this.loadReferences();
    this.load();
  }

  load(): void {
    if (!Number.isFinite(this.employeeId) || this.employeeId <= 0) {
      this.errorMessage.set('El empleado solicitado no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.getUseCase
      .execute(this.employeeId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
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

  async edit(): Promise<void> {
    const employee = this.detail();

    if (!employee || !employee.estado || this.referencesLoading()) {
      return;
    }

    const result = await this.formModal.open(
      {
        companies: this.companies(),
        areas: this.areas(),
      },
      employee,
    );

    if (result.saved) {
      this.load();
    }
  }

  async retire(): Promise<void> {
    const employee = this.detail();

    if (!employee || !employee.estado || this.retiring()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: 'Retirar empleado',
      message: `Se registrará el retiro de ${this.fullName()}.`,
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

    this.retiring.set(true);

    this.retireUseCase
      .execute(employee.empleadoId, confirmation.reason)
      .pipe(finalize(() => this.retiring.set(false)))
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
}
