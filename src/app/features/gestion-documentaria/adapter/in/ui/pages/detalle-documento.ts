import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, effect, untracked, inject, signal, ElementRef, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from '../../../../../../core/access/permission.service';
import { ModuleAccessService } from '../../../../../../core/access/module-access.service';
import { SalidasTecnicasApi, VinculoSalidaTecnica } from '../../../../../gestion-tecnica/salidas/e2/adapter/out/http/salidas-tecnicas.api';
import { switchMap, finalize, forkJoin, catchError, of, Subscription } from 'rxjs';
import { UotContextStore } from '../../../../../uot/state/uot-context.store';
import { AccessStore } from '../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';
import { AppAlertService } from '../../../../../../shared/feedback/app-alert/app-alert.service';
import { ScreenLoadingService } from '../../../../../../shared/data-display/screen-loading/screen-loading.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileLines, faReply, faReplyAll, faShare, faUserPlus, faBell, faPen, faCheck, faBan, faEye, faDownload, faPaperclip, faClockRotateLeft, faChevronDown, faChevronUp, faCommentDots, faCircleCheck, faClipboardCheck, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { DocumentoInterno, GestionDocumentariaApi, SeguimientoDocumento } from '../../../../gestion-documentaria.api';
import { RedactarDocumentoModal } from './redactar-documento';
import { SolicitudSalidaTecnicaModal } from '../../../../../gestion-tecnica/salidas/e2/adapter/in/ui/pages/solicitud-tecnica/solicitud-tecnica';
import { ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogBackdropDirective } from '../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { openAnimatedDialog, closeAnimatedDialog } from '../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { GestionDocumentariaUnreadStore } from '../../../../gestion-documentaria-unread.store';
import { GestionDocumentariaRealtime } from '../../../../gestion-documentaria-realtime.service';
import { StatusBadgeComponent } from '../../../../../../shared/data-display/status-badge/status-badge';
import { AppButtonComponent } from '../../../../../../shared/actions/app-button/app-button';
import { DecisionModalComponent, DecisionSubmission } from '../../../../../../shared/feedback/decision-modal/decision-modal';
import { opcionesSalida, esDecisionSalida, estadoSalidaTexto, estadoSalidaTono } from '../../../../../gestion-tecnica/salidas/e2/adapter/in/ui/components/salida-decision.config';
import { ProtectedFileViewerComponent } from '../../../../../../shared/files/protected-file-viewer/protected-file-viewer';
import { ThreadAttachmentsComponent } from '../../../../../../shared/files/thread-attachments/thread-attachments';
import { RichTextViewComponent } from '../../../../../../shared/formatting/rich-text-view';
import { archivosDeHilo } from '../../../../thread-attachments.mapper';

