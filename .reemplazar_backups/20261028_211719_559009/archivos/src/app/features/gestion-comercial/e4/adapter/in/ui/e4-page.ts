import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component,OnInit,computed,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { concatMap,finalize,from,toArray } from 'rxjs';
import { PermissionDirective } from '../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { EmptyStateComponent } from '../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../shared/data-display/paginator/paginator';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';
import { CommercialApiService,CommercialOption,CommercialReferences } from '../../../../shared/commercial-api.service';
import { E4UseCase } from '../../../application/use-case/e4.use-case';
import { E4Campaign,E4Delivery,E4Prebalance,E4Unit,E4Units } from '../../../domain/e4.model';

const EMPTY:CommercialReferences={associations:[],buyers:[],producers:[],properties:[],campaigns:[],operations:[],conditions:[],varieties:[],salesModalities:[],zones:[]};
const EMPTY_UNITS:E4Units={asignacionId:0,asignadas:0,pesadas:0,devueltas:0,faltantes:0,unidades:[]};
@Component({
  selector:'app-apappss-e4',standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,PermissionDirective,PageHeaderComponent,
    LoadingStateComponent,ErrorStateComponent,EmptyStateComponent,PaginatorComponent],
  templateUrl:'./e4-page.html',styleUrl:'./e4-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class E4Page implements OnInit {
  private readonly e4=inject(E4UseCase);
  private readonly common=inject(CommercialApiService);
  private readonly toast=inject(ToastService);
  readonly refs=signal<CommercialReferences>(EMPTY);
  readonly partners=signal<readonly CommercialOption[]>([]);
  readonly assignments=signal<readonly CommercialOption[]>([]);
  readonly campaign=signal<E4Campaign|null>(null);
  readonly assignment=signal<E4Units>(EMPTY_UNITS);
  readonly balance=signal<E4Prebalance|null>(null);
  readonly busy=signal(false);
  readonly loading=signal(true);
  readonly error=signal<string|null>(null);
  readonly selectedPartners=signal<readonly number[]>([]);
  readonly latestDelivery=signal<E4Delivery|null>(null);
  readonly lastMessage=signal('');
  campaignId=0;
  operationId=0;
  operativoSocioId=0;
  asignacionId=0;
  cupo=3000;
  tara=0.140;
  cantidad=40;
  pesoBruto:number|null=null;
  variedadId=0;
  condicionId=0;
  vacias=0;
  precioNuevo:number|null=null;
  motivoSancion='';
  motivoCargo='';
  tarifa=25;
  pagination=1;
  pageSize=20;
  readonly nextUnit=computed(()=>this.assignment().unidades.find(u=>u.pesaje==='SIN_PESAJE'&&u.retorno==='PENDIENTE'));
  readonly displayed=computed(()=>this.assignment().unidades.slice((this.pagination-1)*this.pageSize,this.pagination*this.pageSize));
  readonly totalPages=computed(()=>Math.max(1,Math.ceil(this.assignment().unidades.length/this.pageSize)));
  readonly weighed=computed(()=>this.assignment().unidades.filter(u=>u.pesaje==='PESADA').length);
  readonly totalNet=computed(()=>this.assignment().unidades.reduce((a,b)=>a+(b.pesoNetoKg??0),0));
  readonly canReturn=computed(()=>this.assignment().asignadas>0&&this.assignment().devueltas===0&&this.assignment().faltantes===0);

  ngOnInit(){this.common.references().pipe(finalize(()=>this.loading.set(false))).subscribe({
    next:refs=>{this.refs.set(refs);if(refs.campaigns.length===1){this.campaignId=refs.campaigns[0].value;this.changeCampaign()}},
    error:e=>this.fail(e),
  });}
  private fail(e:unknown){const msg=mapOpenApiError(e).message||'No se pudo completar la acción.';this.error.set(msg);this.toast.error('Operación no completada',msg)}
  private done(text:string){this.error.set(null);this.lastMessage.set(text);this.toast.success(text)}
  changeCampaign(){this.campaign.set(null);this.balance.set(null);this.operationId=0;this.operativoSocioId=0;this.asignacionId=0;
    this.assignment.set(EMPTY_UNITS);this.assignments.set([]);this.partners.set([]);this.selectedPartners.set([]);
    if(!this.campaignId)return;
    this.refreshCampaign();}
  refreshCampaign(){if(!this.campaignId)return;this.e4.resumen(this.campaignId).subscribe({next:c=>{this.campaign.set(c);
    this.cupo=c.cupoJabas??3000;this.tara=c.taraKg??0.140;},error:e=>this.fail(e)});
    this.e4.prebalance(this.campaignId).subscribe({next:b=>this.balance.set(b),error:e=>this.fail(e)});
  }
  changeOperation(){this.operativoSocioId=0;this.asignacionId=0;this.assignment.set(EMPTY_UNITS);this.assignments.set([]);
    if(!this.operationId){this.partners.set([]);return;}
    this.common.operationPartners(this.operationId).subscribe({next:rows=>this.partners.set(rows),error:e=>this.fail(e)});
    this.common.crateAssignmentOptions(this.operationId).subscribe({next:rows=>this.assignments.set(rows),error:e=>this.fail(e)});
  }
  selectAssignment(){this.pagination=1;this.assignment.set(EMPTY_UNITS);if(!this.asignacionId)return;
    this.e4.unidades(this.asignacionId).subscribe({next:result=>this.assignment.set(result),error:e=>this.fail(e)});}
  setPartnerChecked(id:number,checked:boolean){const values=new Set(this.selectedPartners());if(checked)values.add(id);else values.delete(id);
    this.selectedPartners.set([...values]);}
  includeSelected(){if(!this.campaignId||this.selectedPartners().length===0||this.busy())return;
    const ids=[...this.selectedPartners()];this.busy.set(true);
    from(ids).pipe(concatMap(id=>this.common.includeParticipant({campaniaVentaId:this.campaignId,socioAsociacionId:id})),
      toArray(),finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.selectedPartners.set([]);this.done(`${ids.length} socios incorporados a campaña.`)},error:e=>this.fail(e)});
  }
  configure(){if(!this.campaignId||this.cupo<1||this.tara<0||this.busy())return;
    this.run(()=>this.e4.configurar(this.campaignId,this.cupo,this.tara),'Configuración de campaña guardada.',()=>this.refreshCampaign());}
  assign(){if(!this.operativoSocioId||this.cantidad<1||this.busy())return;
    this.busy.set(true);this.e4.asignar(this.operativoSocioId,this.cantidad).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:r=>{this.asignacionId=r.asignacionId;this.done(`Se crearon ${r.unidades} unidades de control.`);
        this.changeOperationAfterAssign(r.asignacionId);this.refreshCampaign();},error:e=>this.fail(e)});}
  private changeOperationAfterAssign(id:number){this.common.crateAssignmentOptions(this.operationId).subscribe({
    next:rows=>this.assignments.set(rows),error:e=>this.fail(e)});this.asignacionId=id;this.selectAssignment();}
  weigh(){const next=this.nextUnit();if(!next||this.pesoBruto==null||this.pesoBruto<=this.tara||!this.variedadId||!this.condicionId||this.busy())return;
    this.run(()=>this.e4.pesar(next.unidadId,this.pesoBruto!,this.variedadId,this.condicionId),
      `Jaba ${next.numero} pesada correctamente.`,()=>{this.pesoBruto=null;this.selectAssignment()});}
  returnCrates(){const llenas=this.weighed();if(!this.asignacionId||this.vacias<0||llenas+this.vacias>this.assignment().asignadas||!this.canReturn()||this.busy())return;
    this.busy.set(true);this.e4.devolver(this.asignacionId,llenas,this.vacias).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:r=>{this.done(`${r.llenas} llenas, ${r.vacias} vacías y ${r.faltantes} faltantes.`);this.selectAssignment();this.refreshCampaign()},error:e=>this.fail(e)});}
  confirm(){if(!this.asignacionId||this.busy())return;this.busy.set(true);
    this.e4.confirmar(this.asignacionId).pipe(finalize(()=>this.busy.set(false))).subscribe({next:d=>{
      this.latestDelivery.set(d);this.done(`Entrega #${d.entregaId} confirmada (${d.kilosAceptados} kg).`);
      this.selectAssignment();this.refreshCampaign();},error:e=>this.fail(e)});}
  sanction(){const id=this.latestDelivery()?.entregaId??this.assignment().unidades.find(u=>u.entregaId)?.entregaId;
    if(!id||this.precioNuevo==null||!this.motivoSancion.trim()||this.busy())return;
    this.run(()=>this.e4.sancionar(id,this.precioNuevo!,this.motivoSancion.trim(),
      this.condicionId||undefined,this.variedadId||undefined),
      'Sanción particular registrada.',()=>this.refreshCampaign());}
  saveTariff(){if(!this.campaignId||this.tarifa<0||this.busy())return;
    this.run(()=>this.e4.tarifa(this.campaignId,this.tarifa),'Tarifa versionada.',()=>this.refreshCampaign());}
  validateMissing(){if(!this.asignacionId||this.assignment().faltantes<=0||!this.motivoCargo.trim()||this.busy())return;
    this.run(()=>this.e4.confirmarFaltantes(this.asignacionId,this.motivoCargo.trim()),
      'Incidencia de jabas faltantes confirmada.',()=>this.selectAssignment());}
  charge(){if(!this.asignacionId||this.assignment().faltantes<=0||!this.motivoCargo.trim()||this.busy())return;
    this.run(()=>this.e4.cargo(this.asignacionId,this.motivoCargo.trim()),
      'Cargo por faltantes autorizado.',()=>this.refreshCampaign());}
  private run<T>(fn:()=>import('rxjs').Observable<T>,message:string,refresh:()=>void){this.busy.set(true);this.error.set(null);
    fn().pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.done(message);refresh()},error:e=>this.fail(e)});}
  selectPage(value:number){this.pagination=value;}
  selectPageSize(value:number){this.pageSize=value;this.pagination=1;}
  number(value:number|undefined){return (value??0).toLocaleString('es-PE',{maximumFractionDigits:3})}
  money(value:number|undefined){return (value??0).toLocaleString('es-PE',{style:'currency',currency:'PEN'})}
  isPartnerSelected(id:number){return this.selectedPartners().includes(id)}
  eligibleOperations(){return this.refs().operations}
  eligiblePartners():readonly CommercialOption[]{return this.refs().producers}
  priceOptions(){return this.campaign()?.precios??[]}
  assignmentReturned(){return this.assignment().unidades.some(u=>u.retorno!=='PENDIENTE')}
  unitLabel(u:E4Unit){return `Jaba ${u.numero}`}
}
