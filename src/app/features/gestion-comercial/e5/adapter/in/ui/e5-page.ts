import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component,ElementRef,OnInit,ViewChild,computed,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute,RouterLink } from '@angular/router';
import { Observable,finalize,from,concatMap,catchError,of,toArray } from 'rxjs';
import { PermissionService } from '../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';
import { CommercialApiService,CommercialOption } from '../../../../shared/commercial-api.service';
import { CampaignPlanningApiService } from '../../../../campaigns/campaign-planning-api.service';
import { E5UseCase } from '../../../application/use-case/e5.use-case';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartArea,faChartPie,faPlus,faFileArrowUp,faPen,faTrashCan,faEye,faCalculator,faCheck,faXmark,faRotate,faMoneyBillTransfer,faReceipt } from '@fortawesome/free-solid-svg-icons';
import { ChartCardComponent } from '../../../../../../shared/charts/chart-card/chart-card';
import { ChartCardData } from '../../../../../../shared/charts/chart-card/chart-card.types';
import { ChartPresetsService } from '../../../../../../shared/charts/chart-presets.service';
import { E5ExtrasApiService,E5Graficos,E5EntregasSocio,E5CobrosDetalle } from './e5-extras-api.service';
import { ActionConfirmDialogComponent } from '../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { GastoFormComponent } from '../../../../../finanzas/gastos/adapter/in/ui/pages/gasto-form/gasto-form';
import { ObtenerGastoUseCase } from '../../../../../finanzas/gastos/application/use-case/obtener-gasto.use-case';
import { AnularGastoUseCase } from '../../../../../finanzas/gastos/application/use-case/anular-gasto.use-case';
import { CobroCompradorFormComponent } from '../../../../../finanzas/cobros-compradores/adapter/in/ui/pages/cobro-comprador-form/cobro-comprador-form';
import { ConfirmarCobroCompradorUseCase } from '../../../../../finanzas/cobros-compradores/application/use-case/confirmar-cobro-comprador.use-case';
import { AnularCobroCompradorUseCase } from '../../../../../finanzas/cobros-compradores/application/use-case/anular-cobro-comprador.use-case';
import { EvidencePanelComponent } from '../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { EvidenceUploaderComponent } from '../../../../../documentos-evidencias/adapter/in/ui/components/evidence-uploader/evidence-uploader';
import { E5ExpenseDetailComponent } from './e5-expense-detail';
import { EvidenciaContexto } from '../../../../../documentos-evidencias/domain/evidencia-contexto.model';

import {
 E5TableroResponse,E5GastosResponse,E5RepartosResponse,E5LiquidacionesResponse,
 E5LiquidacionResponse,E5CobrosResponse
} from '../../../../../../infrastructure/openapi/generated';

