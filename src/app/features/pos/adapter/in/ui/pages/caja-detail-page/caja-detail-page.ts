import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { faCashRegister, faScaleBalanced, faPrint, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import { AppButtonComponent } from '../../../../../../../shared/actions/app-button/app-button';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { CajaDetalle, CajaPosApiService, CajaSesion } from '../../../../../shared/caja-pos-api.service';
import { CajaArqueoPanelComponent } from '../../../../../shared/ui/caja-arqueo-panel/caja-arqueo-panel';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';

@Component({selector:'app-caja-detail-page',standalone:true,
  imports:[CommonModule,RouterLink,PageHeaderComponent,CajaArqueoPanelComponent,AppButtonComponent],
  templateUrl:'./caja-detail-page.html',styleUrl:'./caja-detail-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush})
export class CajaDetailPage {
  @ViewChild(CajaArqueoPanelComponent) private arqueoPanel?:CajaArqueoPanelComponent;
  readonly permissions=inject(PermissionService);
  simular(turno:CajaSesion):void{this.arqueoPanel?.simular(turno.sesionId,this.uotId);}
  imprimir(turno:CajaSesion):void{this.arqueoPanel?.imprimirCierre(turno.sesionId,this.uotId);}
  descargar(turno:CajaSesion):void{this.arqueoPanel?.descargarPdf(turno.sesionId,this.uotId);}
  private readonly route=inject(ActivatedRoute);
  private readonly api=inject(CajaPosApiService);
  readonly uot=inject(UotContextStore);
  readonly icon=faCashRegister;readonly arqueoIcon=faScaleBalanced;readonly ticketIcon=faPrint;readonly pdfIcon=faFilePdf;
  readonly detalle=signal<CajaDetalle|null>(null);
  readonly loading=signal(false);
  readonly error=signal<string|null>(null);
  readonly seleccion=signal<number|null>(null);
  readonly cajaId=Number(this.route.snapshot.paramMap.get('id'));
  constructor(){effect(()=>{const uot=this.uot.isGeneral()?0:(this.uot.selectedId()??0);
      untracked(()=>{this.detalle.set(null);this.seleccion.set(null);if(uot)this.load();});});}
  get uotId():number{return this.uot.isGeneral()?0:(this.uot.selectedId()??0);}
  load():void{
    const uot=this.uotId;if(!uot||!Number.isSafeInteger(this.cajaId)||this.cajaId<=0)return;
    this.loading.set(true);this.error.set(null);
    this.api.detalle(uot,this.cajaId).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:d=>{if(uot===this.uotId){this.detalle.set(d??null);if(d&&!this.seleccion())this.seleccion.set(d.sesiones[0]?.sesionId??null);}},
      error:e=>this.error.set(mapOpenApiError(e).message),
    });
  }
  get jornadas():{dia:string;turnos:CajaSesion[]}[] {
    const rows=this.detalle()?.sesiones??[];
    const groups=new Map<string,CajaSesion[]>();
    for(const s of rows){const day=s.fechaApertura.slice(0,10);groups.set(day,[...(groups.get(day)??[]),s]);}
    return Array.from(groups,([dia,turnos])=>({dia,turnos})).sort((a,b)=>b.dia.localeCompare(a.dia));
  }
  evidenciasDelTurno(sesionId:number,fase:'APERTURA'|'CIERRE') {
    return (this.detalle()?.evidencias??[]).filter(e=>e.sesionId===sesionId&&e.fase===fase);
  }
  ventasDelTurno(sesionId:number) {return this.detalle()?.ventas.filter(v=>v.sesionId===sesionId)??[];}
  movimientosDelTurno(sesionId:number) {return this.detalle()?.movimientos.filter(m=>m.sesionId===sesionId)??[];}
  asignacionesDelTurno(sesionId:number) {return this.detalle()?.asignaciones.filter(a=>a.sesionId===sesionId)??[];}
  get turno():CajaSesion|null{return this.detalle()?.sesiones.find(s=>s.sesionId===this.seleccion())??null;}
}
