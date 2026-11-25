
import { ChangeDetectionStrategy, Component, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { SalidasTecnicasApi } from '../../../../../gestion-tecnica/salidas/e2/adapter/out/http/salidas-tecnicas.api';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap, finalize, map, concatMap, toArray, tap, from } from 'rxjs';
import { GestionDocumentariaDraftsStore } from '../../../../gestion-documentaria-drafts.store';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';
import { ScreenLoadingService } from '../../../../../../shared/data-display/screen-loading/screen-loading.service';
import { UotContextStore } from '../../../../../uot/state/uot-context.store';
import { AccessStore } from '../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ModalShellComponent } from '../../../../../../shared/feedback/modal-shell/modal-shell';
import { RecipientOption, RecipientPickerComponent } from '../../../../../../shared/forms/recipient-picker/recipient-picker';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPaperclip, faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { E3FileDropzoneComponent } from '../../../../../../shared/files/file-dropzone/file-dropzone';
import { RichTextEditorComponent } from '../../../../../../shared/forms/rich-text-editor/rich-text-editor';
import { GestionDocumentariaApi, ReceptorInterno, TipoDocumentoInterno, EnvioDocumento, DocumentoInterno, UotDestinataria, BorradorDocumento } from '../../../../gestion-documentaria.api';