type Tab='balance'|'gastos'|'liquidaciones'|'cobros'|'reportes';
@Component({selector:'app-apappss-e5',standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,PageHeaderComponent,ChartCardComponent,GastoFormComponent,ActionConfirmDialogComponent,CobroCompradorFormComponent,EvidencePanelComponent,EvidenceUploaderComponent,E5ExpenseDetailComponent,FaIconComponent],
 templateUrl:'./e5-page.html',styleUrl:'./e5-page.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class E5Page implements OnInit {
 @ViewChild(GastoFormComponent) private gastoForm?:GastoFormComponent;
 @ViewChild(EvidenceUploaderComponent) private uploader?:EvidenceUploaderComponent;
 @ViewChild(E5ExpenseDetailComponent) private expenseDetail?:E5ExpenseDetailComponent;
 @ViewChild(CobroCompradorFormComponent) private cobroForm?:CobroCompradorFormComponent;
 @ViewChild('evidenceDialog',{static:true}) private evidenceDialog!:ElementRef<HTMLDialogElement>;
 @ViewChild('liquidacionDialog',{static:true}) private liquidacionDialog!:ElementRef<HTMLDialogElement>;
 @ViewChild('manualDialog',{static:true}) private manualDialog!:ElementRef<HTMLDialogElement>;
 readonly icons={add:faPlus,file:faFileArrowUp,edit:faPen,remove:faTrashCan,view:faEye,calculate:faCalculator,approve:faCheck,close:faXmark,refresh:faRotate,collection:faMoneyBillTransfer,expense:faReceipt};
 @ViewChild(ActionConfirmDialogComponent) private confirmDialog?:ActionConfirmDialogComponent;
 private readonly getGasto=inject(ObtenerGastoUseCase);
 private readonly anularGastoUseCase=inject(AnularGastoUseCase);
 private readonly confirmarCobro=inject(ConfirmarCobroCompradorUseCase);
 private readonly anularCobro=inject(AnularCobroCompradorUseCase);
 private readonly extras=inject(E5ExtrasApiService);
 private readonly presets=inject(ChartPresetsService);

 private readonly api=inject(E5UseCase);
 private readonly common=inject(CommercialApiService);
 private readonly planning=inject(CampaignPlanningApiService);
 private readonly permission=inject(PermissionService);
 private readonly route=inject(ActivatedRoute);
 private readonly toast=inject(ToastService);
 readonly options=signal<readonly CommercialOption[]>([]);
 readonly varieties=signal<readonly CommercialOption[]>([]);
 readonly charts=signal<E5Graficos|null>(null);
 readonly chartError=signal<string|null>(null);
 fechaInicio='';fechaFin='';variedadId=0;
 readonly frozen=computed(()=>!!this.tablero()?.cerrada ||
   !['ACTIVA','VENCIDA'].includes(this.tablero()?.estado??'') ||
   (this.tablero()?.socios??[]).some(x=>(x.pagado??0)>0));
 readonly ventasChart=computed<ChartCardData>(()=>{
   const values=this.charts()?.porDia??[];
   return {title:'Ventas efectivas por fecha',subtitle:'Venta confirmada por día',icon:faChartArea,
     empty:values.length===0,emptyMessage:'Sin ventas en el período.',
     options:{...this.presets.area([{name:'Venta efectiva (S/)',data:values.map(x=>x.ventaEfectiva)}],values.map(x=>x.fecha)),
       colors:['#3b82f6'],chart:{type:'area',height:280,toolbar:{show:false}},
       grid:{borderColor:'#33415540'},tooltip:{theme:'dark'}}};
 });
 readonly variedadesChart=computed<ChartCardData>(()=>{
   const values=this.charts()?.porVariedad??[];
   return {title:'Ingresos por variedad',subtitle:'Distribución de ventas confirmadas',icon:faChartPie,
     empty:values.length===0,emptyMessage:'Sin ventas por variedad.',
     options:{...this.presets.donut(values.map(x=>x.ventaEfectiva),values.map(x=>x.variedad)),
       colors:['#3b82f6','#0ea5e9','#8b5cf6','#22c55e','#f59e0b'],
       chart:{type:'donut',height:280,toolbar:{show:false}},legend:{position:'bottom'},tooltip:{theme:'dark'}}};
 });
 readonly tablero=signal<E5TableroResponse|null>(null);
 readonly gastos=signal<E5GastosResponse|null>(null);
 readonly repartos=signal<E5RepartosResponse|null>(null);
 readonly liquidaciones=signal<E5LiquidacionesResponse|null>(null);
 readonly detalle=signal<E5LiquidacionResponse|null>(null);
 readonly cobros=signal<E5CobrosResponse|null>(null);
 readonly cobrosDetalle=signal<E5CobrosDetalle|null>(null);
 readonly entregas=signal<E5EntregasSocio|null>(null);
 readonly entregasError=signal<string|null>(null);
 readonly evidencia=signal<EvidenciaContexto|null>(null);
 readonly socioModal=signal<{participacionId:number;socio:string;liquidacionId:number|null;estado:string}|null>(null);
 readonly manualGasto=signal<{gastoId:number;concepto:string;importe:number;rectificacion?:boolean}|null>(null);
 readonly manualCuotas=signal<readonly {participacionId:number;monto:number}[]>([]);
 readonly totalManual=computed(()=>Math.round(this.manualCuotas().reduce((s,x)=>s+x.monto,0)*100)/100);
 readonly manualValido=computed(()=>this.manualCuotas().length>0 && this.manualCuotas().every(x=>x.monto>0 && Number.isFinite(x.monto) && Math.abs(Math.round(x.monto*100)-x.monto*100)<0.000001) && Math.abs(this.totalManual()-(this.manualGasto()?.importe??0))<0.005);
 readonly pendientesLiquidar=computed(()=>(this.tablero()?.socios??[]).filter(s=>
   (s.kilogramos??0)>0 && !!s.participacionId && !s.liquidacionId));
 readonly requiereReliquidacion=computed(()=>(this.tablero()?.socios??[]).some(s=>s.requiereRegeneracion===true)); readonly gastosPendientes=computed(()=>(this.gastos()?.gastos??[]).some(g=>g.estado!=='ANULADO'&&g.estado!=='APROBADO'));
 readonly modalTab=signal<'entregas'|'partidas'|'jabas'>('partidas');
 readonly saldoRegistrable=computed(()=>Math.max(0,Math.round(((this.cobros()?.saldoComprador??0)-
   (this.cobrosDetalle()?.movimientos??[]).filter(m=>m.estado==='REGISTRADO').reduce((a,m)=>a+m.importe,0))*100)/100));
 readonly loaded=signal(false);
 readonly busy=signal(false);
 readonly error=signal<string|null>(null);
 readonly notice=signal<string|null>(null);
 readonly tab=signal<Tab>('balance');
 readonly compradorNombre=signal('No disponible');
 readonly puedeLiquidar=computed(()=>['ACTIVA','VENCIDA'].includes(this.tablero()?.estado??'')&&!this.tablero()?.cerrada);
 readonly search=signal('');
 readonly sociosVendedores=computed(() => this.sociosFiltrados().filter(x=>(x.kilogramos??0)>0));
 readonly sociosLiquidacion=computed(()=>this.sociosVendedores().length?this.sociosVendedores():this.sociosFiltrados());
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
 readonly canViewGastos=computed(()=>this.permission.has('GASTOS_LISTAR'));
 readonly canViewLiquidaciones=computed(()=>this.permission.has('LIQUIDACIONES_LISTAR'));
 readonly canViewCobros=computed(()=>this.permission.has('COBROS_VER'));
 can(code:string):boolean{return this.permission.has(code)}
 nombreSocio(participacionId:number|null|undefined):string {
  return this.tablero()?.socios?.find(x=>x.participacionId===participacionId)?.socio??String(participacionId??'—');
 }
 estadoTexto(estado:string|null|undefined):string {
  return ({CALCULADA:'Calculada',OBSERVADA:'Observada',APROBADA:'Liquidada',PAGADA_PARCIAL:'Pago parcial',PAGADA:'Pagada',REGISTRADO:'Registrado',CONFIRMADO:'Confirmado',ANULADO:'Anulado'} as Record<string,string>)[estado??'']??estado??'Pendiente';
 }
 ngOnInit():void {
  this.campaignId=Number(this.route.snapshot.paramMap.get('campaniaId'));
  // El tablero no debe depender de catálogos externos a Finanzas.
  if(this.campaignId>0)this.load();
  this.common.campaignReferences().subscribe({
    next:refs=>{this.varieties.set(refs.varieties);this.loaded.set(true);},
    error:e=>{this.loaded.set(true);this.chartError.set(mapOpenApiError(e).message);},
  });
 }
 changeTab(t:Tab):void {this.tab.set(t);if(!this.campaignId)return;
   if(t==='gastos')this.loadGastos();
   if(t==='liquidaciones')this.loadLiquidaciones();
   if(t==='cobros'||t==='reportes')this.loadCobros();
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
  this.detalle.set(null);this.repartos.set(null);this.cobros.set(null);this.charts.set(null);
  this.gastoId=0;this.liquidacionId=0;this.cobrosDetalle.set(null);
  if(!this.campaignId)return;
  this.refresh();this.loadCharts();this.loadComprador();
  if(this.canViewGastos())this.loadGastos();
  if(this.canViewLiquidaciones())this.loadLiquidaciones();
  if(this.tab()==='cobros'||this.tab()==='reportes')this.loadCobros();
 }
 refresh():void {if(!this.campaignId)return;
  this.api.tablero(this.campaignId).subscribe({next:d=>this.tablero.set(d),error:e=>this.fail(e)});
 }
 private loadComprador():void {
  this.compradorNombre.set('No disponible');
  this.planning.plan(this.campaignId).subscribe({
   next:d=>{const nombre=d.compradorNombre?.trim();
     if(nombre)this.compradorNombre.set(nombre);
     else this.loadCompradorAlternativo();},
   error:()=>this.loadCompradorAlternativo(),
  });
 }
 private loadCompradorAlternativo():void {
  this.common.detail('campaigns',this.campaignId).subscribe({next:d=>{
   const nombre=d['comprador']??d['empresaCompradora']??d['compradorNombre'];
   if(typeof nombre==='string'&&nombre.trim())this.compradorNombre.set(nombre.trim());
  },error:()=>{}});
 }
 loadCharts():void {if(!this.campaignId)return;
  this.chartError.set(null);
  this.extras.graficos(this.campaignId,this.fechaInicio,this.fechaFin,this.variedadId||null).subscribe({
    next:v=>this.charts.set(v),error:e=>this.chartError.set(mapOpenApiError(e).message),
  });
 }
 async nuevoGasto():Promise<void> {if(this.frozen()||!this.can('GASTOS_CREAR'))return;
  const result=await this.gastoForm?.open(undefined,this.campaignId);
  if(result?.saved){
    this.loadGastos();this.refresh();
    if(result.id && result.reglaCodigo==='IGUAL')
      this.distribuirGastoIgualitario(result.id);
  }
 }
 private distribuirGastoIgualitario(gastoId:number):void {
  if(!this.can('GASTOS_CREAR')||!this.can('GASTOS_APROBAR')){
   this.notice.set('Gasto registrado. Requiere autorización para distribuirlo y aprobarlo antes de liquidar.');
   return;
  }
  this.busy.set(true);
  this.api.repartir(gastoId).pipe(concatMap(()=>this.api.aprobarReparto(gastoId)),
   finalize(()=>this.busy.set(false))).subscribe({
    next:()=>{this.done('Gasto registrado y distribuido por igual entre los socios.');
      this.loadGastos();this.loadLiquidaciones();this.refresh();},
    error:e=>{this.fail(e);this.loadGastos();this.refresh();}
  });
 }
 editarGasto(id:number):void {if(this.frozen()||!this.can('GASTOS_EDITAR'))return;
  this.getGasto.execute(id).subscribe({next:async gasto=>{
    const result=await this.gastoForm?.open(gasto.gasto,this.campaignId);
    if(result?.saved){
      this.loadGastos();this.refresh();
      if(result.id&&result.reglaCodigo==='IGUAL')this.distribuirGastoIgualitario(result.id);
    }
  },error:e=>this.fail(e)});
 }
 async anularGasto(id:number):Promise<void> {
  if(this.frozen()||!this.can('GASTOS_RETIRAR'))return;
  const r=await this.confirmDialog?.show({title:'Anular gasto',message:'Se retirará lógicamente de la campaña y quedará en el historial.',confirmLabel:'Anular gasto',tone:'danger',requiresReason:true,reasonLabel:'Motivo',minimumReasonLength:5});
  if(!r?.confirmed||!r.reason)return;
  this.mutation(this.anularGastoUseCase.execute(id,r.reason),'Gasto anulado.',()=>this.loadGastos());
 }
 async liquidarPendientes():Promise<void> {
  if(this.busy()||this.gastosPendientes()||!this.can('LIQUIDACIONES_CREAR')||!this.puedeLiquidar())return;
  const rows=this.pendientesLiquidar();
  if(!rows.length)return;
  const choice=await this.confirmDialog?.show({title:'Generar liquidaciones',
    message:`Se calcularán ${rows.length} liquidaciones. Revisa y aprueba cada resultado antes del pago.`,
    confirmLabel:'Generar',tone:'primary'});
  if(!choice?.confirmed)return;
  this.busy.set(true);
  from(rows).pipe(concatMap(s=>this.api.liquidar(s.participacionId!).pipe(
    catchError(()=>of(null)))),toArray(),finalize(()=>this.busy.set(false)))
    .subscribe(results=>{
      const correctas=results.filter(x=>!!x?.liquidacionId).length;
      this.done(`${correctas} de ${results.length} liquidaciones generadas.`);
      if(correctas!==results.length)this.error.set('Revisa las liquidaciones pendientes.');
      this.loadLiquidaciones();this.refresh();
    });
 }
 loadGastos():void {if(!this.campaignId||!this.canViewGastos())return;
  this.api.gastos(this.campaignId).subscribe({next:d=>this.gastos.set(d),error:e=>this.fail(e)});
 }
 chooseGasto():void {this.repartos.set(null);
  if(!this.gastoId||!this.can('GASTOS_VER'))return;
  this.api.repartos(this.gastoId).subscribe({next:d=>this.repartos.set(d),error:e=>this.fail(e)});
 }
 repartir():void {
  if(!this.gastoId||this.frozen()||this.busy())return;
  const g=this.gastos()?.gastos?.find(x=>x.gastoId===this.gastoId);
  if(g?.reglaCodigo==='MANUAL'){
    this.mostrarManual(this.gastoId,g.concepto??'Gasto',g.importe??0);
    return;
  }
  this.mutation(this.api.repartir(this.gastoId),'Reparto propuesto.',()=>{this.loadGastos();this.chooseGasto()});
 }
 mostrarManual(gastoId:number,concepto:string,importe:number,rectificacion=false):void {
  this.gastoId=gastoId;
  this.manualGasto.set({gastoId,concepto,importe,rectificacion});
  this.manualCuotas.set([]);
  this.manualDialog.nativeElement.showModal();
 }
 cerrarManual():void {if(!this.busy())this.manualDialog.nativeElement.close();}
 montoManual(participacionId:number|null|undefined):number {
  return this.manualCuotas().find(x=>x.participacionId===participacionId)?.monto??0;
 }
 seleccionadoManual(participacionId:number|null|undefined):boolean {
  return this.manualCuotas().some(x=>x.participacionId===participacionId);
 }
 seleccionarManual(participacionId:number|null|undefined,checked:boolean):void {
  if(!participacionId)return;
  this.manualCuotas.set(checked?[...this.manualCuotas(),{participacionId,monto:0}]:this.manualCuotas().filter(x=>x.participacionId!==participacionId));
 }
 cambiarMontoManual(participacionId:number|null|undefined,value:number|string):void {
  if(!participacionId)return;
  this.manualCuotas.update(rows=>rows.map(x=>x.participacionId===participacionId?{...x,monto:Number(value)}:x));
 }
 confirmarRepartoManual():void {
  const g=this.manualGasto();if(!g||!this.manualValido()||this.busy())return;
  const solicitud=g.rectificacion
    ? this.api.rectificarReparto(g.gastoId,this.observacion.trim(),this.manualCuotas())
    : this.api.repartir(g.gastoId,this.manualCuotas());
  this.mutation(solicitud,g.rectificacion?'Reparto rectificado.':'Reparto manual propuesto.',()=>{
    this.manualDialog.nativeElement.close();this.manualGasto.set(null);
    this.observacion='';this.loadGastos();this.chooseGasto();
  });
 }
 async aprobarReparto():Promise<void> {if(!this.gastoId||this.busy())return;
  const r=await this.confirmDialog?.show({title:'Aprobar reparto',message:'Se confirmarán las cuotas del gasto.',confirmLabel:'Aprobar',tone:'primary'});
  if(!r?.confirmed)return;
  this.mutation(this.api.aprobarReparto(this.gastoId),'Reparto aprobado.',()=>{this.loadGastos();this.chooseGasto()});}
 async rectificarReparto():Promise<void> {if(!this.gastoId||!this.observacion.trim()||this.busy()||this.frozen())return;
  const gasto=this.gastos()?.gastos?.find(x=>x.gastoId===this.gastoId);
  if(gasto?.reglaCodigo==='MANUAL'){
    this.mostrarManual(this.gastoId,gasto.concepto??'Gasto',gasto.importe??0,true);
    return;
  }
  const r=await this.confirmDialog?.show({title:'Rectificar reparto',message:'Se creará una nueva versión del reparto.',confirmLabel:'Rectificar',tone:'warning'});
  if(!r?.confirmed)return;
  this.mutation(this.api.rectificarReparto(this.gastoId,this.observacion.trim()),'Reparto rectificado.',()=>{this.observacion='';this.loadGastos();this.chooseGasto()});}
 loadLiquidaciones():void {if(!this.campaignId||!this.canViewLiquidaciones())return;
  this.api.liquidaciones(this.campaignId).subscribe({next:d=>this.liquidaciones.set(d),error:e=>this.fail(e)});
 }
 async abrirGastoDocumentos(id:number,concepto:string):Promise<void> {
  if(!this.can('ARCHIVOS_CREAR')||this.frozen())return;
  const result=await this.uploader?.open({tipo:'GASTO',id,etiqueta:concepto});
  if(result?.saved)this.done('Comprobante registrado.');
 }
 verGasto(id:number):void {this.expenseDetail?.open(id);}
 generarDesdeTabla(participacionId:number):void {
  if(this.busy()||!this.can('LIQUIDACIONES_CREAR')||!this.puedeLiquidar()||this.gastosPendientes())return;
  const socio=this.tablero()?.socios?.find(s=>s.participacionId===participacionId);
  if(!socio||socio.liquidacionId||(socio.kilogramos??0)<=0)return;
  this.mutation(this.api.liquidar(participacionId),'Liquidación generada.',()=>this.loadLiquidaciones());
 }
 regenerarDesdeTabla(participacionId:number):void {
  const socio=this.tablero()?.socios?.find(s=>s.participacionId===participacionId);
  if(!socio?.liquidacionId||socio.requiereRegeneracion!==true||(socio.pagado??0)>0||
     !this.can('LIQUIDACIONES_CREAR')||!this.can('LIQUIDACIONES_EDITAR')||this.busy()||
     !this.puedeLiquidar()||this.gastosPendientes())return;
  this.mutation(this.api.liquidar(participacionId),'Liquidación actualizada.',()=>this.loadLiquidaciones());
 }
 async aprobarDesdeTabla(id:number):Promise<void> {
  if(!this.can('LIQUIDACIONES_APROBAR')||this.busy())return;
  const confirmado=await this.confirmDialog?.show({title:'Confirmar liquidación',message:'¿Confirmar importe calculado?',confirmLabel:'Confirmar',tone:'primary'});
  if(!confirmado?.confirmed)return;
  this.mutation(this.api.aprobarLiquidacion(id),'Liquidación aprobada.',()=>this.loadLiquidaciones());
 }
 async observarDesdeTabla(id:number):Promise<void> {
  if(!this.can('LIQUIDACIONES_EDITAR')||this.busy())return;
  const confirmado=await this.confirmDialog?.show({title:'Observar liquidación',message:'Registra el motivo.',confirmLabel:'Observar',tone:'warning',requiresReason:true,reasonLabel:'Motivo',minimumReasonLength:5});
  if(!confirmado?.confirmed||!confirmado.reason)return;
  this.mutation(this.api.observarLiquidacion(id,confirmado.reason),'Liquidación observada.',()=>this.loadLiquidaciones());
 }
 abrirCobroDocumentos(id:number):void {
  this.evidencia.set({tipo:'COBRO',id,etiqueta:'Comprobante del cobro'});
  this.evidenceDialog.nativeElement.showModal();
 }
 cerrarGastoDocumentos():void {this.evidenceDialog.nativeElement.close();this.evidencia.set(null);}
 abrirLiquidacion(participacionId:number,socio:string,liquidacionId:number|null=null,estado=''):void {
  if(!participacionId)return;
  this.modalTab.set('partidas');this.motivoRectificacion='';
  this.socioModal.set({participacionId,socio,liquidacionId,estado});
  this.entregas.set(null);this.entregasError.set(null);this.detalle.set(null);
  this.liquidacionDialog.nativeElement.showModal();
  this.extras.entregas(participacionId).subscribe({next:d=>this.entregas.set(d),
    error:e=>this.entregasError.set(mapOpenApiError(e).message)});
  if(liquidacionId)this.consultarLiquidacion(liquidacionId);
 }
 cerrarLiquidacion():void {if(!this.busy()){this.liquidacionDialog.nativeElement.close();this.socioModal.set(null);}}
 generarLiquidacion():void {
  const s=this.socioModal();
  if(!s||s.liquidacionId||this.busy()||!this.puedeLiquidar()||this.gastosPendientes()||!this.can('LIQUIDACIONES_CREAR')||!(this.entregas()?.partidas?.length ?? 0))return;
  this.mutation(this.api.liquidar(s.participacionId),'Liquidación generada.',d=>{
    if(d.liquidacionId){this.socioModal.set({...s,liquidacionId:d.liquidacionId,estado:d.estado??'CALCULADA'});
      this.updateDetalle(d);this.loadLiquidaciones();}
  });
 }
 regenerarLiquidacion():void {
  const socio=this.socioModal();
  if(!socio||socio.estado!=='OBSERVADA'||this.busy()||!this.puedeLiquidar()||this.gastosPendientes()||!this.can('LIQUIDACIONES_CREAR'))return;
  this.mutation(this.api.liquidar(socio.participacionId,this.motivoRectificacion.trim()||undefined),
   'Liquidación actualizada.',d=>{this.motivoRectificacion='';
    if(d.liquidacionId){this.socioModal.set({...socio,liquidacionId:d.liquidacionId,estado:d.estado??'CALCULADA'});
     this.updateDetalle(d);this.loadLiquidaciones();}
   });
 }
 liquidar(participacionId:number):void {
  const s=this.tablero()?.socios?.find(x=>x.participacionId===participacionId);
  if(s)this.abrirLiquidacion(participacionId,s.socio??'Socio',s.liquidacionId??null,s.liquidacionEstado??'');
 }
 openLiquidacion(id:number):void {
  const s=this.tablero()?.socios?.find(x=>x.liquidacionId===id);
  if(s?.participacionId){this.abrirLiquidacion(s.participacionId,s.socio??'Socio',id,s.liquidacionEstado??'');return;}
  this.liquidacionId=id;this.consultarLiquidacion(id);
 }
 private consultarLiquidacion(id:number):void {
  this.liquidacionId=id;
  this.api.liquidacion(id).subscribe({next:d=>this.updateDetalle(d),error:e=>this.fail(e)});
 }
 private updateDetalle(d:E5LiquidacionResponse):void {this.liquidacionId=d.liquidacionId??0;this.detalle.set(d);this.importePago=Math.max(0,d.saldo??0);
    this.referenciaPago='';this.medioPago='TRANSFERENCIA';}
 async aprobarLiquidacion():Promise<void> {if(!this.liquidacionId||this.busy())return;
  const r=await this.confirmDialog?.show({title:'Aprobar liquidación',message:'Se fijarán los importes aprobados.',confirmLabel:'Aprobar',tone:'primary'});
  if(!r?.confirmed)return;
  this.mutation(this.api.aprobarLiquidacion(this.liquidacionId),'Liquidación aprobada.',d=>{this.updateDetalle(d);this.loadLiquidaciones()});}
 observarLiquidacion():void {if(!this.liquidacionId||!this.observacion.trim())return;
  this.mutation(this.api.observarLiquidacion(this.liquidacionId,this.observacion.trim()),
    'Liquidación observada.',d=>{this.updateDetalle(d);this.observacion='';this.loadLiquidaciones()});}
 saldoCompleto():void {this.importePago=Math.max(0,this.detalle()?.saldo??0)}
 pagar():void {const d=this.detalle();if(this.gastosPendientes()||!d?.liquidacionId||!this.importePago||this.importePago<=0||this.importePago>(d.saldo??0))return;
  if(!confirm(`¿Confirmar pago de S/ ${this.importePago.toFixed(2)} al socio?`))return;
  const body={importe:this.importePago,medioPago:this.medioPago,referencia:this.referenciaPago.trim()||undefined};
  this.mutation(this.api.pagar(d.liquidacionId,body),'Pago confirmado.',x=>{this.updateDetalle(x);this.loadLiquidaciones();this.loadCobros()});
 }
 reversar(id:number):void {if(!this.observacion.trim()||!confirm('¿Reversar este pago? El registro se conservará.'))return;
  this.mutation(this.api.reversar(id,this.observacion.trim()),'Pago revertido.',d=>{
    this.updateDetalle(d);this.observacion='';this.loadLiquidaciones()});}
 loadCobros():void {if(!this.campaignId||!this.canViewCobros())return;
  this.api.cobros(this.campaignId).subscribe({next:d=>this.cobros.set(d),error:e=>this.fail(e)});
  this.extras.cobrosDetalle(this.campaignId).subscribe({next:d=>this.cobrosDetalle.set(d),error:e=>this.fail(e)});
 }
 async nuevoCobro():Promise<void> {
  if(this.busy()||!!this.tablero()?.cerrada||!this.can('COBROS_CREAR')||this.saldoRegistrable()<=0)return;
  const result=await this.cobroForm?.open(this.campaignId,0,this.compradorNombre(),this.saldoRegistrable());
  if(result?.saved){this.loadCobros();this.refresh();}
 }
 async confirmarCobroRegistrado(id:number):Promise<void> {
  if(this.busy()||!this.can('COBROS_CONFIRMAR'))return;
  const ok=await this.confirmDialog?.show({title:'Confirmar cobro',message:'Confirma que el importe fue recibido.',confirmLabel:'Confirmar',tone:'primary'});
  if(ok?.confirmed)this.mutation(this.confirmarCobro.execute(id),'Cobro confirmado.',()=>{this.loadCobros();});
 }
 async anularCobroRegistrado(id:number):Promise<void> {
  if(this.busy()||!this.can('COBROS_RETIRAR'))return;
  const ok=await this.confirmDialog?.show({title:'Anular cobro',message:'El registro quedará en el historial.',
    confirmLabel:'Anular',tone:'danger',requiresReason:true,reasonLabel:'Motivo',minimumReasonLength:5});
  if(ok?.confirmed&&ok.reason)this.mutation(this.anularCobro.execute(id,ok.reason),'Cobro anulado.',()=>{this.loadCobros();});
 }
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
