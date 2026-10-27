import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faArrowRightFromBracket, faBuilding, faLeaf, faPen, faRotate, faSeedling, faUser } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarOrganizacionesUseCase } from '../../../../../../../administracion/organizaciones/application/use-case/listar-organizaciones.use-case';
import { EvidencePanelComponent } from '../../../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { ObtenerProductorUseCase } from '../../../../../application/use-case/obtener-productor.use-case';
import { RetirarProductorUseCase } from '../../../../../application/use-case/retirar-productor.use-case';
import { ProductorDetalle } from '../../../../../domain/productor-detalle.model';
import { ProductorFormComponent } from '../productor-form/productor-form';

@Component({
  selector: 'app-productor-detail-page',
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
    ProductorFormComponent,
    EvidencePanelComponent,
  ],
  templateUrl: './productor-detail.html',
  styleUrl: './productor-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductorDetailPage implements OnInit {
  @ViewChild(ProductorFormComponent) private form!: ProductorFormComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getUseCase = inject(ObtenerProductorUseCase);
  private readonly retireUseCase = inject(RetirarProductorUseCase);
  private readonly organizationsUseCase = inject(ListarOrganizacionesUseCase);
  private readonly toast = inject(ToastService);

  readonly producerId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly retiring = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<ProductorDetalle | null>(null);
  readonly associations = signal<readonly AdminSelectOption[]>([]);

  readonly pageIcon = faUser;
  readonly backIcon = faArrowLeft;
  readonly editIcon = faPen;
  readonly retireIcon = faArrowRightFromBracket;
  readonly refreshIcon = faRotate;
  readonly affiliationIcon = faBuilding;
  readonly propertyIcon = faSeedling;
  readonly campaignIcon = faLeaf;

  ngOnInit(): void {
    this.loadAssociations();
    this.load();
  }

  load(): void {
    if (!Number.isFinite(this.producerId) || this.producerId <= 0) {
      this.errorMessage.set('El productor solicitado no es válido.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.getUseCase.execute(this.producerId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  loadAssociations(): void {
    this.referencesLoading.set(true);
    this.organizationsUseCase.execute(1, 100)
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (result) => this.associations.set(
          result.items
            .filter((item) => item.esAsociacion && item.estado)
            .map((item) => ({ value: item.empresaId, label: item.razonSocial, description: item.ruc })),
        ),
        error: () => this.associations.set([]),
      });
  }

  async edit(): Promise<void> {
    const producer = this.detail();
    if (!producer || !producer.estado || this.referencesLoading()) return;
    const result = await this.form.open(this.associations(), producer);
    if (result.saved) this.load();
  }

  async retire(): Promise<void> {
    const producer = this.detail();
    if (!producer || !producer.estado || this.retiring()) return;
    const confirmation = await this.confirm.show({
      title: 'Retirar productor',
      message: `Se registrará el retiro de ${this.fullName(producer)} con la fecha de hoy.`,
      tone: 'danger',
      confirmLabel: 'Retirar productor',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      minimumReasonLength: 5,
    });
    if (!confirmation.confirmed || !confirmation.reason) return;

    this.retiring.set(true);
    this.retireUseCase.execute(producer.socioId, this.today(), confirmation.reason)
      .pipe(finalize(() => this.retiring.set(false)))
      .subscribe({
        next: () => { this.toast.success('Productor retirado'); this.load(); },
        error: (error) => this.toast.error('No se pudo retirar al productor', mapOpenApiError(error).message),
      });
  }

  fullName(producer: ProductorDetalle): string {
    return [producer.nombres, producer.apellidoPaterno, producer.apellidoMaterno].filter(Boolean).join(' ');
  }

  private today(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
