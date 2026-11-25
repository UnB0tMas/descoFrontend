import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { faFileLines, faRotate, faArrowUpRightFromSquare, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { finalize, Subscription } from 'rxjs';
import { ScreenLoadingService } from '../../../../../../shared/data-display/screen-loading/screen-loading.service';
import { AppButtonComponent } from '../../../../../../shared/actions/app-button/app-button';
import { ModalShellComponent } from '../../../../../../shared/feedback/modal-shell/modal-shell';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { DataTableComponent } from '../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../shared/data-display/data-table/data-table.types';
import { LoadingStateComponent } from '../../../../../../shared/data-display/loading-state/loading-state';
import { EmptyStateComponent } from '../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../shared/data-display/error-state/error-state';
import { PaginatorComponent } from '../../../../../../shared/data-display/paginator/paginator';
import { ThreadAttachmentsComponent, ThreadAttachment } from '../../../../../../shared/files/thread-attachments/thread-attachments';
import { ProtectedFileViewerComponent } from '../../../../../../shared/files/protected-file-viewer/protected-file-viewer';
import { GestionDocumentariaApi, BandejaDocumentos, ResumenDocumento } from '../../../../gestion-documentaria.api';
import { archivosDeHilo } from '../../../../thread-attachments.mapper';
import { UotContextStore } from '../../../../../uot/state/uot-context.store';

@Component({
  selector:'app-mis-documentos',standalone:true,
  imports:[DatePipe,FormsModule,RouterLink,FaIconComponent,PageHeaderComponent,DataTableComponent,
    LoadingStateComponent,EmptyStateComponent,ErrorStateComponent,PaginatorComponent,
    ThreadAttachmentsComponent,ProtectedFileViewerComponent,AppButtonComponent,ModalShellComponent],
  changeDetection:ChangeDetectionStrategy.OnPush,
  template:`<div class="desco-page space-y-3">
    <app-page-header title="Mis documentos" subtitle="Archivos agrupados por conversación." [icon]="icon">
      <div pageActions>
        <button type="button" class="admin-secondary-button" (click)="load()" [disabled]="loading()">
          <fa-icon [icon]="refresh" /> Actualizar
        </button>
      </div>
    </app-page-header>
    <section class="admin-surface p-4 space-y-3 min-w-0">
      <div class="flex flex-wrap items-end gap-2">
        <label class="admin-field flex-1 min-w-48">Buscar
          <input class="admin-input" type="search" placeholder="Asunto, persona o archivo"
             [ngModel]="buscar()" (ngModelChange)="buscar.set($event)" (keyup.enter)="load(1)" />
        </label>
        <label class="admin-field">Desde
          <input class="admin-input" type="date" [ngModel]="desde()" (ngModelChange)="desde.set($event)" />
        </label>
        <label class="admin-field">Hasta
          <input class="admin-input" type="date" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" />
        </label>
        <button class="admin-secondary-button" type="button" (click)="load(1)">Buscar</button>
      </div>
      @if(!uotId()) {
        <app-empty-state title="Unidad no disponible" message="Actualiza tu unidad principal." />
      } @else if(error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else if(loading()&&!page().items.length) {
        <app-loading-state title="Consultando documentos" message="" [rows]="4" />
      } @else if(!page().items.length) {
        <app-empty-state title="Sin documentos" message="No hay archivos para mostrar." />
      } @else {
        <ng-template #asuntoCell let-msg>
          <div class="min-w-0"><strong class="text-sm break-words">{{msg.asuntoInicial||msg.asunto}}</strong>
            @if(msg.primerMensaje){<p class="mt-1 text-xs opacity-70 line-clamp-2">{{msg.primerMensaje}}</p>}
          </div>
        </ng-template>
        <ng-template #autorCell let-msg><span class="text-sm">{{msg.emisorInicial||msg.emisor}}</span></ng-template>
        <ng-template #archivosCell let-msg><span class="text-sm">{{msg.cantidadArchivos??0}} archivo(s)</span></ng-template>
        <ng-template #fechaCell let-msg><span class="whitespace-nowrap text-sm">{{msg.fechaEnvio|date:'dd/MM/yyyy HH:mm'}}</span></ng-template>
        <ng-template #accionesCell let-msg>
          <app-button [icon]="detailsIcon" label="Detalles" tone="secondary" size="small"
            (pressed)="abrirDetalle(msg)" />
        </ng-template>
        <app-data-table [appearance]="'admin'" [columns]="columnas" [rows]="page().items"
          trackByKey="hiloId"
          [cellTemplates]="{asunto:asuntoCell,emisor:autorCell,cantidadArchivos:archivosCell,fechaEnvio:fechaCell,acciones:accionesCell}" />
        <app-paginator [page]="page().pagina" [size]="page().tamano"
          [totalRecords]="page().total" [totalPages]="totalPages()"
          (pageChange)="load($event)" (sizeChange)="load(1,$event)" />
      }
    </section>
    <app-modal-shell #detalleModal title="Detalle de documentos" size="wide"
      [description]="seleccionado()?.asuntoInicial||seleccionado()?.asunto||null" (closed)="limpiarDetalle()">
      @if(seleccionado(); as item) {
        <div class="space-y-4 min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm opacity-70">{{item.cantidadArchivos??0}} archivo(s) en la conversación</p>
            <a class="admin-secondary-button inline-flex items-center gap-2"
              [routerLink]="['/documentos',item.primerDocumentoId||item.documentoId]" (click)="detalleModal.close()">
              <fa-icon [icon]="conversationIcon" aria-hidden="true" /> Ver conversación
            </a>
          </div>
          @if(cargandoArchivos()) {
            <app-loading-state title="Consultando archivos" />
          } @else if(!archivosCargados()) {
            <div class="space-y-2">
              <p class="admin-inline-error" role="alert">{{errorArchivos()||'No se pudieron cargar los archivos.'}}</p>
              <app-button label="Reintentar" size="small" (pressed)="cargarArchivos(item)" />
            </div>
          } @else {
            @if(errorArchivos()) { <p class="admin-inline-error" role="alert">{{errorArchivos()}}</p> }
            <app-thread-attachments [files]="archivos()" [busyFileKey]="busyFile()"
              (preview)="view($event)" (download)="download($event)" />
          }
        </div>
      }
      <div modalActions class="flex justify-end">
        <app-button label="Cerrar" tone="secondary" size="small" (pressed)="detalleModal.close()" />
      </div>
    </app-modal-shell>
    @if(previewFile();as file) {
      <app-protected-file-viewer [blob]="file.blob" [name]="file.name" [mime]="file.mime"
        (close)="previewFile.set(null)" />
    }
  </div>`,
})
export class MisDocumentosPage implements OnDestroy {
  @ViewChild('detalleModal') private detalleModal?: ModalShellComponent;
  private readonly api=inject(GestionDocumentariaApi);
  private readonly uot=inject(UotContextStore);
  private readonly screen=inject(ScreenLoadingService);
  private readonly subscriptions=new Subscription();
  readonly icon=faFileLines;readonly refresh=faRotate;
  readonly conversationIcon=faArrowUpRightFromSquare;readonly detailsIcon=faCircleInfo;
  readonly busyFile=signal<string|null>(null);
  readonly uotId=signal<number|null>(null);
  readonly loading=signal(false);readonly error=signal<string|null>(null);
  readonly buscar=signal('');readonly desde=signal('');readonly hasta=signal('');
  readonly page=signal<BandejaDocumentos>({pagina:1,tamano:20,total:0,items:[]});
  readonly totalPages=computed(()=>Math.max(1,Math.ceil(this.page().total/this.page().tamano)));
  readonly seleccionado=signal<ResumenDocumento|null>(null);
  readonly archivos=signal<ThreadAttachment[]>([]);
  readonly cargandoArchivos=signal(false);readonly archivosCargados=signal(false);
  readonly errorArchivos=signal<string|null>(null);
  readonly previewFile=signal<{blob:Blob;mime:string;name:string}|null>(null);
  readonly columnas:readonly DataTableColumn<ResumenDocumento>[]=[
    {key:'asunto',label:'Solicitud o asunto'}, {key:'emisor',label:'Iniciado por'},
    {key:'cantidadArchivos',label:'Documentos'}, {key:'fechaEnvio',label:'Último movimiento'},
    {key:'acciones',label:'Acciones',align:'right'},
  ];
  private requestId=0;private fileRequestId=0;
  private readonly context=this.api.contexto().subscribe({
    next:r=>this.uotId.set(this.uot.selectedId()??r.uotId),error:()=>this.error.set('No se pudo consultar tu unidad.'),
  });
  private readonly uotEffect=effect(()=>{
    const id=this.uotId();if(id)untracked(()=>this.load(1));
  });
  load(pagina=this.page().pagina,tamano=this.page().tamano):void {
    const id=this.uotId();if(!id)return;
    const ticket=++this.requestId;
    this.loading.set(true);this.error.set(null);
    this.fileRequestId++;this.detalleModal?.close();this.seleccionado.set(null);
    this.archivos.set([]);this.archivosCargados.set(false);this.errorArchivos.set(null);
    this.previewFile.set(null);
    this.screen.show('Consultando documentos', 'Preparando la lista de archivos.');
    this.subscriptions.add(this.api.bandeja(id,'DOCUMENTOS',pagina,tamano,undefined,this.buscar(),undefined,{
      desde:this.desde(),hasta:this.hasta(),
    }).pipe(finalize(()=>{this.screen.hide();if(ticket===this.requestId)this.loading.set(false);})).subscribe({
      next:r=>{if(ticket===this.requestId&&this.uotId()===id)this.page.set(r);},
      error:()=>{if(ticket===this.requestId)this.error.set('No se pudieron cargar los documentos.');},
    }));
  }
  abrirDetalle(item:ResumenDocumento):void {
    if(!this.uotId())return;
    this.seleccionado.set(item);
    this.detalleModal?.open();
    this.cargarArchivos(item);
  }
  cargarArchivos(item:ResumenDocumento):void {
    const id=this.uotId();if(!id)return;
    const ticket=++this.fileRequestId;
    this.archivos.set([]);this.archivosCargados.set(false);this.errorArchivos.set(null);
    this.cargandoArchivos.set(true);
    this.subscriptions.add(this.api.seguimiento(id,item.primerDocumentoId||item.documentoId)
      .pipe(finalize(()=>{if(ticket===this.fileRequestId)this.cargandoArchivos.set(false);})).subscribe({
      next:r=>{
        if(ticket!==this.fileRequestId||this.uotId()!==id)return;
        this.archivos.set(archivosDeHilo(r));this.archivosCargados.set(true);
      },
      error:()=>{if(ticket===this.fileRequestId)this.errorArchivos.set('No se pudieron cargar los archivos.');},
    }));
  }
  limpiarDetalle():void {
    this.fileRequestId++;this.seleccionado.set(null);this.archivos.set([]);
    this.archivosCargados.set(false);this.cargandoArchivos.set(false);
    this.errorArchivos.set(null);
  }
  view(file:ThreadAttachment):void {
    const id=this.uotId();if(!id||this.busyFile())return;
    const ticket=this.fileRequestId;
    this.busyFile.set('ver-'+file.archivoId);
    this.errorArchivos.set(null);
    this.subscriptions.add(this.api.contenido(id,file.documentoId,file.archivoId)
      .pipe(finalize(()=>this.busyFile.set(null))).subscribe({
        next:blob=>{if(ticket===this.fileRequestId&&this.uotId()===id)
          this.previewFile.set({blob,mime:file.mimeType,name:file.nombre});},
        error:()=>this.errorArchivos.set('No se pudo abrir el archivo.'),
      }));
  }
  download(file:ThreadAttachment):void {
    const id=this.uotId();if(!id||this.busyFile())return;
    const ticket=this.fileRequestId;
    this.busyFile.set('descargar-'+file.archivoId);
    this.errorArchivos.set(null);
    this.subscriptions.add(this.api.contenido(id,file.documentoId,file.archivoId)
      .pipe(finalize(()=>this.busyFile.set(null))).subscribe({next:blob=>{
      if(ticket!==this.fileRequestId||this.uotId()!==id)return;
      const url=URL.createObjectURL(blob);const link=document.createElement('a');
      link.href=url;link.download=file.nombre;document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
    },error:()=>this.errorArchivos.set('No se pudo descargar el archivo.')}));
  }
  ngOnDestroy():void {this.requestId++;this.fileRequestId++;this.context.unsubscribe();this.subscriptions.unsubscribe();}
}
