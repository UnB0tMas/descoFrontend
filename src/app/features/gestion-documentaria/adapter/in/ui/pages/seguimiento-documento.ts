
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy,Component,effect,untracked,inject,signal,OnDestroy } from '@angular/core';
import { ActivatedRoute,RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { GestionDocumentariaApi, SeguimientoDocumento } from '../../../../gestion-documentaria.api';
import { GestionDocumentariaRealtime } from '../../../../gestion-documentaria-realtime.service';
import { RichTextViewComponent } from '../../../../../../shared/formatting/rich-text-view';

@Component({selector:'app-seguimiento-documento',standalone:true,
  imports:[DatePipe,RouterLink,PageHeaderComponent,RichTextViewComponent],
  template:`<div class="desco-page">
    <app-page-header title="Seguimiento" subtitle="Revisa el estado y las respuestas." [icon]="icon" />
    @if (loading()) {<p>Cargando...</p>}
    @if (error()) {<p class="admin-inline-error">{{error()}}</p>}
    @if (data();as d) {
      <section class="admin-surface p-5 space-y-4">
        <div class="flex flex-wrap justify-between items-center gap-2"><div><h2 class="text-lg font-semibold">{{d.asunto}}</h2><p class="text-sm">Trámite #{{d.hiloId}}</p></div><strong>{{estadoTramite(d.estadoTramite)}}</strong></div>
        @if(d.motivoAnulacion){<p class="text-sm">Motivo de anulación: {{d.motivoAnulacion}}</p>}
        <p class="text-sm">Participantes: @for (u of d.participantes;track u.usuarioId) {<span class="mr-2">{{u.usuario}}</span>}</p>
        <h3 class="font-semibold">Documentos y respuestas</h3>
        <div class="space-y-3">
        @for (item of d.documentos; track item.documentoId) {
          <article class="border rounded-lg p-4 space-y-2">
            <div class="flex justify-between gap-3"><a class="font-semibold underline" [routerLink]="['/documentos',item.documentoId]">#{{item.documentoId}} · {{item.tipo}} · {{item.asunto}}</a>
              <span>{{item.fechaEnvio|date:'dd/MM/yyyy HH:mm'}}</span></div>
            <p>De: {{item.emisor}} @if(item.documentoPadreId){ · Responde al documento #{{item.documentoPadreId}} } @if(item.reemplazaDocumentoId){ · Rectifica al #{{item.reemplazaDocumentoId}} }</p>
            @if(item.cuerpo){<app-rich-text-view [value]="item.cuerpo" />}
            @if(item.fechaLimite){<p class="text-sm">Responder antes de: {{item.fechaLimite | date:'dd/MM/yyyy'}} @if(item.fueraPlazo){<strong>· Atrasado</strong>}</p>}
            @for(attachment of item.adjuntos??[];track attachment.archivoId){
              <p class="text-sm">Adjunto: {{attachment.nombre}}</p>
            }
            <div class="admin-table-wrap" style="max-width:100%;overflow-x:auto"><table class="admin-table" style="min-width:440px"><thead><tr><th>Destinatario</th><th>Estado</th><th>Recibido</th><th>Abierto</th></tr></thead><tbody>
              @for (r of item.destinatarios;track r.usuarioId) {
                <tr><td>{{r.usuario}}</td><td>{{r.fechaAtencion?'En atención':r.fechaAbierto?'Leído':'No leído'}}</td>
                  <td>{{r.fechaEntrega ? (r.fechaEntrega|date:'dd/MM/yyyy HH:mm') : '—'}}</td><td>{{r.fechaAbierto ? (r.fechaAbierto|date:'dd/MM/yyyy HH:mm') : '—'}}</td></tr>
              }
            </tbody></table></div>
          </article>
        }
        </div>
        <h3 class="font-semibold">Actividad</h3>
        <ol class="space-y-2 border-l pl-4">
        @for (event of d.eventos; track event.eventoId) {
          <li><strong>{{eventLabel(event.tipo)}}</strong> · {{event.usuario}} · {{event.fecha | date:'dd/MM/yyyy HH:mm'}}<p>{{event.detalle}}</p></li>
        }
        </ol>
      </section>
    }
  </div>`,changeDetection:ChangeDetectionStrategy.OnPush})
export class SeguimientoDocumentoPage implements OnDestroy {
  private readonly realtime=inject(GestionDocumentariaRealtime);
  private readonly stop=this.realtime.watch(()=>{if(!this.loading())this.load(this.principalUotId());});
  ngOnDestroy():void {this.stop();}
  private readonly route=inject(ActivatedRoute);
  private readonly api=inject(GestionDocumentariaApi);
  readonly principalUotId=signal<number|null>(null);
  private readonly principalSubscription=this.api.contexto().subscribe({
    next:r=>this.principalUotId.set(this.uot.selectedId()??r.uotId),
    error:()=>this.error.set('No se pudo consultar su unidad principal.')
  });
  private readonly uot=inject(UotContextStore);
  readonly icon=faClockRotateLeft;
  readonly loading=signal(false);
  readonly error=signal<string|null>(null);
  readonly data=signal<SeguimientoDocumento|null>(null);
  eventLabel(tipo:string):string {
    const labels:Record<string,string>={ENVIO:'Enviado',RESPUESTA:'Respondido',DERIVACION:'Derivado',REENVIO:'Reenviado',VISTO:'Visto',PRIMERA_VISTA:'Abierto',DESCARGA:'Archivo consultado',OBSERVACION:'Observado',CONFORMIDAD:'Finalizado',ANULACION:'Anulado',RECTIFICACION:'Rectificado',ATENCION:'En atención',CONFORMIDAD_INTERMEDIA:'Conforme'};
    return labels[tipo] ?? "Actualización";
  }
  estadoTramite(value:string):string {return value==='ANULADO'?'Anulado':value==='FINALIZADO'?'Finalizado':value==='OBSERVADO'?'Observado':'En trámite';}
  private readonly uotEffect=effect(()=>{const id=this.principalUotId();untracked(()=>this.load(id));});
  private load(id:number|null):void {
    this.data.set(null);
    const documentoId=Number(this.route.snapshot.paramMap.get('id'));
    if(!id||!documentoId){this.error.set('Unidad principal requerida válida.');return;}
    this.loading.set(true);
    this.api.seguimiento(id,documentoId).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:r=>{if(this.principalUotId()===id)this.data.set(r);},error:e=>{if(this.principalUotId()===id)this.error.set(mapOpenApiError(e).message);}});
  }
}

