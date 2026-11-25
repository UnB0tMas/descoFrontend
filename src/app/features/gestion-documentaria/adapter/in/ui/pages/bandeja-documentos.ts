
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { ChangeDetectionStrategy, Component, OnDestroy, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { faEnvelopeOpenText, faRotate, faFilter, faFilePen, faPen, faTrashCan, faPaperclip, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GestionDocumentariaApi, BandejaDocumentos, ResumenDocumento } from '../../../../gestion-documentaria.api';
import { UotContextStore } from '../../../../../uot/state/uot-context.store';
import { GestionDocumentariaUnreadStore } from '../../../../gestion-documentaria-unread.store';
import { GestionDocumentariaRealtime } from '../../../../gestion-documentaria-realtime.service';
import { BorradorTemporal, GestionDocumentariaDraftsStore } from '../../../../gestion-documentaria-drafts.store';
import { richTextExcerpt } from '../../../../../../shared/formatting/simple-rich-text';
import { RedactarDocumentoModal } from './redactar-documento';
import { SolicitudSalidaTecnicaModal } from '../../../../../gestion-tecnica/salidas/e2/adapter/in/ui/pages/solicitud-tecnica/solicitud-tecnica';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { DataTableComponent } from '../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../shared/data-display/data-table/data-table.types';
import { PaginatorComponent } from '../../../../../../shared/data-display/paginator/paginator';
import { EmptyStateComponent } from '../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../shared/data-display/loading-state/loading-state';
import { StatusBadgeComponent } from '../../../../../../shared/data-display/status-badge/status-badge';
import { AppButtonComponent } from '../../../../../../shared/actions/app-button/app-button';
import { ScreenLoadingService } from '../../../../../../shared/data-display/screen-loading/screen-loading.service';

type Folder = 'RECIBIDOS' | 'ENVIADOS' | 'PENDIENTES' | 'TODOS' | 'FINALIZADOS';

@Component({
  selector: 'app-bandeja-documentos',
  standalone: true,
  imports: [DatePipe, FormsModule, FaIconComponent, PageHeaderComponent, DataTableComponent,
    PaginatorComponent, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent,
    StatusBadgeComponent, AppButtonComponent, RedactarDocumentoModal, SolicitudSalidaTecnicaModal],
  styleUrl: './bandeja-documentos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="desco-page doc-mailbox space-y-3">
    <app-page-header [title]="titulo" [subtitle]="bandeja==='ENVIADOS'?'Mensajes enviados.':'Conversaciones recientes.'" [icon]="icon">
      <div pageActions class="flex flex-wrap gap-2">
        <button type="button" class="admin-primary-button" [disabled]="!uotId()" (click)="redactar.open()">Redactar</button>
        <app-button [icon]="refreshIcon" label="Actualizar" [loading]="loading()" loadingLabel="Actualizando…"
          [disabled]="!uotId()" (pressed)="load(1,page().tamano,true)" />
      </div>
    </app-page-header>
    <app-redactar-documento (sent)="load(1)" (draftSaved)="actualizarBorradores()"
      (solicitarSalida)="salidaModal.open()" />
    <app-solicitud-salida-tecnica-modal #salidaModal (completed)="load(1)" />
    <section class="admin-surface doc-mailbox-surface space-y-3">
      @if (bandeja!=='ENVIADOS') {
        <div class="flex flex-wrap gap-4 text-sm" aria-label="Resumen de la bandeja">
          <span>Sin leer: <strong>{{indicadores().noLeidos}}</strong></span>
          <span>Pendientes: <strong>{{indicadores().pendientes}}</strong></span>
          <span>Vencidos: <strong>{{indicadores().vencidos}}</strong></span>
        </div>
      }
      <div class="flex flex-wrap items-end gap-2">
        @if (bandeja === 'ENVIADOS') {
          <label class="admin-field doc-sent-filter">Mostrar
            <select class="admin-select" [ngModel]="tipoSalida()" (ngModelChange)="cambiarTipoSalida($event)">
              <option value="TODOS">Todos</option>
              <option value="ENVIADOS">Enviados</option>
              <option value="BORRADORES">Borradores</option>
            </select>
          </label>
        }
        <label class="admin-field flex-1 min-w-48">Buscar
          <input class="admin-input" type="search" [ngModel]="buscar()" (ngModelChange)="buscar.set($event)"
             (keyup.enter)="load(1,page().tamano,true)" placeholder="Asunto, persona o archivo" />
        </label>
        @if (bandeja !== 'ENVIADOS' || tipoSalida() !== 'BORRADORES') {
        <label class="admin-field min-w-40">Estado
          <select class="admin-select" [ngModel]="estadoFiltro()" (ngModelChange)="estadoFiltro.set($event);load(1,page().tamano,true)">
            <option value="">Todos</option>
            @if (bandeja!=='ENVIADOS') {<option value="NO_LEIDOS">No leídos</option>}
            <option value="EN_ATENCION">En atención</option>
            <option value="ESPERANDO_RESPUESTA">Por responder</option>
            <option value="OBSERVADOS">Observados</option>
            <option value="CON_DOCUMENTOS">Con archivos</option>
            <option value="FINALIZADOS">Finalizados</option>
          </select>
        </label>
        }
        <button type="button" class="admin-secondary-button" [attr.aria-expanded]="masFiltros()"
          (click)="masFiltros.set(!masFiltros())"><fa-icon [icon]="filterIcon" /> Más filtros</button>
        <app-button [icon]="filterIcon" label="Buscar" [loading]="loading()" loadingLabel="Buscando…"
          (pressed)="load(1,page().tamano,true)" />
      </div>
      @if (masFiltros()) {
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label class="admin-field">Destinatario
            <input class="admin-input" type="search" [ngModel]="destinatario()" (ngModelChange)="destinatario.set($event)" />
          </label>
          <label class="admin-field">Unidad
            <input class="admin-input" type="search" [ngModel]="unidad()" (ngModelChange)="unidad.set($event)" />
          </label>
          <label class="admin-field">Desde
            <input class="admin-input" type="date" [ngModel]="desde()" (ngModelChange)="desde.set($event)" />
          </label>
          <label class="admin-field">Hasta
            <input class="admin-input" type="date" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" />
          </label>
        </div>
      }
      @if (bandeja === 'ENVIADOS' && tipoSalida() !== 'ENVIADOS' && (borradoresFiltrados().length || tipoSalida() === 'BORRADORES')) {
        <section class="doc-drafts space-y-2" aria-label="Borradores">
          <div class="doc-drafts__header">
            <div class="doc-drafts__heading">
              <fa-icon [icon]="draftIcon" aria-hidden="true" />
              <h3>Borradores</h3>
              <span class="doc-drafts__count">{{borradoresFiltrados().length}}</span>
            </div>
            @if (tipoSalida() === 'TODOS') {<span class="doc-drafts__hint">Sin enviar</span>}
          </div>
          @if (borradoresFiltrados().length) {
            <ng-template #draftSubject let-d>
              <div class="doc-drafts__subject">
                <span class="doc-drafts__title">{{d.contenido.asunto || '(Sin asunto)'}}</span>
                <span class="doc-drafts__excerpt">{{extracto(d.contenido.cuerpo) || 'Mensaje sin texto'}}</span>
              </div>
            </ng-template>
            <ng-template #draftDate let-d>
              <span class="doc-drafts__date">{{d.fechaActualizacion | date:'dd/MM/yyyy HH:mm'}}</span>
            </ng-template>
            <ng-template #draftStatus let-d>
              <app-status-badge label="Borrador" tone="warning" [dot]="true" />
            </ng-template>
            <ng-template #draftActions let-d>
              <div class="doc-drafts__actions" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" (keydown.space)="$event.stopPropagation()">
                <app-button [icon]="editIcon" [iconOnly]="true" label="Continuar edición" size="small"
                  tone="ghost" (pressed)="abrirBorrador(d)" />
                <app-button [icon]="deleteIcon" [iconOnly]="true" label="Eliminar borrador" size="small"
                  tone="danger-ghost" (pressed)="eliminarBorrador(d.borradorId)" />
              </div>
            </ng-template>
            <app-data-table [appearance]="'admin'" [density]="'compact'" [columns]="columnasBorradores"
              [rows]="borradoresFiltrados()" [trackByKey]="'borradorId'" [rowClickable]="true"
              [cellTemplates]="{contenido:draftSubject,fechaActualizacion:draftDate,estado:draftStatus,borradorId:draftActions}"
              (rowClick)="abrirBorrador($event)" />
          } @else if (tipoSalida() === 'BORRADORES') {
            <app-empty-state title="Sin borradores" message="No tienes borradores con estos filtros." />
          }
        </section>
      }
      @if (bandeja !== 'ENVIADOS' || tipoSalida() !== 'BORRADORES') {
      @if (!uotId()) {
        <app-empty-state title="Unidad no disponible" message="Actualiza tu unidad principal." />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else if (loading() && !page().items.length) {
        <app-loading-state title="Consultando mensajes" message="Cargando conversaciones." />
      } @else if (!page().items.length && !(bandeja === 'ENVIADOS' && tipoSalida() === 'TODOS' && borradoresFiltrados().length)) {
        <app-empty-state title="Sin mensajes" message="No hay conversaciones para mostrar." />
      } @else if (page().items.length) {
        <ng-template #conversationCell let-msg>
          <div class="doc-sent-message" [class.doc-sent-message--unread]="msg.noLeido">
            <span class="doc-sent-message__icon" aria-hidden="true"><fa-icon [icon]="messageIcon" /></span>
            <div class="doc-sent-message__copy">
              <span class="doc-sent-message__subject">{{msg.asunto}}</span>
              @if(bandeja==='ENVIADOS') {<span class="doc-sent-message__type">{{tipoMensaje(msg)}} · N.º {{msg.documentoId}}</span>}
              @if (msg.resumen) {<span class="doc-sent-message__preview">{{msg.resumen}}</span>}
            </div>
            @if (msg.tieneAdjuntos) {<fa-icon class="doc-sent-message__attachment" [icon]="attachmentIcon" title="Contiene archivos" />}
          </div>
        </ng-template>
        <ng-template #senderCell let-msg><span class="doc-sent-sender" [class.doc-sent-sender--unread]="msg.noLeido">{{msg.emisor}}</span></ng-template>
        <ng-template #statusCell let-msg><app-status-badge [label]="estado(msg)" [tone]="tonoEstado(msg)" [dot]="true" /></ng-template>
        <ng-template #dateCell let-msg><span class="doc-sent-date">{{msg.fechaEnvio | date:'dd/MM/yyyy HH:mm'}}</span></ng-template>
        <div class="doc-sent-table"><app-data-table [appearance]="'admin'" [density]="'compact'" [columns]="columnas"
          [rows]="page().items" [trackByKey]="'documentoId'" [rowClickable]="true"
          [cellTemplates]="{asunto:conversationCell,emisor:senderCell,estadoTramite:statusCell,fechaEnvio:dateCell}"
          (rowClick)="abrir($event)" /></div>
        <app-paginator [page]="page().pagina" [size]="page().tamano" [totalRecords]="page().total"
          [totalPages]="totalPages()" (pageChange)="load($event,page().tamano,true)" (sizeChange)="load(1,$event,true)" />
      }
      }
    </section>
  </div>`,
})
export class BandejaDocumentosPage implements OnDestroy {
  @ViewChild(RedactarDocumentoModal) redactar!: RedactarDocumentoModal;
  private readonly api = inject(GestionDocumentariaApi);
  private readonly uot = inject(UotContextStore);
  private readonly unread = inject(GestionDocumentariaUnreadStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly realtime = inject(GestionDocumentariaRealtime);
  private readonly draftsStore = inject(GestionDocumentariaDraftsStore);
  private readonly screenLoading = inject(ScreenLoadingService);
  readonly bandeja: Folder = this.route.snapshot.data['bandeja'] ?? 'RECIBIDOS';
  readonly titulo = {
    RECIBIDOS: 'Bandeja de entrada', ENVIADOS: 'Enviados', PENDIENTES: 'Pendientes',
    TODOS: 'Conversaciones', FINALIZADOS: 'Finalizados',
  }[this.bandeja];
  readonly icon = faEnvelopeOpenText;
  readonly refreshIcon = faRotate;
  readonly filterIcon = faFilter;
  readonly messageIcon=faEnvelope;
  readonly attachmentIcon=faPaperclip;
  readonly draftIcon = faFilePen;
  readonly editIcon = faPen;
  readonly deleteIcon = faTrashCan;
  readonly tipoSalida = signal<'TODOS' | 'ENVIADOS' | 'BORRADORES'>('TODOS');
  readonly columnasBorradores: readonly DataTableColumn<BorradorTemporal>[] = [
    {key:'contenido',label:'Mensaje'}, {key:'fechaActualizacion',label:'Modificado'},
    {key:'estado',label:'Estado',width:'110px'},
    {key:'borradorId',label:'Acciones',width:'100px',align:'right'},
  ];
  readonly columnas: readonly DataTableColumn<ResumenDocumento>[] = [
    {key:'asunto',label:this.bandeja==='ENVIADOS'?'Mensaje':'Conversación'},
    {key:'emisor',label:'Remitente'},
    {key:'estadoTramite',label:'Estado'},
    {key:'fechaEnvio',label:this.bandeja==='ENVIADOS'?'Enviado':'Última actividad'},
  ];
  tipoMensaje(msg:ResumenDocumento):string {
    if(msg.tipoMovimiento==='RESPUESTA')return 'Respuesta';
    if(msg.tipoMovimiento==='DERIVACION')return 'Derivación';
    if(msg.tipoMovimiento==='REENVIO')return 'Copia enviada';
    if(msg.tipoMovimiento==='RECTIFICACION')return 'Rectificación';
    if(msg.tipoMovimiento==='OBSERVACION')return 'Observación';
    return 'Mensaje enviado';
  }
  readonly uotId = signal<number | null>(null);
  readonly indicadores = this.unread.indicadores;
  readonly buscar = signal(''); readonly estadoFiltro = signal('');
  readonly destinatario = signal(''); readonly unidad = signal('');
  readonly desde = signal(''); readonly hasta = signal('');
  readonly masFiltros = signal(false);
  readonly borradoresFiltrados = computed(() => {
    if (this.bandeja !== 'ENVIADOS') return [];
    const buscar = this.buscar().trim().toLocaleLowerCase();
    const desde = this.desde();
    const hasta = this.hasta();
    const uotId = this.uotId();
    return this.draftsStore.drafts().filter(draft => {
      const contenido = draft.contenido;
      const texto = `${contenido.asunto} ${richTextExcerpt(contenido.cuerpo)}`.toLocaleLowerCase();
      const fecha = draft.fechaActualizacion.slice(0, 10);
      return (uotId === null || contenido.origenUotId == null || contenido.origenUotId === uotId) &&
        (!buscar || texto.includes(buscar)) &&
        (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    });
  });
  readonly error = signal<string | null>(null); readonly loading = signal(false);
  readonly page = signal<BandejaDocumentos>({pagina:1,tamano:20,total:0,items:[]});
  readonly totalPages = computed(()=>Math.max(1,Math.ceil(this.page().total/this.page().tamano)));
  private requestId = 0;
  private readonly context = this.api.contexto().subscribe({
    next:r=>this.uotId.set(this.uot.selectedId()??r.uotId), error:()=>this.error.set('No se pudo consultar tu unidad.'),
  });
  private readonly refreshOnContext = effect(()=>{const id=this.uotId();if(id)untracked(()=>this.load(1,this.page().tamano,true));});
  private readonly stop = this.realtime.watch(()=>{if(this.uotId())this.load();});

  estado(msg:ResumenDocumento):string {
    if (msg.fueraPlazo) return 'Atrasado';
    if (msg.estadoTramite==='FINALIZADO') return 'Finalizado';
    if (msg.estadoTramite==='ANULADO') return 'Anulado';
    if (msg.estadoTramite==='OBSERVADO') return 'Observado';
    if (msg.noLeido) return 'No leído';
    if (msg.tienePendientes) return 'Pendiente';
    if (msg.tipoMovimiento==='RESPUESTA') return 'Respondido';
    return msg.estadoEnvio==='REENVIADO'?'Reenviado':'Enviado';
  }
  tonoEstado(msg:ResumenDocumento):'neutral'|'success'|'warning'|'danger'|'info' {
    const estado=this.estado(msg);
    if (estado==='Atrasado'||estado==='Pendiente'||estado==='Observado')return 'warning';
    if (estado==='Anulado')return 'danger';
    if (estado==='Finalizado'||estado==='Respondido')return 'success';
    if (estado==='No leído')return 'info';
    return 'neutral';
  }
  abrir(item:ResumenDocumento):void {
    const origen = this.bandeja === 'ENVIADOS' ? item.uotEmisorId : undefined;
    this.screenLoading.show('Abriendo conversación', 'Consultando los mensajes y su seguimiento.');
    void this.router.navigate(['/documentos',item.documentoId], {
      queryParams: {...(origen && Number.isSafeInteger(origen) ? {uotId:origen} : {}), desde:this.bandeja.toLowerCase()},
    }).then(navigated=>{if(!navigated)this.screenLoading.hide();})
      .catch(()=>this.screenLoading.hide());
  }
  abrirBorrador(draft:BorradorTemporal):void {
    this.redactar.openDraft(draft.contenido,draft.borradorId);
  }
  eliminarBorrador(id:number):void { this.draftsStore.discard(id); }
  actualizarBorradores():void { /* La lista usa Signals; no requiere consultas al servidor. */ }
  extracto(cuerpo:string):string { return richTextExcerpt(cuerpo).slice(0,140); }
  cambiarTipoSalida(value:'TODOS'|'ENVIADOS'|'BORRADORES'):void {
    this.tipoSalida.set(value);
    this.estadoFiltro.set('');
    this.load(1,this.page().tamano,true);
  }
  load(pagina=this.page().pagina,tamano=this.page().tamano,mostrarPantalla=false):void {
    const ticket=++this.requestId;
    if (this.bandeja === 'ENVIADOS' && this.tipoSalida() === 'BORRADORES') {
      this.loading.set(false); this.error.set(null); return;
    }
    const id=this.uotId(); if (!id) return;
    this.loading.set(true); this.error.set(null);
    if(mostrarPantalla)this.screenLoading.show('Consultando mensajes','Preparando el listado.');
    this.api.bandeja(id,this.bandeja,pagina,tamano,undefined,this.buscar(),this.estadoFiltro(),{
      unidad:this.unidad(),destinatario:this.destinatario(),desde:this.desde(),hasta:this.hasta(),
    }).pipe(finalize(()=>{
      if(ticket===this.requestId)this.loading.set(false);
      if(mostrarPantalla)this.screenLoading.hide();
    })).subscribe({
      next:data=>{if(ticket===this.requestId&&this.uotId()===id)this.page.set(data);},
      error:()=>{if(ticket===this.requestId)this.error.set('No se pudo cargar la bandeja.');},
    });
  }
  ngOnDestroy():void {this.requestId++;this.stop();this.context.unsubscribe();}
}