@Component({
  selector: 'app-redactar-documento', standalone: true,
  imports: [FormsModule, ModalShellComponent, RecipientPickerComponent, FaIconComponent, E3FileDropzoneComponent, RichTextEditorComponent],
  styleUrls: ['./redactar-documento.css'],
  template: `
    <app-modal-shell #composeModal variant="compose" size="wide" [title]="titulo()" [busy]="sending()"
      (closeRequested)="solicitarCierre()" (closed)="despuesDeCerrar()">
      @if (error()) { <p class="admin-inline-error doc-compose__error" role="alert">{{ error() }}</p> }
      @if (loading()) {
        <div class="doc-compose__loading" role="status" aria-busy="true">
          <span class="doc-compose__loading-icon"><fa-icon [icon]="spinnerIcon" animation="spin" /></span>
          <strong>{{ respondeA ? 'Preparando respuesta…' : 'Preparando mensaje…' }}</strong>
          <small>Estamos preparando el formulario.</small>
        </div>
      }
      @else {
        <form id="doc-compose-form" class="doc-compose__form" (ngSubmit)="send()">
          <div class="doc-compose__sender">
            <span class="doc-compose__field-label">De</span>
            <strong [title]="nombreRemitente()">{{ nombreRemitente() }}</strong>
          </div>
          <div class="doc-compose__origin">
            <span class="doc-compose__field-label">UOT</span>
            @if (unidadesPropias().length > 1) {
              <select id="doc-compose-origin" name="origenUot" class="doc-compose__origin-select"
                aria-label="Unidad de origen" [ngModel]="origenUotId()" (ngModelChange)="cambiarOrigen($event)"
                [disabled]="sending() || loadingUsuarios()">
                @for (unidad of unidadesPropias(); track unidad.uotId) {
                  <option [ngValue]="unidad.uotId">{{ unidad.nombre }}</option>
                }
              </select>
            } @else {
              <strong class="doc-compose__single-uot" [title]="origenNombre()">{{ origenNombre() }}</strong>
            }
          </div>
          @if (unidades().length > 1) {
            <div class="doc-compose__unit">
              <label for="doc-compose-unit">Unidad de destino</label>
              <select id="doc-compose-unit" class="admin-select" name="destinoUot"
                [ngModel]="destinoUotId()" (ngModelChange)="cambiarDestino($event)" [disabled]="sending()">
                @for (unidad of unidades(); track unidad.uotId) {
                  <option [ngValue]="unidad.uotId">{{ unidad.nombre }}</option>
                }
              </select>
            </div>
          }
          <app-recipient-picker label="Para" placeholder="Buscar personas" [options]="opcionesDestinatarios()" [maxSuggestions]="300"
            [collapseInputAfterAdd]="true" [selected]="seleccionados()" [maxItems]="destinoUotId() === origenUotId() ? 50 : 1"
            [disabled]="sending()" [busy]="loadingUsuarios()"
            (add)="toggle($event,true)" (remove)="toggle($event,false)" />
          @if (destinoUotId() !== origenUotId() && destinoUotId() !== null) {
            <small class="doc-compose__cross-unit">Selecciona un destinatario para esta unidad.</small>
          }
          <div class="doc-compose__subject">
            <label for="doc-compose-subject">Asunto</label>
            <input id="doc-compose-subject" type="text" name="asunto" [(ngModel)]="asunto" (ngModelChange)="marcarCambio()" maxlength="240"
              placeholder="Escribe el asunto" [disabled]="sending()" required />
          </div>
          <div class="doc-compose__message">
            <app-rich-text-editor [value]="cuerpo" (valueChange)="cuerpo = $event; marcarCambio()" [maxLength]="3000"
              [disabled]="sending()" placeholder="Escribe tu mensaje…" ariaLabel="Mensaje" />
          </div>
          @if (tipoMovimiento === 'REENVIO' && respondeA && !rectificando) {
            <p class="doc-compose__movement-note">Reenvío informativo: comparte una copia sin asignar una atención pendiente.</p>
          } @else if (tipoMovimiento === 'DERIVACION' && respondeA && !rectificando) {
            <p class="doc-compose__movement-note">Derivación: asigna la atención y comparte el historial y los archivos anteriores del hilo.</p>
          }
          <section class="doc-compose__extras" aria-label="Seguimiento del mensaje">
            <label class="doc-compose__require">
              <input class="admin-switch-control doc-compose__toggle" type="checkbox" name="requiereRespuesta"
                [(ngModel)]="requiereRespuesta" (ngModelChange)="marcarCambio()" [disabled]="sending() || tipoMovimiento === 'OBSERVACION' || tipoMovimiento === 'REENVIO'" />
              <span>Solicitar respuesta</span>
            </label>
            @if (requiereRespuesta) {
              <label class="doc-compose__deadline">Responder antes de (opcional)
                <input class="admin-input" type="date" name="fechaLimite"
                  [(ngModel)]="fechaLimite" (ngModelChange)="marcarCambio()" [disabled]="sending()" />
              </label>
            }
          </section>
          @if (mostrarAdjuntos()) {
            <section class="doc-compose__attachments" aria-label="Archivos adjuntos">
              @if (reenvioAdjuntos().length) {
                <div class="doc-compose__file-group">
                  <strong>Archivos del mensaje original</strong>
                  @for (adjunto of reenvioAdjuntos(); track adjunto.archivoId) {
                    <label class="doc-compose__file-row">
                      <input type="checkbox" [checked]="compartidos().includes(adjunto.archivoId)"
                        [disabled]="sending()" (change)="toggleArchivo(adjunto.archivoId,$any($event.target).checked)" />
                      <span [title]="adjunto.nombre">{{ adjunto.nombre }}</span>
                    </label>
                  }
                </div>
              }
              @if (adjuntosGuardados().length) {
                <div class="doc-compose__file-group">
                  <strong>Archivos guardados</strong>
                  @for (archivo of adjuntosGuardados(); track archivo.archivoId) {
                    <div class="doc-compose__file-row">
                      <span [title]="archivo.nombre">{{ archivo.nombre }} · {{ (archivo.tamanoBytes / 1024).toFixed(0) }} KB</span>
                      <button type="button" [disabled]="sending()" (click)="retirarAdjuntoGuardado(archivo.archivoId)"
                        [attr.aria-label]="'Quitar ' + archivo.nombre">Quitar</button>
                    </div>
                  }
                </div>
              }
              <app-e3-file-dropzone #dropzone title="Archivos adjuntos" [files]="files()" [maxFiles]="10"
                [maxSizeMb]="6" [disabled]="sending()" [uploading]="sending()"
                (filesChange)="files.set($event); marcarCambio()" (invalid)="error.set($event)" />
            </section>
          }
          @if (sending() && cargados() > 0) {
            <small class="doc-compose__status" role="status">Archivos preparados: {{ cargados() }}</small>
          }
        </form>
      }
      <div modalActions class="doc-compose__footer">
        @if (disponibleSolicitud() && !respondeA && !activeDraft) {
          <button type="button" class="admin-secondary-button" [disabled]="sending() || loading()"
            (click)="abrirSolicitudTecnica()">Solicitud de salida técnica</button>
        }
        <button type="submit" form="doc-compose-form" class="admin-primary-button doc-compose__send"
          [disabled]="sending() || loading() || loadingUsuarios()">
          <fa-icon [icon]="sending() ? spinnerIcon : sendIcon" [animation]="sending() ? 'spin' : undefined" /> {{ sending() ? 'Enviando…' : 'Enviar' }}
        </button>
        <button type="button" class="doc-compose__tool" title="Adjuntar archivos" [disabled]="sending() || loading()"
          (click)="adjuntarArchivos()">
          <fa-icon [icon]="attachIcon" /> <span>Adjuntar archivos</span>
          @if (archivosTotal() > 0) { <span class="doc-compose__counter">{{ archivosTotal() }}</span> }
        </button>
      </div>
    </app-modal-shell>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedactarDocumentoModal {
  @ViewChild('composeModal',{static:true}) private modal!:ModalShellComponent;
  @ViewChild('dropzone') private dropzone?:E3FileDropzoneComponent;
  readonly attachIcon = faPaperclip;
  readonly sendIcon = faPaperPlane;
  readonly spinnerIcon = faSpinner;
  readonly mostrarAdjuntos = signal(false);
  @Output() readonly sent=new EventEmitter<number>();
  @Output() readonly draftSaved=new EventEmitter<void>();
  @Output() readonly solicitarSalida=new EventEmitter<void>();
  private pendienteSalida=false;
  private draftToOpen:BorradorDocumento|null=null;
  protected activeDraft:number|null=null;
  private claveEnvio:string|null=null;
  private formModified=false;
  readonly compartidos=signal<number[]>([]);
  readonly adjuntosGuardados=signal<{archivoId:number;nombre:string;mimeType:string;tamanoBytes:number}[]>([]);
  retirarAdjuntoGuardado(id:number):void {
    this.adjuntosGuardados.update(items=>items.filter(item=>item.archivoId!==id));
    this.marcarCambio();
  }
  readonly reenvioAdjuntos=signal<{archivoId:number;nombre:string}[]>([]);
  responderATodos=false;
  readonly cargados=signal(0);
  readonly origenNombre=signal('');
  private readonly access=inject(AccessStore);
  readonly nombreRemitente=computed(()=>{
    const usuario=this.access.user();
    const nombre=usuario?.nombreCompleto?.trim()
      || [usuario?.nombres,usuario?.apellidoPaterno,usuario?.apellidoMaterno]
        .filter((parte):parte is string=>!!parte?.trim()).join(' ').trim();
    return nombre || usuario?.nombreUsuario || 'Usuario DESCO';
  });
  fechaLimite='';
  private readonly api=inject(GestionDocumentariaApi);
  private readonly salidasTecnicas=inject(SalidasTecnicasApi);
  readonly disponibleSolicitud=signal(false);
  private solicitarHabilitacion(uotId:number):void {
    this.disponibleSolicitud.set(false);
    if(this.respondeA!==null || this.rectificando || this.activeDraft!==null)return;
    this.salidasTecnicas.contexto(uotId).subscribe({
      next:contexto=>{if(this.origenUotId()===uotId)this.disponibleSolicitud.set(contexto.habilitado);},
      error:()=>this.disponibleSolicitud.set(false)
    });
  }
  abrirSolicitudTecnica():void {
    if(!this.disponibleSolicitud() || this.sending())return;
    const uotId=this.origenUotId();if(!uotId)return;
    this.pendienteSalida=true;
    this.solicitarCierre();
  }
  private readonly drafts=inject(GestionDocumentariaDraftsStore);
  private readonly toast=inject(ToastService);
  private readonly screenLoading=inject(ScreenLoadingService);
  readonly uot=inject(UotContextStore);
  respondeA:number|null=null;
  rectificando=false;
  tipoMovimiento:'RESPUESTA'|'DERIVACION'|'REENVIO'|'OBSERVACION'='RESPUESTA';
  requiereRespuesta=false;
  readonly tipos=signal<TipoDocumentoInterno[]>([]);
  readonly personas=signal<ReceptorInterno[]>([]);
  readonly unidades=signal<UotDestinataria[]>([]);
  readonly unidadesPropias=computed(()=>this.uot.memberships().map(u=>({uotId:u.uotId,nombre:u.nombre})));
  readonly destinoUotId=signal<number|null>(null);
  readonly origenUotId=signal<number|null>(null);
  readonly seleccionados=signal<number[]>([]);
  readonly personasSeleccionadas=signal<ReceptorInterno[]>([]);
  readonly disponibles=computed(()=>this.personas().filter(p=>p.habilitado&&p.usuarioId!=null).length);
  readonly opcionesDestinatarios=computed<RecipientOption[]>(()=>this.personas().map(p=>({
    id:p.usuarioId??-p.empleadoId,label:p.nombre,detail:p.usuario??'Sin acceso',disabled:!p.habilitado||p.usuarioId==null,
  })));
  readonly archivosTotal=computed(()=>this.files().length+this.compartidos().length+this.adjuntosGuardados().length);
  titulo():string {
    return this.rectificando ? 'Rectificar mensaje' : this.tipoMovimiento==='OBSERVACION' ? 'Enviar observación'
      : this.tipoMovimiento==='DERIVACION' ? 'Derivar mensaje' : this.tipoMovimiento==='REENVIO' ? 'Reenviar mensaje'
      : this.respondeA ? 'Responder' : 'Nuevo mensaje';
  }
  readonly files=signal<File[]>([]);
  readonly loading=signal(false);
  readonly loadingUsuarios=signal(false);
  readonly sending=signal(false);
  readonly error=signal<string|null>(null);
  tipoId:number|null=null;
  asunto='';cuerpo='';

  openDraft(draft:BorradorDocumento,id:number):void {
    const move=draft.tipoMovimiento;
    const movimiento=move==='OBSERVACION'||move==='DERIVACION'||move==='REENVIO'?move:'RESPUESTA';
    this.open(draft.respondeA??undefined,!!draft.rectificando,movimiento,draft,id);
  }
  open(respondeA?:number, rectificar=false, movimiento:'RESPUESTA'|'DERIVACION'|'REENVIO'|'OBSERVACION'='RESPUESTA',
       draft:BorradorDocumento|null=null,draftId:number|null=null,responderATodos=false):void {
    if(this.sending())return;
    this.respondeA=respondeA??null;this.rectificando=rectificar;this.tipoMovimiento=movimiento;
    this.draftToOpen=draft;this.activeDraft=draftId;this.fechaLimite=draft?.fechaLimite?.slice(0,10)??'';
    this.formModified=false;
    this.claveEnvio=this.api.nuevaClaveIdempotencia();
    this.responderATodos=responderATodos;
    this.compartidos.set(draft?.archivosCompartidos??[]);
    this.adjuntosGuardados.set(draft?.adjuntosGuardados??[]);
    this.reenvioAdjuntos.set([]);this.cargados.set(0);
    const archivosPendientes = draftId != null ? (this.drafts.get(draftId)?.archivos ?? []) : [];
    this.mostrarAdjuntos.set(archivosPendientes.length > 0 ||
      !!draft?.adjuntosGuardados?.length || !!draft?.archivosCompartidos?.length);
    this.requiereRespuesta=movimiento==='OBSERVACION'||movimiento==='DERIVACION';
    this.disponibleSolicitud.set(false);
    this.origenUotId.set(null);this.destinoUotId.set(null);
    this.tipoId=null;this.asunto='';this.cuerpo='';
    this.seleccionados.set([]);this.personasSeleccionadas.set([]);this.personas.set([]);this.unidades.set([]);this.files.set([]);this.error.set(null);
    this.files.set(archivosPendientes);
    this.modal.open();this.loading.set(true);
    this.api.contexto().pipe(switchMap(({uotId:principal})=>{
      const selected=this.uot.selectedId();
      const predeterminada=this.uot.memberships().find(unidad=>unidad.predeterminada)?.uotId;
      const principalValida=predeterminada && this.unidadesPropias().some(unidad=>unidad.uotId===predeterminada)
        ?predeterminada:principal;
      // Los mensajes nuevos parten de la UOT principal. Las respuestas respetan el contexto abierto.
      const uotGuardada=draft?.origenUotId;
      const uotId=uotGuardada && this.unidadesPropias().some(unidad=>unidad.uotId===uotGuardada)
        ?uotGuardada:respondeA && selected && this.unidadesPropias().some(unidad=>unidad.uotId===selected)
          ?selected:principalValida;
      return forkJoin({
      tipos:this.api.tipos(uotId),unidades:this.api.unidades(uotId,respondeA),
      parent:respondeA?this.api.detalle(uotId,respondeA):of(null as DocumentoInterno|null),
    }).pipe(map(result=>({...result,uotId})));}),finalize(()=>this.loading.set(false)))
      .subscribe({next:r=>{
        const uotId=r.uotId;this.origenUotId.set(uotId);
        this.solicitarHabilitacion(uotId);
        this.tipos.set(r.tipos);
        this.tipoId=r.tipos[0]?.id??null;
        this.origenNombre.set(this.unidadesPropias().find(x=>x.uotId===uotId)?.nombre??this.uot.label());
        this.unidades.set(r.unidades.length?r.unidades:[{uotId,nombre:this.uot.label()}]);
        const preferred=r.parent?(rectificar?(r.parent.destinatarios[0]?.uotId??uotId):(movimiento==='RESPUESTA'||movimiento==='OBSERVACION')?r.parent.uotEmisorId:uotId):uotId;
        const desired=this.draftToOpen?.destinoUotId??preferred;
        const chosen=this.unidades().some(x=>x.uotId===desired)?desired:uotId;
        this.destinoUotId.set(chosen);
        if(r.parent){
          if(rectificar){this.requiereRespuesta=!!r.parent.requiereRespuesta;}
          if(r.parent.estadoTramite==='FINALIZADO'||r.parent.estadoTramite==='ANULADO')this.error.set('El trámite está cerrado.');
          this.tipoId=r.parent.tipoDocumentoId;
          this.asunto=rectificar?r.parent.asunto:movimiento==='OBSERVACION'?`OBS: ${r.parent.asunto}`:movimiento==='REENVIO'?`RV: ${r.parent.asunto}`:movimiento==='DERIVACION'?`DER: ${r.parent.asunto}`:(r.parent.asunto.startsWith('RE: ')?r.parent.asunto:`RE: ${r.parent.asunto}`);
          if(rectificar)this.cuerpo=r.parent.cuerpo??'';
          if(movimiento==='REENVIO'||movimiento==='DERIVACION'){
            this.reenvioAdjuntos.set(r.parent.adjuntos.map(a=>({archivoId:a.archivoId,nombre:a.nombre})));
            if(r.parent.adjuntos.length)this.mostrarAdjuntos.set(true);
          }
          if(movimiento==='OBSERVACION')this.cuerpo='';
          else if(movimiento==='REENVIO'||movimiento==='DERIVACION')this.cuerpo=`\n\n---------- Mensaje original ----------\nDe: ${r.parent.emisor}\nAsunto: ${r.parent.asunto}\n${r.parent.cuerpo??''}`.trim();
        }
        if(this.draftToOpen){
          this.tipoId=this.draftToOpen.tipoId??this.tipoId;
          this.asunto=this.draftToOpen.asunto;
          this.cuerpo=this.draftToOpen.cuerpo;
          this.requiereRespuesta=movimiento==='REENVIO'?false:this.draftToOpen.requiereRespuesta;
        }
        this.loadEmpleados(uotId,chosen,r.parent??null);
      },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  cambiarOrigen(id:number|null):void {
    if(!id || !this.unidadesPropias().some(u=>u.uotId===id) || this.sending())return;
    this.marcarCambio();
    this.origenUotId.set(id);
    this.solicitarHabilitacion(id);
    this.origenNombre.set(this.unidadesPropias().find(u=>u.uotId===id)?.nombre??'');
    this.personas.set([]);this.seleccionados.set([]);this.personasSeleccionadas.set([]);
    this.destinoUotId.set(id);
    this.loadingUsuarios.set(true);
    this.api.unidades(id,this.respondeA??undefined).pipe(finalize(()=>this.loadingUsuarios.set(false)))
      .subscribe({next:units=>{
        if(this.origenUotId()!==id)return;
        this.unidades.set(units.length?units:[{uotId:id,nombre:this.origenNombre()}]);
        this.loadEmpleados(id,id);
      },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  cambiarDestino(id:number|null):void {
    const origen=this.origenUotId();if(!origen||!id)return;
    this.marcarCambio();
    this.destinoUotId.set(id);this.personas.set([]);this.seleccionados.set([]);this.personasSeleccionadas.set([]);
    this.loadEmpleados(origen,id);
  }
  private loadEmpleados(origen:number,destino:number,parent?:DocumentoInterno|null):void {
    this.loadingUsuarios.set(true);
    this.api.destinatarios(origen,destino,this.respondeA??undefined)
      .pipe(finalize(()=>this.loadingUsuarios.set(false))).subscribe({next:usuarios=>{
        if(this.destinoUotId()!==destino)return;
        this.personas.set(usuarios);
        this.personasSeleccionadas.update(previous=>[
          ...previous.filter(x=>!usuarios.some(p=>p.usuarioId===x.usuarioId)),...usuarios]);
        if(this.draftToOpen) {
          const ids=this.draftToOpen.seleccionados.filter(id=>usuarios.some(p=>p.usuarioId===id&&p.habilitado));
          this.seleccionados.set(ids);
        } else if(parent && (this.rectificando || this.tipoMovimiento==='RESPUESTA' || this.tipoMovimiento==='OBSERVACION')){
          const ids=this.rectificando
            ?parent.destinatarios.filter(r=>r.uotId===destino).map(r=>r.usuarioId)
            :this.responderATodos && destino===origen
              ?[parent.emisorUsuarioId,...parent.destinatarios.filter(r=>r.uotId===destino).map(r=>r.usuarioId)]
              :[parent.emisorUsuarioId];
          const valid=ids.filter(id=>usuarios.some(p=>p.usuarioId===id&&p.habilitado));
          this.seleccionados.update(previous=>destino===origen
            ?[...new Set([...previous,...valid])]:valid.slice(0,1));
        }
      },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  toggle(id:number,checked:boolean):void {
    this.marcarCambio();
    if(checked&&this.destinoUotId()!==this.origenUotId()) {
      this.seleccionados.set([id]);return;
    }
    this.seleccionados.update(v=>checked?[...v.filter(x=>x!==id),id]:v.filter(x=>x!==id));
  }
  marcarCambio():void {
    if (!this.loading() && !this.sending()) this.formModified=true;
  }
  adjuntarArchivos():void {
    this.mostrarAdjuntos.set(true);
    // El dropzone compartido permite añadir varios archivos en una sola selección.
    setTimeout(()=>this.dropzone?.open(),0);
  }
  solicitarCierre():void {
    if(this.sending())return;
    // Solo una edición del usuario genera un borrador nuevo; abrir y cerrar no guarda nada.
    if (!this.formModified) { this.close(); return; }
    const hayContenido = !!this.asunto.trim() || !!this.cuerpo.trim() ||
      this.seleccionados().length > 0 || this.archivosTotal() > 0 || !!this.fechaLimite;
    if (!hayContenido) {
      if (this.activeDraft !== null) {
        this.drafts.discard(this.activeDraft);
        this.draftSaved.emit();
      }
      this.close();
      return;
    }
    const contenido:BorradorDocumento={tipoId:this.tipoId,asunto:this.asunto,cuerpo:this.cuerpo,
      origenUotId:this.origenUotId(),destinoUotId:this.destinoUotId(),rectificando:this.rectificando,
      seleccionados:[...this.seleccionados()],requiereRespuesta:this.requiereRespuesta,
      fechaLimite:this.fechaLimite||undefined,respondeA:this.respondeA,tipoMovimiento:this.tipoMovimiento,
      adjuntosGuardados:this.adjuntosGuardados(),archivosCompartidos:this.compartidos()};
    this.activeDraft=this.drafts.save(contenido,this.files(),this.activeDraft);
    this.draftSaved.emit();
    this.close();
  }
  close():void {if(!this.sending())this.modal.close(true);}
  despuesDeCerrar():void {
    this.files.set([]);
    if(this.pendienteSalida){this.pendienteSalida=false;this.solicitarSalida.emit();}
  }

  toggleArchivo(id:number,checked:boolean):void {
    this.marcarCambio();
    this.compartidos.update(ids=>checked?[...ids.filter(v=>v!==id),id]:ids.filter(v=>v!==id));
  }
  send():void {
    const uotId=this.origenUotId(),destino=this.destinoUotId();
    if(!uotId||!destino||this.sending()||this.loading()||this.loadingUsuarios()||this.error()==='El trámite está cerrado.')return;
    if(!this.tipoId||!this.asunto.trim()||!this.seleccionados().length||this.seleccionados().length>50||
       this.files().length+this.compartidos().length+this.adjuntosGuardados().length>10||
       (!this.cuerpo.trim()&&!this.files().length&&!this.compartidos().length&&!this.adjuntosGuardados().length)){
      this.error.set('Indica el asunto, destinatarios y un mensaje o archivo.');return;
    }
    if(destino!==uotId && this.seleccionados().length!==1){
      this.error.set('Entre unidades solo puede elegir un destinatario.');return;
    }
    if(this.files().some(f=>!f.size||f.size>6*1024*1024)){this.error.set('Archivo no válido (máximo 6 MB).');return;}
    this.sending.set(true);this.error.set(null);
    this.screenLoading.show(this.respondeA && !this.rectificando && this.tipoMovimiento==='RESPUESTA'
      ? 'Enviando respuesta' : 'Enviando mensaje', 'Registrando el envío.');
    (this.files().length?from(this.files()).pipe(
       concatMap(file=>this.api.subirAdjunto(uotId,file).pipe(tap(upload=>{
         if(upload.archivoId!=null){
           this.adjuntosGuardados.update(previous=>[...previous,{
             archivoId:upload.archivoId!,nombre:file.name,mimeType:file.type||'application/octet-stream',tamanoBytes:file.size}]);
           this.files.update(previous=>previous.filter(f=>f!==file));
         }
         this.cargados.update(n=>n+1);
       }))),toArray()
     ):of([])).pipe(
      switchMap(files=>{
        const idsNuevos=files.map(f=>f.archivoId).filter((id):id is number=>id!=null);
        const archivoIds=[...new Set([...this.compartidos(),...this.adjuntosGuardados().map(a=>a.archivoId),...idsNuevos])];
        if(idsNuevos.length!==files.length)throw new Error('No se pudieron adjuntar los archivos.');
        const payload:EnvioDocumento={uotId,destinoUotId:destino,
          tipoDocumentoId:this.tipoId!,asunto:this.asunto.trim(),cuerpo:this.cuerpo.trim(),
          destinatarioIds:this.seleccionados(),archivoIds,requiereRespuesta:this.requiereRespuesta,
          ...(this.fechaLimite&&this.requiereRespuesta?{fechaLimite:`${this.fechaLimite}T23:59:59.000Z`}:{}),
          ...(this.respondeA?{tipoMovimiento:this.rectificando?'RECTIFICACION':this.tipoMovimiento}:{})};
        return this.rectificando&&this.respondeA?this.api.rectificar(this.respondeA,payload,this.claveEnvio??undefined):this.api.enviar(payload,this.respondeA??undefined,this.claveEnvio??undefined);
      }),finalize(()=>{this.sending.set(false);this.screenLoading.hide();})
    ).subscribe({next:result=>{this.sending.set(false);this.close();
        if(this.activeDraft)this.drafts.discard(this.activeDraft);
        this.toast.success(this.rectificando?'Mensaje rectificado.':this.respondeA && this.tipoMovimiento==='RESPUESTA'
          ?'Respuesta enviada.':this.tipoMovimiento==='DERIVACION'?'Atención derivada.':this.tipoMovimiento==='OBSERVACION'
            ?'Observación enviada.':'Mensaje enviado.');
        this.sent.emit(result.documentoId);},
      error:e=>this.error.set(e?.status===503?'No se pudo adjuntar el archivo. Intenta nuevamente.':(mapOpenApiError(e).message||'No se pudo enviar.'))});
  }
}
