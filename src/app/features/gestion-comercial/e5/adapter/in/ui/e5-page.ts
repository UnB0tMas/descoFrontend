import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component,OnInit,computed,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute,RouterLink } from '@angular/router';
import { Observable,finalize } from 'rxjs';
import { PermissionService } from '../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';
import { CommercialApiService,CommercialOption } from '../../../../shared/commercial-api.service';
import { E5UseCase } from '../../../application/use-case/e5.use-case';
import {
 E5TableroResponse,E5GastosResponse,E5RepartosResponse,E5LiquidacionesResponse,
 E5LiquidacionResponse,E5ValidacionCierreResponse,E5CobrosResponse
} from '../../../../../../infrastructure/openapi/generated';

type Tab='balance'|'gastos'|'liquidaciones'|'pagos'|'reportes'|'cierre';
@Component({selector:'app-apappss-e5',standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,PageHeaderComponent],
 templateUrl:'./e5-page.html',styleUrl:'./e5-page.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class E5Page implements OnInit {
 private readonly api=inject(E5UseCase);
 private readonly common=inject(CommercialApiService);
 private readonly permission=inject(PermissionService);
 private readonly route=inject(ActivatedRoute);
 private readonly toast=inject(ToastService);
 readonly options=signal<readonly CommercialOption[]>([]);
 readonly tablero=signal<E5TableroResponse|null>(null);
 readonly gastos=signal<E5GastosResponse|null>(null);
 readonly repartos=signal<E5RepartosResponse|null>(null);
 readonly liquidaciones=signal<E5LiquidacionesResponse|null>(null);
 readonly detalle=signal<E5LiquidacionResponse|null>(null);
 readonly cierre=signal<E5ValidacionCierreResponse|null>(null);
 readonly cobros=signal<E5CobrosResponse|null>(null);
 readonly loaded=signal(false);
 readonly busy=signal(false);
 readonly error=signal<string|null>(null);
 readonly notice=signal<string|null>(null);
 readonly tab=signal<Tab>('balance');
 readonly search=signal('');
 readonly sociosFiltrados=computed(()=>{
  const q=this.search().trim().toLocaleLowerCase();
  return (this.tablero()?.socios??[]).filter(x=>!q || `${x.socio??''} ${x.participacionId??''}`.toLocaleLowerCase().includes(q));
 });
 campaignId=0;
 gastoId=0;
 liquidacionId=0;
 importePago:number|null=null;
 medioPago='TRANSFERENCIA';
 referenciaPago='';
 observacion='';
 motivoRectificacion='';
 cierreObservacion='';
 excepcionAutorizada=false;
 motivoExcepcion='';
 readonly canViewGastos=computed(()=>this.permission.has('GASTOS_LISTAR'));
 readonly canViewLiquidaciones=computed(()=>this.permission.has('LIQUIDACIONES_LISTAR'));
 readonly canViewCobros=computed(()=>this.permission.has('COBROS_VER'));
 can(code:string):boolean{return this.permission.has(code)}
 ngOnInit():void {
  const preset=Number(this.route.snapshot.queryParamMap.get('campaniaId'));
  this.common.references().subscribe({next:refs=>{
    this.options.set(refs.campaigns);
    this.campaignId=Number.isInteger(preset)&&preset>0?preset:
      (refs.campaigns.length===1?refs.campaigns[0].value:0);
    this.loaded.set(true);
    if(this.campaignId) this.load();
   },error:e=>{this.loaded.set(true);this.fail(e)}});
 }
 changeTab(t:Tab):void {this.tab.set(t);if(!this.campaignId)return;
   if(t==='gastos')this.loadGastos();
   if(t==='liquidaciones'||t==='pagos')this.loadLiquidaciones();
   if(t==='cierre')this.loadCierre();
   if(t==='reportes')this.loadCobros();
 }
 private fail(e:unknown):void {const text=mapOpenApiError(e).message||'Operación no completada.';
    this.error.set(text);this.toast.error('No fue posible completar la acción',text);}
 private done(message:string):void {this.error.set(null);this.notice.set(message);this.toast.success(message)}
 private mutation<T>(call:Observable<T>,message:string,onSuccess?:(value:T)=>void):void {
  if(this.busy())return;
  this.busy.set(true);
  call.pipe(finalize(()=>this.busy.set(false))).subscribe({next:value=>{
    this.done(message);onSuccess?.(value);this.refresh();},error:e=>this.fail(e)});
 }
 load():void {
  this.tablero.set(null);this.gastos.set(null);this.liquidaciones.set(null);
  this.detalle.set(null);this.repartos.set(null);this.cierre.set(null);
  this.gastoId=0;this.liquidacionId=0;
  if(!this.campaignId)return;
  this.refresh();
  if(this.canViewGastos())this.loadGastos();
  if(this.canViewLiquidaciones())this.loadLiquidaciones();
 }
 refresh():void {if(!this.campaignId)return;
  this.api.tablero(this.campaignId).subscribe({next:d=>this.tablero.set(d),error:e=>this.fail(e)});
 }
 loadGastos():void {if(!this.campaignId||!this.canViewGastos())return;
  this.api.gastos(this.campaignId).subscribe({next:d=>this.gastos.set(d),error:e=>this.fail(e)});
 }
 chooseGasto():void {this.repartos.set(null);
  if(!this.gastoId||!this.can('GASTOS_VER'))return;
  this.api.repartos(this.gastoId).subscribe({next:d=>this.repartos.set(d),error:e=>this.fail(e)});
 }
 repartir():void {if(!this.gastoId)return;
  this.mutation(this.api.repartir(this.gastoId),'Reparto propuesto.',()=>{this.loadGastos();this.chooseGasto()});}
 aprobarReparto():void {if(!this.gastoId||!confirm('¿Aprobar las cuotas de este gasto?'))return;
  this.mutation(this.api.aprobarReparto(this.gastoId),'Reparto aprobado.',()=>{this.loadGastos();this.chooseGasto()});}
 rectificarReparto():void {if(!this.gastoId||!this.observacion.trim()||!confirm('¿Rectificar el reparto aprobado?'))return;
  this.mutation(this.api.rectificarReparto(this.gastoId,this.observacion.trim()),'Reparto rectificado.',()=>{this.observacion='';this.loadGastos();this.chooseGasto()});}
 loadLiquidaciones():void {if(!this.campaignId||!this.canViewLiquidaciones())return;
  this.api.liquidaciones(this.campaignId).subscribe({next:d=>this.liquidaciones.set(d),error:e=>this.fail(e)});
 }
 liquidar(participacionId:number):void {if(!confirm('¿Calcular una nueva versión usando únicamente datos confirmados?'))return;
  this.mutation(this.api.liquidar(participacionId,this.motivoRectificacion.trim()||undefined),
    'Versión de liquidación calculada.',d=>{this.motivoRectificacion='';this.loadLiquidaciones();if(d.liquidacionId)this.openLiquidacion(d.liquidacionId)});
 }
 openLiquidacion(id:number):void {this.liquidacionId=id;this.detalle.set(null);
  this.api.liquidacion(id).subscribe({next:d=>this.updateDetalle(d),error:e=>this.fail(e)});
 }
 private updateDetalle(d:E5LiquidacionResponse):void {this.detalle.set(d);this.importePago=Math.max(0,d.saldo??0);
    this.referenciaPago='';this.medioPago='TRANSFERENCIA';}
 aprobarLiquidacion():void {if(!this.liquidacionId||!confirm('¿Aprobar y congelar esta versión?'))return;
  this.mutation(this.api.aprobarLiquidacion(this.liquidacionId),'Liquidación aprobada.',d=>{this.updateDetalle(d);this.loadLiquidaciones()});}
 observarLiquidacion():void {if(!this.liquidacionId||!this.observacion.trim())return;
  this.mutation(this.api.observarLiquidacion(this.liquidacionId,this.observacion.trim()),
    'Liquidación observada.',d=>{this.updateDetalle(d);this.observacion='';this.loadLiquidaciones()});}
 saldoCompleto():void {this.importePago=Math.max(0,this.detalle()?.saldo??0)}
 pagar():void {const d=this.detalle();if(!d?.liquidacionId||!this.importePago||this.importePago<=0||this.importePago>(d.saldo??0))return;
  if(!confirm(`¿Confirmar pago de S/ ${this.importePago.toFixed(2)} al socio?`))return;
  const body={importe:this.importePago,medioPago:this.medioPago,referencia:this.referenciaPago.trim()||undefined};
  this.mutation(this.api.pagar(d.liquidacionId,body),'Pago confirmado.',x=>{this.updateDetalle(x);this.loadLiquidaciones()});
 }
 reversar(id:number):void {if(!this.observacion.trim()||!confirm('¿Reversar este pago? El registro se conservará.'))return;
  this.mutation(this.api.reversar(id,this.observacion.trim()),'Pago revertido.',d=>{
    this.updateDetalle(d);this.observacion='';this.loadLiquidaciones()});}
 loadCobros():void {if(!this.campaignId||!this.canViewCobros())return;
  this.api.cobros(this.campaignId).subscribe({next:d=>this.cobros.set(d),error:e=>this.fail(e)});
 }
 loadCierre():void {if(!this.campaignId)return;
  this.api.validarCierre(this.campaignId).subscribe({next:d=>this.cierre.set(d),error:e=>this.fail(e)});
 }
 cerrar():void {if(!this.campaignId||!this.cierreObservacion.trim()||!confirm('¿Cerrar definitivamente la campaña?'))return;
  this.mutation(this.api.cerrar(this.campaignId,{observacion:this.cierreObservacion.trim(),
    excepcionAutorizada:this.excepcionAutorizada,motivoExcepcion:this.motivoExcepcion.trim()||undefined}),
    'Campaña cerrada y balance congelado.',()=>this.loadCierre());}
 exportar():void {if(!this.campaignId||!this.can('REPORTES_EXPORTAR'))return;
  this.api.exportar(this.campaignId).subscribe({next:data=>{
    const values=[['Participacion','Socio','Kg','Neto','Pagado','Saldo'],...(data.socios??[]).map(s=>[
      `${s.participacionId??''}`,s.socio??'',`${s.kilogramos??0}`,`${s.neto??''}`,`${s.pagado??0}`,`${s.saldo??''}`])];
    const safe=(v:string)=>`"${(v.startsWith('=')||v.startsWith('+')||v.startsWith('-')||v.startsWith('@')?"'":'')+v.replaceAll('"','""')}\"`;
    const csv='\uFEFF'+values.map(r=>r.map(safe).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`apappss-campania-${this.campaignId}.csv`;a.click();
    URL.revokeObjectURL(url);this.done('Reporte exportado con autorización.');
  },error:e=>this.fail(e)});
 }
}
