import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faEye, faFileArrowUp, faFolderOpen, faRotate, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionDirective } from '../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../shared/models/page-result.model';
import { ListarDocumentosEvidenciasUseCase } from '../../../../../application/use-case/listar-documentos-evidencias.use-case';
import { RetirarDocumentoEvidenciaUseCase } from '../../../../../application/use-case/retirar-documento-evidencia.use-case';
import { DocumentoEvidencia } from '../../../../../domain/documento-evidencia.model';
import { EVIDENCIA_CONTEXTOS, EvidenciaContextoTipo } from '../../../../../domain/evidencia-contexto.model';
import { EvidencePreviewComponent } from '../../components/evidence-preview/evidence-preview';
import { EvidenceUploaderComponent } from '../../components/evidence-uploader/evidence-uploader';

@Component({ selector:'app-documentos-evidencias-list-page', standalone:true, imports:[DatePipe,RouterLink,FaIconComponent,PermissionDirective,LoadingStateComponent,ErrorStateComponent,EmptyStateComponent,PaginatorComponent,ActionConfirmDialogComponent,PageHeaderComponent,EvidencePreviewComponent,EvidenceUploaderComponent], templateUrl:'./documentos-evidencias-list.html', styleUrl:'./documentos-evidencias-list.css', changeDetection:ChangeDetectionStrategy.OnPush })
export class DocumentosEvidenciasListPage implements OnInit {
  @ViewChild(EvidenceUploaderComponent) private uploader!: EvidenceUploaderComponent; @ViewChild(EvidencePreviewComponent) private preview!: EvidencePreviewComponent; @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  private readonly listUseCase=inject(ListarDocumentosEvidenciasUseCase); private readonly retireUseCase=inject(RetirarDocumentoEvidenciaUseCase); private readonly toast=inject(ToastService);
  readonly loading=signal(true); readonly retiringId=signal<number|null>(null); readonly errorMessage=signal<string|null>(null); readonly result=signal<PageResult<DocumentoEvidencia>>(emptyPageResult(20));
  readonly typeFilter=signal(''); readonly originFilter=signal(''); readonly contextType=signal<EvidenciaContextoTipo|null>(null); readonly contextId=signal<number|null>(null); readonly from=signal(''); readonly to=signal(''); readonly contexts=EVIDENCIA_CONTEXTOS;
  readonly pageIcon=faFolderOpen; readonly uploadIcon=faFileArrowUp; readonly cameraIcon=faCamera; readonly viewIcon=faEye; readonly refreshIcon=faRotate; readonly retireIcon=faTrashCan;
  ngOnInit():void{this.load(1);} load(page=this.result().page,size=this.result().size):void{this.loading.set(true);this.errorMessage.set(null);this.listUseCase.execute({tipoEvidencia:this.typeFilter()||undefined,origenCaptura:(this.originFilter()||undefined) as 'CARGA'|'CAMARA'|undefined,contextoTipo:this.contextType()||undefined,contextoId:this.contextId()||undefined,fechaDesde:this.from()?new Date(this.from()).toISOString():undefined,fechaHasta:this.to()?new Date(this.to()+'T23:59:59').toISOString():undefined,page,size}).pipe(finalize(()=>this.loading.set(false))).subscribe({next:r=>this.result.set(r),error:e=>this.errorMessage.set(mapOpenApiError(e).message)});}
  setContext(value:string):void{this.contextType.set(value?(value as EvidenciaContextoTipo):null);if(!value)this.contextId.set(null);this.load(1);} setContextId(value:string):void{const id=Number(value);this.contextId.set(Number.isFinite(id)&&id>0?id:null);this.load(1);} async upload():Promise<void>{const r=await this.uploader.open();if(r.saved)this.load(1);} openPreview(item:DocumentoEvidencia):void{this.preview.open(item);} async retire(item:DocumentoEvidencia):Promise<void>{const r=await this.confirm.show({title:'Retirar documento',message:`El documento “${item.nombreOriginal}” dejará de estar disponible.`,tone:'danger',confirmLabel:'Retirar',requiresReason:true,reasonLabel:'Motivo',minimumReasonLength:5});if(!r.confirmed||!r.reason)return;this.retiringId.set(item.archivoId);this.retireUseCase.execute(item.archivoId,r.reason).pipe(finalize(()=>this.retiringId.set(null))).subscribe({next:()=>{this.toast.success('Documento retirado');this.load();},error:e=>this.toast.error('No se pudo retirar el documento',mapOpenApiError(e).message)});}
}
