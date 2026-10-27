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
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
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
  readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);

  readonly employeeId = Number(this.route.snapshot.paramMap.get('id'));
  readonly requestedUotId = Number(this.route.snapshot.queryParamMap.get('uotId')) || null;
  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly retiring = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly referencesError = signal<string | null>(null);
  readonly detail = signal<EmpleadoDetalle | null>(null);
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
      .execute(this.employeeId, this.targetUotId() ?? undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  loadReferences(): void {
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    loadAllAdminPages((page, size) => this.organizationsUseCase.areas(page, size, this.targetUotId() ?? undefined))
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (areas) => this.areas.set(areas.filter((area) => area.estado)),
        error: (error) => {
          this.areas.set([]);
          this.referencesError.set(mapOpenApiError(error).message);
        },
      });
  }

  uotName(): string {
    if (this.uot.isSpecific()) {
      return this.uot.selected()?.nombre ?? 'UOT no seleccionada';
    }

    return this.detail()?.uotNombre
      ?? this.uot.memberships().find((unit) => unit.uotId === this.requestedUotId)?.nombre
      ?? 'UOT no seleccionada';
  }

  targetUotId(): number | null {
    if (this.uot.isSpecific()) {
      return this.uot.selectedId();
    }

    return this.detail()?.uotId ?? this.requestedUotId;
  }

  async edit(): Promise<void> {
    const employee = this.detail();

    if (!employee || !employee.estado || this.referencesLoading()) {
      return;
    }

    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las opciones', this.referencesError()!);
      return;
    }

    const result = await this.formModal.open(
      { areas: this.areas(), preferredUotId: employee.uotId },
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
      .execute(employee.empleadoId, employee.uotId, confirmation.reason)
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
