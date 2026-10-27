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
import {
  PageResult,
  emptyPageResult,
} from '../../../../../../../../shared/models/page-result.model';
import { AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarOrganizacionesUseCase } from '../../../../../../../administracion/organizaciones/application/use-case/listar-organizaciones.use-case';
import { ListarProductoresUseCase } from '../../../../../application/use-case/listar-productores.use-case';
import { ObtenerProductorUseCase } from '../../../../../application/use-case/obtener-productor.use-case';
import { RetirarProductorUseCase } from '../../../../../application/use-case/retirar-productor.use-case';
import { Productor } from '../../../../../domain/productor.model';
import { ProductorFormComponent } from '../productor-form/productor-form';

@Component({
  selector: 'app-productores-list-page',
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
    ProductorFormComponent,
  ],
  templateUrl: './productores-list.html',
  styleUrl: './productores-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoresListPage implements OnInit {
  @ViewChild(ProductorFormComponent)
  private form!: ProductorFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirm!: ActionConfirmDialogComponent;

  private readonly listUseCase = inject(ListarProductoresUseCase);
  private readonly retireUseCase = inject(RetirarProductorUseCase);
  private readonly getUseCase = inject(ObtenerProductorUseCase);
  private readonly organizationsUseCase = inject(ListarOrganizacionesUseCase);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly retiringId = signal<number | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<PageResult<Productor>>(emptyPageResult(20));
  readonly associations = signal<readonly AdminSelectOption[]>([]);

  readonly search = signal('');
  readonly associationFilter = signal<number | null>(null);
  readonly situationFilter = signal('');

  readonly pageIcon = faUsers;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly retireIcon = faArrowRightFromBracket;
  readonly refreshIcon = faRotate;

  ngOnInit(): void {
    this.loadAssociations();
    this.load(1);
  }

  loadAssociations(): void {
    this.referencesLoading.set(true);

    this.organizationsUseCase
      .execute(1, 100)
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (result) =>
          this.associations.set(
            result.items
              .filter(
                (organization) =>
                  organization.esAsociacion && organization.estado,
              )
              .map((association) => ({
                value: association.empresaId,
                label: association.razonSocial,
                description: association.ruc,
              })),
          ),
        error: () => this.associations.set([]),
      });
  }

  load(
    page = this.result().page,
    size = this.result().size,
  ): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute({
        buscar: this.search().trim() || undefined,
        asociacionId: this.associationFilter() ?? undefined,
        situacion: this.situationFilter() || undefined,
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

  submitSearch(): void {
    this.load(1);
  }

  clearSearch(): void {
    this.search.set('');
    this.load(1);
  }

  changeAssociation(value: string): void {
    const parsed = Number(value);

    this.associationFilter.set(
      Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    );

    this.load(1);
  }

  async create(): Promise<void> {
    const result = await this.form.open(this.associations());

    if (result.saved) {
      this.load(1);
    }
  }

  edit(producer: Productor): void {
    if (!producer.estado || this.editingId()) {
      return;
    }

    this.editingId.set(producer.socioId);

    this.getUseCase
      .execute(producer.socioId)
      .pipe(finalize(() => this.editingId.set(null)))
      .subscribe({
        next: async (detail) => {
          const result = await this.form.open(
            this.associations(),
            detail,
          );

          if (result.saved) {
            this.load();
          }
        },
        error: (error) =>
          this.toast.error(
            'No se pudo abrir el productor',
            mapOpenApiError(error).message,
          ),
      });
  }

  async retire(producer: Productor): Promise<void> {
    if (!producer.estado || this.retiringId()) {
      return;
    }

    const confirmation = await this.confirm.show({
      title: 'Retirar productor',
      message: `Se registrará el retiro de ${this.fullName(
        producer,
      )} con la fecha de hoy.`,
      tone: 'danger',
      confirmLabel: 'Retirar productor',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo del retiro.',
      minimumReasonLength: 5,
    });

    if (!confirmation.confirmed || !confirmation.reason) {
      return;
    }

    this.retiringId.set(producer.socioId);

    this.retireUseCase
      .execute(
        producer.socioId,
        this.today(),
        confirmation.reason,
      )
      .pipe(finalize(() => this.retiringId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Productor retirado');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo retirar al productor',
            mapOpenApiError(error).message,
          ),
      });
  }

  fullName(producer: Productor): string {
    return [
      producer.nombres,
      producer.apellidoPaterno,
      producer.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private today(): string {
    const now = new Date();
    const local = new Date(
      now.getTime() - now.getTimezoneOffset() * 60_000,
    );

    return local.toISOString().slice(0, 10);
  }
}
