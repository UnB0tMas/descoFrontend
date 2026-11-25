import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy,Component,ViewChild,inject } from '@angular/core';
import { GestionDocumentariaDraftsStore } from '../../../../gestion-documentaria-drafts.store';
import { RedactarDocumentoModal } from './redactar-documento';
import { SolicitudSalidaTecnicaModal } from '../../../../../gestion-tecnica/salidas/e2/adapter/in/ui/pages/solicitud-tecnica/solicitud-tecnica';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { richTextExcerpt } from '../../../../../../shared/formatting/simple-rich-text';

@Component({selector:'app-borradores-documentos',standalone:true,
  imports:[DatePipe,RedactarDocumentoModal,PageHeaderComponent,SolicitudSalidaTecnicaModal],
  template:`<div class="desco-page space-y-3">
    <app-page-header title="Borradores" subtitle="Mensajes temporales de esta pestaña." [icon]="icon" />
    <app-redactar-documento (sent)="load()" (draftSaved)="load()" (solicitarSalida)="salidaModal.open()" />
    <app-solicitud-salida-tecnica-modal #salidaModal (completed)="load()" />
    <section class="admin-surface p-4 space-y-3">
      @for(d of drafts();track d.borradorId){
        <article class="border rounded-lg p-3 flex justify-between items-center gap-3 flex-wrap">
          <div><strong>{{d.contenido.asunto || '(Sin asunto)'}}</strong>
            <p class="text-sm">{{d.fechaActualizacion | date:'dd/MM/yyyy HH:mm'}} · {{extracto(d.contenido.cuerpo)}}</p></div>
          <div class="flex gap-2">
            <button class="admin-primary-button" type="button" (click)="redactar.openDraft(d.contenido,d.borradorId)">Continuar</button>
            <button class="admin-secondary-button" type="button" (click)="discard(d.borradorId)">Descartar</button>
          </div>
        </article>
      } @empty {<p class="text-sm">No tienes borradores guardados.</p>}
    </section>
  </div>`,changeDetection:ChangeDetectionStrategy.OnPush})
export class BorradoresDocumentosPage {
  @ViewChild(RedactarDocumentoModal) redactar!:RedactarDocumentoModal;
  private readonly memory=inject(GestionDocumentariaDraftsStore);
  readonly icon=faEnvelope;
  readonly drafts=this.memory.drafts;
  extracto(cuerpo:string):string { return richTextExcerpt(cuerpo).slice(0,100); }
  load():void{}
  discard(id:number):void{this.memory.discard(id);}
}