@Component({
 selector:'app-detalle-documento',standalone:true,
 imports:[DatePipe,FaIconComponent,FormsModule,DialogBackdropDirective,PageHeaderComponent,RedactarDocumentoModal,
    StatusBadgeComponent,AppButtonComponent,ThreadAttachmentsComponent,ProtectedFileViewerComponent,RichTextViewComponent,SolicitudSalidaTecnicaModal,DecisionModalComponent],
 template:`<div class="desco-page doc-conversation-page">
   <app-page-header title="Conversación" subtitle="Mensajes y documentos." [icon]="icon">
     <div pageActions><app-button [icon]="backIcon" label="Volver al listado" size="small" tone="ghost" (pressed)="volver()" /></div>
   </app-page-header>
   <app-redactar-documento (sent)="alEnviar($event)" (solicitarSalida)="salidaModal.open()" />
   <app-solicitud-salida-tecnica-modal #salidaModal />
   @if (error()) { <p class="admin-inline-error" role="alert">{{error()}}</p> }
   @if (doc(); as item) {
     <section class="admin-surface doc-thread-shell">
       <div class="doc-thread-heading">
         <div class="doc-thread-title">
           <span class="doc-thread-eyebrow">{{item.tipo}} <span aria-hidden="true">·</span> {{(documentoVigente()?.fechaEnvio || item.fechaEnvio) | date:'dd/MM/yyyy HH:mm'}}</span>
           <h2>{{documentoVigente()?.asunto || item.asunto}}</h2>
           <div class="doc-thread-meta">
             <span>De <strong>{{item.emisor}}</strong></span>
             <app-status-badge [label]="estadoTramite(item.estadoTramite)" [tone]="item.estadoTramite==='FINALIZADO'?'success':item.estadoTramite==='ANULADO'?'danger':item.estadoTramite==='OBSERVADO'?'warning':'info'" [dot]="true" />
             @if(item.fueraPlazo){<app-status-badge label="Atrasado" tone="warning" />}
           </div>
           @if(item.motivoAnulacion){<p class="doc-thread-note">Motivo: {{item.motivoAnulacion}}</p>}
         </div>
         @if(expedienteSalida() || (item.estadoTramite!=='FINALIZADO' && item.estadoTramite!=='ANULADO')) {
           <div class="doc-thread-actions" role="group" aria-label="Acciones de la conversación">
             @if(expedienteSalida()) {
               <app-button [icon]="attendIcon" [label]="puedeResolverSalida()?'Gestionar salida':'Ver salida técnica'"
                 [tone]="puedeResolverSalida()?'primary':'secondary'" size="small" [disabled]="loading() || resolviendoSalida()" (pressed)="abrirGestionSalida()" />
             }
             @if(item.estadoTramite!=='FINALIZADO' && item.estadoTramite!=='ANULADO') {
               @if(puedeAtender(item)) {
                 <app-button [icon]="attendIcon" label="Marcar en atención" size="small" [loading]="activeAction()==='atender'" loadingLabel="Marcando atención…" [disabled]="reviewing()" (pressed)="atender()" />
               }
               @if(item.emisorUsuarioId!==access.user()?.usuarioId && !respondioMensaje(item.documentoId)) {
                 <app-button [icon]="replyIcon" label="Responder" size="small" (pressed)="redactar.open(item.documentoId)" />
                 <app-button [icon]="replyAllIcon" label="Responder a todos" size="small" (pressed)="redactar.open(item.documentoId,false,'RESPUESTA',null,null,true)" />
               }
               <app-button [icon]="shareIcon" label="Reenviar copia" size="small" (pressed)="redactar.open(documentoVigente()?.documentoId??item.documentoId,false,'REENVIO')" />
               <app-button [icon]="assignIcon" label="Derivar atención" size="small" (pressed)="redactar.open(documentoVigente()?.documentoId??item.documentoId,false,'DERIVACION')" />
               @if(item.emisorUsuarioId===access.user()?.usuarioId && item.requiereRespuesta) {
                 <app-button [icon]="remindIcon" label="Enviar recordatorio" size="small" [loading]="activeAction()==='recordar'" loadingLabel="Enviando aviso…" [disabled]="reviewing()" (pressed)="recordar(documentoVigente()?.documentoId??item.documentoId)" />
               }
               @if(item.emisorUsuarioId===access.user()?.usuarioId) {
                 <app-button [icon]="editIcon" label="Rectificar" size="small" (pressed)="redactar.open(documentoVigente()?.documentoId??item.documentoId,true)" />
               }
               @if(item.puedeConformar && !expedienteSalida()) {
                 <app-button [icon]="approveIcon" label="Dar conformidad" size="small" [loading]="activeAction()==='conforme'" loadingLabel="Confirmando…" [disabled]="reviewing()" (pressed)="conformar()" />
                 <app-button [icon]="observeIcon" label="Observar respuesta" size="small" (pressed)="redactar.open(item.documentoId,false,'OBSERVACION')" />
               }
               @if(item.responsableUsuarioId===access.user()?.usuarioId && !expedienteSalida()) {
                 <app-button [icon]="completeIcon" label="Finalizar" tone="primary" size="small" [disabled]="reviewing()" (pressed)="finalizar()" />
                 <app-button [icon]="cancelIcon" label="Anular trámite" size="small" (pressed)="openReview('ANULAR')" />
               }
             }
           </div>
         }
       </div>
       @if (seguimiento();as trace) {
         <div class="doc-thread-section-title">
           <div class="doc-thread-section-summary">
             <h3>Mensajes <span class="doc-thread-counter">{{trace.documentos.length}}</span></h3>
             <span class="doc-thread-participants">@for(p of trace.participantes;track p.usuarioId){<span>{{p.usuario}}</span>}</span>
           </div>
           <app-button [icon]="attachIcon" [label]="panelDocumentos()?'Ocultar archivos':'Archivos ('+docsDelHilo().length+')'" size="small"
             (pressed)="panelDocumentos.set(!panelDocumentos())" />
         </div>
         @if(panelDocumentos()) {
           <section class="doc-thread-files" aria-label="Documentos del hilo">
             <div class="doc-thread-file-filters">
               <input class="admin-input" type="search" placeholder="Buscar archivo" aria-label="Buscar archivo"
                 [ngModel]="filtroArchivo()" (ngModelChange)="filtroArchivo.set($event)" />
               <input class="admin-input" type="search" placeholder="Remitente" aria-label="Filtrar remitente"
                 [ngModel]="filtroRemitente()" (ngModelChange)="filtroRemitente.set($event)" />
               <select class="admin-select" [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)" aria-label="Formato">
                 <option value="">Todos los formatos</option><option value="application/pdf">PDF</option>
                 <option value="image/">Imágenes</option><option value="OTROS">Otros</option>
               </select>
               <input class="admin-input" type="date" [ngModel]="filtroFecha()"
                 (ngModelChange)="filtroFecha.set($event)" aria-label="Filtrar fecha" />
             </div>
             <app-thread-attachments [files]="docsDelHilo()" [showMessage]="true" [busyFileKey]="busyFile()"
               (locate)="enfocarMensaje($event.documentoId)"
               (preview)="view($event.archivoId,$event.mimeType,$event.documentoId,$event.nombre)"
               (download)="download($event.archivoId,$event.nombre,$event.documentoId)" />
           </section>
         }
         <div class="doc-message-list">
           @for(msg of trace.documentos;track msg.documentoId) {
             @if(!estaRectificado(msg.documentoId) || anterioresVisibles().includes(msg.documentoId)) {
               <article class="doc-message" [class.doc-message--old]="estaRectificado(msg.documentoId)"
                 [class.doc-message--expanded]="expandido()===msg.documentoId || msg.documentoId===ultimoVisible() || anterioresVisibles().includes(msg.documentoId)"
                 [attr.id]="'doc-mensaje-'+msg.documentoId">
                 <div class="doc-message-head">
                   <span class="doc-message-avatar" aria-hidden="true">{{iniciales(msg.emisor)}}</span>
                   <button class="doc-message-toggle" type="button" [attr.aria-expanded]="expandido()===msg.documentoId || msg.documentoId===ultimoVisible() || anterioresVisibles().includes(msg.documentoId)"
                     (click)="enfocarMensaje(expandido()===msg.documentoId?0:msg.documentoId)">
                     <span class="doc-message-author">{{msg.emisor}}</span>
                     <span class="doc-message-subject">{{etiquetaMovimiento(msg.tipoMovimiento)}}</span>
                     @if(estaRectificado(msg.documentoId)){<span class="doc-version-label">Rectificada</span>}
                     @else if(msg.reemplazaDocumentoId){<span class="doc-version-label doc-version-label--current">Versión vigente</span>}
                   </button>
                   <span class="doc-message-time">{{msg.fechaEnvio | date:'dd/MM/yyyy HH:mm'}}</span>
                   <fa-icon class="doc-message-chevron" [icon]="expandido()===msg.documentoId || msg.documentoId===ultimoVisible() || anterioresVisibles().includes(msg.documentoId)?chevronUpIcon:chevronDownIcon" aria-hidden="true" />
                 </div>
                 @if(expandido()===msg.documentoId || msg.documentoId===ultimoVisible() || anterioresVisibles().includes(msg.documentoId)) {
                   <div class="doc-message-content">
                     <div class="doc-message-recipient">Para: @for(dest of msg.destinatarios;track dest.usuarioId){<span class="doc-recipient-chip">{{dest.usuario}}</span>}</div>
                     @if(msg.cuerpo){<app-rich-text-view class="doc-message-body" [value]="msg.cuerpo" />}
                     @if(msg.fechaLimite){<div class="doc-message-deadline"><fa-icon [icon]="remindIcon" aria-hidden="true" /> Fecha límite: {{msg.fechaLimite | date:'dd/MM/yyyy'}} @if(msg.fueraPlazo){<app-status-badge label="Atrasado" tone="warning" />}</div>}
                     @if(msg.reemplazaDocumentoId){
                       <button class="doc-version-toggle" type="button" [attr.aria-expanded]="anterioresVisibles().includes(msg.reemplazaDocumentoId)"
                         (click)="alternarVersion(msg.reemplazaDocumentoId)"><fa-icon [icon]="historyIcon" aria-hidden="true" />
                         {{anterioresVisibles().includes(msg.reemplazaDocumentoId)?'Ocultar versión anterior':'Ver versión anterior'}}</button>
                     }
                     @if(msg.adjuntos?.length){
                       <div class="doc-message-attachments" aria-label="Archivos adjuntos">
                       @for(attachment of msg.adjuntos??[];track attachment.archivoId){
                         <div class="doc-message-file"><fa-icon [icon]="attachIcon" aria-hidden="true" />
                           <span class="doc-message-file-name" [title]="attachment.nombre">{{attachment.nombre}}</span>
                           <span class="doc-message-file-size">{{(attachment.tamanoBytes/1024).toFixed(0)}} KB</span>
                           <app-button [icon]="previewIcon" [iconOnly]="true" label="Vista previa" tone="ghost" size="small"
                             [loading]="busyFile()===('ver-'+attachment.archivoId)"
                             (pressed)="view(attachment.archivoId,attachment.mimeType,msg.documentoId,attachment.nombre)" />
                           <app-button [icon]="downloadIcon" [iconOnly]="true" label="Descargar" tone="ghost" size="small"
                             [loading]="busyFile()===('descargar-'+attachment.archivoId)"
                             (pressed)="download(attachment.archivoId,attachment.nombre,msg.documentoId)" />
                         </div>
                       }
                       </div>
                     }
                     <details class="doc-message-receipts">
                       <summary>Estado de entrega · {{msg.destinatarios.length}} destinatario(s)</summary>
                       <div class="doc-message-receipt-items">
                         @for(dest of msg.destinatarios;track dest.usuarioId){
                           <div class="doc-message-receipt"><span>{{dest.usuario}}</span>
                             <span>{{dest.fechaAtencion?'En atención':dest.fechaAbierto?'Leído':dest.fechaEntrega?'Entregado':'En preparación'}}</span></div>
                         }
                       </div>
                     </details>
                     @if(!estaRectificado(msg.documentoId) && item.estadoTramite!=='FINALIZADO' && item.estadoTramite!=='ANULADO' && ((msg.emisorUsuarioId!==access.user()?.usuarioId && msg.documentoId!==item.documentoId && !respondioMensaje(msg.documentoId)) || msg.documentoId!==(documentoVigente()?.documentoId??item.documentoId) || (!expedienteSalida() && msg.puedeConformar && !(msg.documentoId===item.documentoId && item.puedeConformar)))) {
                       <div class="doc-message-tools" role="group" aria-label="Acciones del mensaje">
                         @if(msg.emisorUsuarioId!==access.user()?.usuarioId && msg.documentoId!==item.documentoId && !respondioMensaje(msg.documentoId)){
                           <app-button [icon]="replyIcon" [iconOnly]="true" label="Responder mensaje" tone="ghost" size="small" (pressed)="redactar.open(msg.documentoId)" />
                         }
                         @if(msg.documentoId!==(documentoVigente()?.documentoId??item.documentoId)) {
                           <app-button [icon]="shareIcon" [iconOnly]="true" label="Reenviar mensaje" tone="ghost" size="small" (pressed)="redactar.open(msg.documentoId,false,'REENVIO')" />
                         }
                         @if(!expedienteSalida() && msg.puedeConformar && !(msg.documentoId===item.documentoId && item.puedeConformar)){
                           <app-button [icon]="approveIcon" [iconOnly]="true" label="Dar conformidad" tone="ghost" size="small" [loading]="activeAction()==='conforme'" [disabled]="reviewing()" (pressed)="conformar(msg.documentoId)" />
                           <app-button [icon]="observeIcon" [iconOnly]="true" label="Observar respuesta" tone="ghost" size="small" (pressed)="redactar.open(msg.documentoId,false,'OBSERVACION')" />
                         }
                       </div>
                     }
                   </div>
                 }
               </article>
             }
           }
         </div>
         <div class="doc-activity">
           <button type="button" class="doc-activity-toggle" [attr.aria-expanded]="mostrarActividad()"
             (click)="mostrarActividad.set(!mostrarActividad())">
             <span><fa-icon [icon]="historyIcon" aria-hidden="true" /> Actividad registrada · {{trace.eventos.length}}</span>
             <fa-icon [icon]="mostrarActividad()?chevronUpIcon:chevronDownIcon" aria-hidden="true" />
           </button>
           @if(mostrarActividad()){
             <ol class="doc-activity-items">
               @for(ev of trace.eventos;track ev.eventoId){
                 <li><strong>{{etiquetaEvento(ev.tipo)}}</strong><span>{{ev.usuario}} · {{ev.fecha | date:'dd/MM/yyyy HH:mm'}}</span>
                   @if(ev.detalle){<p>{{ev.detalle}}</p>}</li>
               }
             </ol>
           }
         </div>
       }
       @if(previewFile();as file) {
         <app-protected-file-viewer [blob]="file.blob" [name]="file.name" [mime]="file.mime"
            (close)="closePreview()" />
       }
     </section>
   }
   <app-decision-modal #gestionSalidaModal eyebrow="Gestión técnica" [title]="'Salida técnica #'+(expedienteSalida()?.salidaId??'')"
     [statusLabel]="estadoSalidaTexto(expedienteSalida()?.estado??'')" [statusTone]="estadoSalidaTono(expedienteSalida()?.estado??'')"
     [options]="opcionesDecision()" [busy]="resolviendoSalida()" [error]="errorGestionSalida()"
     [note]="notaObservacion()" [detailRoute]="rutaFichaSalida()" [detailParams]="{origen:'documento',documentoId:id}"
     detailLabel="Consultar ficha de salida" (changed)="errorGestionSalida.set(null)"
     (submitted)="resolverSalida($event)" (closed)="alCerrarGestionSalida()" />
   <dialog #reviewModal appDialogBackdrop class="modal desco-modal" (cancel)="$event.preventDefault();closeReview()" aria-labelledby="doc-review-title">
     <div class="modal-box admin-modal-box w-full max-w-lg p-6">
       <header class="admin-modal-header mb-4"><div class="admin-modal-title-group"><div><p>Documentos</p><h2 id="doc-review-title">Anular trámite</h2></div></div>
         <button type="button" class="admin-icon-button" aria-label="Cerrar" (click)="closeReview()" [disabled]="reviewing()">×</button></header>
       <label class="admin-field">Motivo de anulación
         <textarea class="admin-input" rows="4" maxlength="400" [(ngModel)]="observacion" placeholder="Indique la observación" [disabled]="reviewing()"></textarea></label>
       <footer class="modal-action mt-4"><button type="button" class="admin-secondary-button" [disabled]="reviewing()" (click)="closeReview()">Cancelar</button>
         <app-button label="Confirmar" tone="primary" [loading]="reviewing()" loadingLabel="Guardando…" (pressed)="revisar()" /></footer>
     </div>
   </dialog>
 </div>`,
 styleUrl:'./detalle-documento.css',
 changeDetection:ChangeDetectionStrategy.OnPush,
})
export class DetalleDocumentoPage implements OnDestroy {
  @ViewChild(RedactarDocumentoModal) redactar!: RedactarDocumentoModal;
  @ViewChild('gestionSalidaModal',{static:true}) gestionSalidaModal!:DecisionModalComponent;
  @ViewChild('reviewModal',{static:true}) reviewModal!:ElementRef<HTMLDialogElement>;
  readonly replyIcon=faReply;
  readonly replyAllIcon=faReplyAll;
  readonly shareIcon=faShare;
  readonly assignIcon=faUserPlus;
  readonly remindIcon=faBell;
  readonly editIcon=faPen;
  readonly approveIcon=faCheck;
  readonly observeIcon=faCommentDots;
  readonly completeIcon=faCircleCheck;
  readonly cancelIcon=faBan;
  readonly previewIcon=faEye;
  readonly downloadIcon=faDownload;
  readonly attachIcon=faPaperclip;
  readonly attendIcon=faClipboardCheck;
  readonly historyIcon=faClockRotateLeft;
  readonly chevronDownIcon=faChevronDown;
  readonly chevronUpIcon=faChevronUp;
  readonly anterioresVisibles=signal<number[]>([]);
  readonly documentoVigente=computed(()=>{
    const documentos=this.seguimiento()?.documentos??[];
    let actual=documentos.find(m=>m.documentoId===this.id);
    while(actual){
      const reemplazo=documentos.find(m=>m.reemplazaDocumentoId===actual?.documentoId);
      if(!reemplazo)return actual;
      actual=reemplazo;
    }
    return null;
  });
  readonly mostrarActividad=signal(false);
  iniciales(nombre:string):string {return (nombre.trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0)).join('') || 'U').toUpperCase();}
  etiquetaMovimiento(tipo?:string):string {
    return ({ENVIO:'Mensaje',RESPUESTA:'Respuesta',REENVIO:'Reenvío',DERIVACION:'Derivación',OBSERVACION:'Observación',RECTIFICACION:'Rectificación'} as Record<string,string>)[tipo??''] ?? 'Mensaje';
  }
  etiquetaEvento(tipo:string):string {return ({ENVIO:'Envío',RESPUESTA:'Respuesta',REENVIO:'Reenvío',DERIVACION:'Derivación',OBSERVACION:'Observación',RECTIFICACION:'Rectificación',RECORDATORIO:'Recordatorio',PRIMERA_VISTA:'Primera lectura',CONFORMIDAD:'Conformidad'} as Record<string,string>)[tipo] ?? tipo;}
  estaRectificado(id:number):boolean {return (this.seguimiento()?.documentos ?? []).some(m=>m.reemplazaDocumentoId===id);}
  alternarVersion(id:number):void {this.anterioresVisibles.update(actual=>actual.includes(id)?actual.filter(x=>x!==id):[...actual,id]);}
  readonly reviewing=signal(false);
  readonly activeAction=signal<'atender'|'conforme'|'recordar'|'revisar'|null>(null);
  readonly busyFile=signal<string|null>(null);
  reviewAction:'FINALIZAR'|'ANULAR'='ANULAR';
  observacion='';
  estadoTramite(value:string):string {return value==='ANULADO'?'Anulado':value==='FINALIZADO'?'Finalizado':value==='OBSERVADO'?'Observado':'En trámite';}
  openReview(value:'ANULAR'):void {this.reviewAction=value;this.observacion='';openAnimatedDialog(this.reviewModal.nativeElement);}
  async finalizar():Promise<void> {
    if(this.reviewing())return;
    const result=await this.alert.open({
      tone:'danger',
      icon:faCircleCheck,
      title:'Finalizar conversación',
      message:'La conversación quedará finalizada y podrás seguir consultando su historial.',
      confirmLabel:'Finalizar',
      cancelLabel:'Cancelar',
    });
    if(!result.confirmed || this.reviewing())return;
    this.reviewAction='FINALIZAR';
    this.observacion='';
    this.revisar();
  }
  closeReview():void {if(!this.reviewing())closeAnimatedDialog(this.reviewModal.nativeElement, () => {});}
  revisar():void {
    const uotId=this.principalUotId();
    if(!uotId||this.reviewing())return;
    if(this.reviewAction==='ANULAR'&&!this.observacion.trim()){this.error.set('Indique la observación.');return;}
    this.reviewing.set(true);this.activeAction.set('revisar');this.error.set(null);
    (this.reviewAction==='ANULAR'?this.api.anular(uotId,this.id,this.observacion.trim()):this.api.revisar(uotId,this.id,this.reviewAction,this.observacion.trim())).pipe(finalize(()=>{this.reviewing.set(false);this.activeAction.set(null);}))
      .subscribe({next:()=>{if(this.reviewAction==='ANULAR')closeAnimatedDialog(this.reviewModal.nativeElement, () => {});this.load();},error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  private readonly salidasTecnicas=inject(SalidasTecnicasApi);
  private readonly permission=inject(PermissionService);
  private readonly modules=inject(ModuleAccessService);
  readonly expedienteSalida=signal<VinculoSalidaTecnica|null>(null);
  readonly resolviendoSalida=signal(false);
  readonly errorGestionSalida=signal<string|null>(null);
  private refrescarSalidaAlCerrar=false;
  readonly limiteObservacion=computed(()=>{
    if(this.expedienteSalida()?.estado!=='OBSERVADA')return null;
    return (this.seguimiento()?.documentos??[]).filter(item=>item.tipoMovimiento==='OBSERVACION' && item.fechaLimite)
      .sort((a,b)=>b.documentoId-a.documentoId)[0]?.fechaLimite??null;
  });
  puedeResolverSalida():boolean {
    const salida=this.expedienteSalida(),doc=this.doc();
    if (!salida || !doc || !['SOLICITADA','OBSERVADA'].includes(salida.estado)
      || !this.permission.has('SALIDAS_CONFIRMAR')) return false;
    if (this.access.roles().some(rol => rol.codigo === 'ADMINISTRADOR')) return true;
    const origen=this.seguimiento()?.documentos.find(item=>item.documentoId===salida.documentoId)
      ?? (doc.documentoId===salida.documentoId ? doc : null);
    return !!origen && origen.emisorUsuarioId!==this.access.user()?.usuarioId;
  }
  abrirGestionSalida():void {
    if(!this.expedienteSalida()||!this.doc()||this.loading()||this.resolviendoSalida())return;
    this.errorGestionSalida.set(null);
    this.gestionSalidaModal.open();
  }
  alCerrarGestionSalida():void {
    this.errorGestionSalida.set(null);
    if(this.refrescarSalidaAlCerrar){
      this.refrescarSalidaAlCerrar=false;
      this.load();
    }
  }
  readonly estadoSalidaTexto=estadoSalidaTexto;
  readonly estadoSalidaTono=estadoSalidaTono;
  opcionesDecision(){return opcionesSalida(this.expedienteSalida()?.estado,this.puedeResolverSalida());}
  rutaFichaSalida(): (string|number)[] | null {
    const salida=this.expedienteSalida();
    return salida && this.permission.has('SALIDAS_VER') && this.modules.has('SALIDAS') ? ['/gestion-tecnica/salidas/operativas',salida.salidaId] : null;
  }
  notaObservacion():string {
    if(this.expedienteSalida()?.estado!=='OBSERVADA')return '';
    const limite=this.limiteObservacion();
    return limite ? 'Responder hasta: '+new Date(limite).toLocaleString('es-PE') : 'El solicitante tiene 24 horas para responder.';
  }
  resolverSalida(event:DecisionSubmission):void {
    const uot=this.principalUotId(),expediente=this.expedienteSalida(),decision=event.decision;
    const opcion=this.opcionesDecision().find(item=>item.value===decision);
    const motivo=event.reason.trim();
    if(!uot||!expediente||!esDecisionSalida(decision)||!opcion||this.resolviendoSalida()||this.refrescarSalidaAlCerrar
      ||(opcion.requiresReason&&!motivo)||motivo.length>1200)return;
    this.resolviendoSalida.set(true);
    this.errorGestionSalida.set(null);
    this.salidasTecnicas.decidir(uot,expediente.salidaId,decision,motivo)
      .pipe(finalize(()=>this.resolviendoSalida.set(false))).subscribe({
        next:()=>{
          this.refrescarSalidaAlCerrar=true;
          this.toast.success('Decisión registrada');
          this.gestionSalidaModal.close(true);
        },
        error:e=>this.errorGestionSalida.set(mapOpenApiError(e).message)
      });
  }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly screenLoading = inject(ScreenLoadingService);
  private readonly toast = inject(ToastService);
  private readonly alert = inject(AppAlertService);
  readonly respuestaEnviada = signal(false);
  respondioMensaje(documentoId:number):boolean {
    if (this.respuestaEnviada()) return true;
    const usuarioId=this.access.user()?.usuarioId;
    return usuarioId!=null && !!this.seguimiento()?.documentos.some(
      msg=>msg.emisorUsuarioId===usuarioId && msg.tipoMovimiento==='RESPUESTA'
        && msg.documentoPadreId===documentoId);
  }
  alEnviar(_documentoId:number):void {
    const respuesta=this.redactar.respondeA!=null && !this.redactar.rectificando
      && this.redactar.tipoMovimiento==='RESPUESTA';
    if (!respuesta) {this.actualizar();return;}
    this.respuestaEnviada.set(true);
    this.screenLoading.show('Respuesta enviada','Volviendo a Bandeja de entrada.');
    void this.router.navigate(['/documentos/recibidos'])
      .then(navegado=>{if(!navegado)this.actualizar();})
      .catch(()=>{this.toast.error('No se pudo abrir la bandeja.');this.actualizar();})
      .finally(()=>this.screenLoading.hide());
  }
  private loadSubscription:Subscription|null=null;
  readonly backIcon = faArrowLeft;
  volver():void {
    const desde=this.route.snapshot.queryParamMap.get('desde')?.toLowerCase()??'';
    const permitidos=['recibidos','enviados','pendientes','todos','finalizados','mis-documentos'];
    void this.router.navigate(['/documentos',permitidos.includes(desde)?desde:'enviados']);
  }
  private readonly api = inject(GestionDocumentariaApi);
  readonly principalUotId=signal<number|null>(null);
  private readonly principalSubscription=this.api.contexto().subscribe({
    next:r=>{
      const uotOrigen=Number(this.route.snapshot.queryParamMap.get('uotId'));
      const uotId=uotOrigen>0 && Number.isSafeInteger(uotOrigen)
        ? uotOrigen : (this.uot.selectedId()??r.uotId);
      if (!uotId || !Number.isSafeInteger(uotId) || uotId<=0) {
        this.loading.set(false);
        this.error.set('No se pudo determinar la unidad del documento.');
        this.screenLoading.hide();
        return;
      }
      this.principalUotId.set(uotId);
    },
    error:()=>{
      this.loading.set(false);
      this.error.set('No se pudo consultar su unidad principal.');
      this.screenLoading.hide();
    }
  });
  readonly panelDocumentos=signal(false);
  readonly filtroArchivo=signal('');readonly filtroRemitente=signal('');
  readonly filtroTipo=signal('');readonly filtroFecha=signal('');
  readonly expandido=signal<number|null>(null);
  readonly ultimoVisible=computed(()=>this.seguimiento()?.documentos.filter(m=>!this.seguimiento()?.documentos.some(x=>x.reemplazaDocumentoId===m.documentoId)).at(-1)?.documentoId??0);
  readonly docsDelHilo=computed(()=>{
    const query=this.filtroArchivo().trim().toLocaleLowerCase();
    const person=this.filtroRemitente().trim().toLocaleLowerCase();
    const format=this.filtroTipo();const date=this.filtroFecha();
    const hilo=this.seguimiento();
    return (hilo?archivosDeHilo(hilo):[])
      .filter(a=>(!query||a.nombre.toLocaleLowerCase().includes(query))
        &&(!person||a.emisor.toLocaleLowerCase().includes(person))
        &&(!format||(format==='OTROS'
          ? !a.mimeType.toLowerCase().startsWith('image/') && a.mimeType.toLowerCase()!=='application/pdf'
          : a.mimeType.toLowerCase().startsWith(format)))
        &&(!date||a.fechaEnvio.slice(0,10)===date));
  });
  enfocarMensaje(id:number):void {
    if (id && this.estaRectificado(id) && !this.anterioresVisibles().includes(id)) this.anterioresVisibles.update(ids=>[...ids,id]);
    this.expandido.set(id===0?null:id);
    if(id)document.getElementById('doc-mensaje-'+id)?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  recordar(id:number):void {
    if(this.reviewing())return;
    this.reviewing.set(true);this.activeAction.set('recordar');this.error.set(null);
    this.api.recordar(id,this.principalUotId()??undefined).pipe(finalize(()=>{this.reviewing.set(false);this.activeAction.set(null);}))
      .subscribe({next:()=>this.actualizar(),error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  readonly uot = inject(UotContextStore);
  readonly access = inject(AccessStore);
  private readonly unread = inject(GestionDocumentariaUnreadStore);
  private readonly realtime=inject(GestionDocumentariaRealtime);
  private readonly stop=this.realtime.watch(()=>{if(!this.loading())this.actualizar();});
  puedeAtender(item:DocumentoInterno):boolean {
    return !!item.requiereRespuesta && item.destinatarios.some(r=>r.usuarioId===this.access.user()?.usuarioId && !r.fechaAtencion);
  }
  atender():void {this.action('atender');}
  conformar(id=this.id):void {this.action('conforme',id);}
  private action(kind:'atender'|'conforme',messageId=this.id):void {
    const id=this.principalUotId();
    if(!id||this.reviewing())return;
    this.reviewing.set(true);this.activeAction.set(kind);this.error.set(null);
    this.api[kind](id,messageId).pipe(finalize(()=>{this.reviewing.set(false);this.activeAction.set(null);}))
      .subscribe({next:()=>this.actualizar(),error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  private actualizar():void {
    const uotId=this.principalUotId();
    if(!uotId||!this.id)return;
    this.api.detalle(uotId,this.id).subscribe({
      next:doc=>{if(this.principalUotId()===uotId)this.doc.set(doc);},
      error:()=>{},
    });
    this.api.seguimiento(uotId,this.id).subscribe({
      next:data=>{if(this.principalUotId()===uotId)this.seguimiento.set(data);},
      error:()=>{},
    });
    this.unread.refrescar(uotId);
  }
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly icon = faFileLines;
  readonly loading = signal(true);
  readonly error = signal<string|null>(null);
  readonly doc = signal<DocumentoInterno|null>(null);
  readonly seguimiento = signal<SeguimientoDocumento|null>(null);
  readonly previewFile=signal<{blob:Blob;mime:string;name:string}|null>(null);
  private readonly uotEffect=effect(()=>{const id=this.principalUotId();if(!id)return;untracked(()=>{this.doc.set(null);this.closePreview();this.load();});});
  private loadTicket=0;
  load():void {
    const ticket=++this.loadTicket;
    const uotId=this.principalUotId();
    if (!uotId || !this.id) {
      this.loading.set(false);
      this.error.set('No se pudo abrir esta conversación.');
      this.screenLoading.hide();
      return;
    }
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.seguimiento.set(null);
    this.expedienteSalida.set(null);
    this.salidasTecnicas.expedienteDocumento(uotId,this.id).subscribe({
      next:v=>{if(ticket===this.loadTicket)this.expedienteSalida.set(v);},
      error:()=>this.expedienteSalida.set(null)
    });
    if(!this.screenLoading.state().visible)this.screenLoading.show('Abriendo conversación','Consultando los mensajes y su seguimiento.');
    this.loadSubscription=this.api.abrirHilo(this.id,uotId).pipe(
      switchMap(()=>forkJoin({
        documento:this.api.detalle(uotId,this.id),
        historial:this.api.seguimiento(uotId,this.id).pipe(catchError(()=>of(null))),
      })),
      finalize(()=>{if(ticket===this.loadTicket)this.loading.set(false);this.screenLoading.hide();}),
    ).subscribe({
      next:result=>{
        if(ticket!==this.loadTicket || this.principalUotId()!==uotId)return;
        this.doc.set(result.documento);
        this.seguimiento.set(result.historial);
        this.unread.refrescar(uotId);
      },
      error:e=>{
        if(ticket===this.loadTicket && this.principalUotId()===uotId)this.error.set(mapOpenApiError(e).message);
      },
    });
  }
  view(fileId:number, mime:string,documentoId=this.id,name='Archivo'):void {
    const uotId=this.principalUotId();if(!uotId)return;
    if (!['application/pdf','image/jpeg','image/png','image/webp','text/plain'].includes(mime.toLowerCase())) {
      this.error.set('Este formato no admite vista previa en el navegador. Descárguelo para consultarlo.');return;
    }
    this.error.set(null);this.busyFile.set('ver-'+fileId);
    this.api.contenido(uotId,documentoId,fileId).pipe(finalize(()=>this.busyFile.set(null))).subscribe({next:blob=>{
      this.previewFile.set({blob,mime,name});
    },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  download(fileId:number,name:string,documentoId=this.id):void {
    const uotId=this.principalUotId();if(!uotId)return;
    this.error.set(null);this.busyFile.set('descargar-'+fileId);
    this.api.contenido(uotId,documentoId,fileId).pipe(finalize(()=>this.busyFile.set(null))).subscribe({next:blob=>{
      const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
      anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
    },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  closePreview():void {this.previewFile.set(null);}
  ngOnDestroy():void {this.loadTicket++;this.loadSubscription?.unsubscribe();this.stop();this.principalSubscription.unsubscribe();this.closePreview();}
}
