import { ChangeDetectionStrategy, Component, Input, OnChanges, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faEye, faFileArrowUp, faFolderOpen, faRotate, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionDirective } from '../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { ListarDocumentosEvidenciasUseCase } from '../../../../../application/use-case/listar-documentos-evidencias.use-case';
import { RetirarDocumentoEvidenciaUseCase } from '../../../../../application/use-case/retirar-documento-evidencia.use-case';
import { DocumentoEvidencia } from '../../../../../domain/documento-evidencia.model';
import { EvidenciaContexto } from '../../../../../domain/evidencia-contexto.model';
import { EvidenceCameraComponent } from '../evidence-camera/evidence-camera';
import { EvidencePreviewComponent } from '../evidence-preview/evidence-preview';
import { EvidenceUploaderComponent } from '../evidence-uploader/evidence-uploader';

@Component({ selector: 'app-evidence-panel', standalone: true, imports: [DatePipe, FaIconComponent, PermissionDirective, LoadingStateComponent, EmptyStateComponent, ActionConfirmDialogComponent, EvidenceCameraComponent, EvidencePreviewComponent, EvidenceUploaderComponent], templateUrl: './evidence-panel.html', styleUrl: './evidence-panel.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class EvidencePanelComponent implements OnChanges {
  @Input({ required: true }) context!: EvidenciaContexto;
  @Input() title = 'Documentos y evidencias';
  @ViewChild(EvidenceUploaderComponent) private uploader!: EvidenceUploaderComponent;
  @ViewChild(EvidenceCameraComponent) private camera!: EvidenceCameraComponent;
  @ViewChild(EvidencePreviewComponent) private preview!: EvidencePreviewComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  private readonly listUseCase = inject(ListarDocumentosEvidenciasUseCase); private readonly retireUseCase = inject(RetirarDocumentoEvidenciaUseCase); private readonly toast = inject(ToastService);
  readonly loading = signal(true); readonly retiringId = signal<number | null>(null); readonly items = signal<readonly DocumentoEvidencia[]>([]); readonly errorMessage = signal<string | null>(null);
  readonly folderIcon = faFolderOpen; readonly uploadIcon = faFileArrowUp; readonly cameraIcon = faCamera; readonly viewIcon = faEye; readonly refreshIcon = faRotate; readonly retireIcon = faTrashCan;
  ngOnChanges(): void { if (this.context?.id > 0) this.load(); }
  load(): void { if (!this.context?.id) return; this.loading.set(true); this.errorMessage.set(null); this.listUseCase.execute({ contextoTipo: this.context.tipo, contextoId: this.context.id, page: 1, size: 100 }).pipe(finalize(() => this.loading.set(false))).subscribe({ next: (result) => this.items.set(result.items), error: (error) => this.errorMessage.set(mapOpenApiError(error).message) }); }
  async upload(): Promise<void> { const result = await this.uploader.open(this.context); if (result.saved) this.load(); }
  async capture(): Promise<void> { const result = await this.camera.open(this.context); if (result.saved) this.load(); }
  openPreview(item: DocumentoEvidencia): void { this.preview.open(item); }
  async retire(item: DocumentoEvidencia): Promise<void> { const result = await this.confirm.show({ title: 'Retirar evidencia', message: `La evidencia “${item.nombreOriginal}” dejará de estar disponible en el sistema.`, tone: 'danger', confirmLabel: 'Retirar', requiresReason: true, reasonLabel: 'Motivo', minimumReasonLength: 5 }); if (!result.confirmed || !result.reason) return; this.retiringId.set(item.archivoId); this.retireUseCase.execute(item.archivoId, result.reason).pipe(finalize(() => this.retiringId.set(null))).subscribe({ next: () => { this.toast.success('Evidencia retirada'); this.load(); }, error: (error) => this.toast.error('No se pudo retirar la evidencia', mapOpenApiError(error).message) }); }
}
