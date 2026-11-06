import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy,Component,OnInit,computed,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
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
import { E4Campaign,E4ClassificationLine,E4Delivery,E4Prebalance,E4Unit,E4Units,E4PesajeHistorial } from '../../../domain/e4.model';

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
  readonly eligible=signal<readonly CommercialOption[]>([]);
  readonly operations=signal<readonly CommercialOption[]>([]);
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
  readonly history=signal<E4PesajeHistorial|null>(null);
  eligibleSearch='';
  stockCount=0;
  stockReason='';
  retornoMotivo='';
  modoPesaje:'CONFIRMADO'|'PRELIMINAR'='CONFIRMADO';
  correctionUnit:E4Unit|null=null;
  correctionWeight:number|null=null;
  correctionTara:number|null=null;
  correctionReason='';
  correctionVariety=0;
  correctionCondition=0;
  campaignId=0;
  operationId=0;
  operativoSocioId=0;
  asignacionId=0;
  cupo=0;
  tara=0;
  cantidad=1;
  pesoBruto:number|null=null;
  variedadId=0;
  condicionId=0;
  vacias=0;
  precioNuevo:number|null=null;
  motivoSancion='';
  motivoCargo='';
  tarifa:number|null=null;
  pagination=1;
  pageSize=20;
  readonly selectedClassificationId=signal<number|null>(null);
  classificationLines:E4ClassificationLine[]=[];
  classificationReason='';
  readonly classificationUnit=computed(()=>this.assignment().unidades.find(u=>u.unidadId===this.selectedClassificationId()));
  nextUnit():E4Unit|undefined {
    const units=this.assignment().unidades.filter(u=>u.retorno==='PENDIENTE');
    return this.modoPesaje==='PRELIMINAR'
      ? units.find(u=>u.pesaje==='SIN_PESAJE'||u.pesaje==='ANULADA')
      : units.find(u=>u.pesaje==='PRELIMINAR')??units.find(u=>u.pesaje==='SIN_PESAJE'||u.pesaje==='ANULADA');
  }
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
    this.assignment.set(EMPTY_UNITS);this.assignments.set([]);this.partners.set([]);this.selectedPartners.set([]);this.selectedClassificationId.set(null);this.history.set(null);this.correctionUnit=null;this.eligible.set([]);this.operations.set([]);this.latestDelivery.set(null);
    this.variedadId=0;this.condicionId=0;
    if(!this.campaignId)return;
    this.refreshCampaign();}
  refreshCampaign(){if(!this.campaignId)return;this.e4.resumen(this.campaignId).subscribe({next:c=>{this.campaign.set(c);
    this.cupo=c.cupoJabas??0;this.tara=c.taraKg??0;this.stockCount=c.stockFisico??0;
    if(c.precios?.length===1){this.variedadId=c.precios[0].variedadId;this.condicionId=c.precios[0].condicionId;}
    },error:e=>this.fail(e)});
    this.e4.prebalance(this.campaignId).subscribe({next:b=>this.balance.set(b),error:e=>this.fail(e)});
    this.loadEligible();
    this.common.list('operations',1,100,{campaignId:this.campaignId}).subscribe({
      next:result=>this.operations.set(result.items.map(row=>({
        value:Number(row['operativoVentaId']),
        label:String(row['codigo']??'Operativo'),
      })).filter(option=>option.value>0)),error:e=>this.fail(e),
    });
  }
  private loadEligible(){
    if(!this.campaignId)return;
    this.e4.socios(this.campaignId).subscribe({
      next:result=>this.eligible.set(result.socios.map(s=>({
        value:s.socioAsociacionId,label:s.nombre,description:s.numeroDocumento,
      }))),error:e=>this.fail(e),
    });
  }
  changeOperation(){this.operativoSocioId=0;this.asignacionId=0;this.assignment.set(EMPTY_UNITS);this.assignments.set([]);
    if(!this.operationId){this.partners.set([]);return;}
    this.common.operationPartners(this.operationId).subscribe({next:rows=>this.partners.set(rows),error:e=>this.fail(e)});
    this.common.crateAssignmentOptions(this.operationId).subscribe({next:rows=>this.assignments.set(rows),error:e=>this.fail(e)});
  }
  selectAssignment(){this.latestDelivery.set(null);this.pagination=1;this.history.set(null);this.correctionUnit=null;
    this.assignment.set(EMPTY_UNITS);if(!this.asignacionId)return;
    this.e4.unidades(this.asignacionId).subscribe({next:result=>{
      this.assignment.set(result);
      const next=this.nextUnit();
      this.pesoBruto=next?.pesaje==='PRELIMINAR'?next.pesoBrutoKg??null:null;
    },error:e=>this.fail(e)});}
  setPartnerChecked(id:number,checked:boolean){const values=new Set(this.selectedPartners());if(checked)values.add(id);else values.delete(id);
    this.selectedPartners.set([...values]);}
  includeSelected(){if(!this.campaignId||this.selectedPartners().length===0||this.busy())return;
    const ids=[...this.selectedPartners()];this.busy.set(true);
    this.e4.incluirSocios(this.campaignId,ids).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:r=>{this.selectedPartners.set([]);this.done(`${r.incorporados} socios incorporados a campaña.`);this.loadEligible()},
      error:e=>this.fail(e),
    });
  }
  certifyStock(){
    if(!this.campaignId||this.stockCount<0||!Number.isInteger(this.stockCount)||!this.stockReason.trim()||this.busy())return;
    if(!confirm(`Certificar ${this.stockCount} jabas físicamente verificadas para esta UOT?`))return;
    this.run(()=>this.e4.stock(this.campaignId,this.stockCount,this.stockReason.trim()),
      'Stock certificado y registrado en historial.',()=>{this.stockReason='';this.refreshCampaign()});
  }
  configure(){if(!this.campaignId||this.cupo<1||this.tara<0||this.busy())return;
    this.run(()=>this.e4.configurar(this.campaignId,this.cupo,this.tara),'Configuración de campaña guardada.',()=>this.refreshCampaign());}
  assign(){if(!this.operativoSocioId||this.cantidad<1||this.busy())return;
    this.busy.set(true);this.e4.asignar(this.operativoSocioId,this.cantidad).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:r=>{this.asignacionId=r.asignacionId;this.done(`Se crearon ${r.unidades} unidades de control.`);
        this.changeOperationAfterAssign(r.asignacionId);this.refreshCampaign();},error:e=>this.fail(e)});}
  private changeOperationAfterAssign(id:number){this.common.crateAssignmentOptions(this.operationId).subscribe({
    next:rows=>this.assignments.set(rows),error:e=>this.fail(e)});this.asignacionId=id;this.selectAssignment();}
  weigh(){const next=this.nextUnit();if(!next||this.pesoBruto==null||this.pesoBruto<=this.tara||this.busy())return;
    const peso=this.pesoBruto;
    if(this.modoPesaje==='PRELIMINAR'){
      if(next.pesaje==='PRELIMINAR')return;
      this.run(()=>this.e4.prepesar(next.unidadId,peso),`Jaba ${next.numero}: peso preliminar registrado.`,
        ()=>this.selectAssignment());
      return;
    }
    if(!this.variedadId||!this.condicionId)return;
    this.run(()=>this.e4.pesar(next.unidadId,peso,this.variedadId,this.condicionId),
      `Jaba ${next.numero} confirmada.`,()=>{this.pesoBruto=null;this.selectAssignment();this.refreshCampaign()});
  }
  viewHistory(unit:E4Unit){this.correctionUnit=null;this.e4.historial(unit.unidadId).subscribe({
    next:result=>this.history.set(result),error:e=>this.fail(e),
  });}
  editWeight(unit:E4Unit){this.history.set(null);this.correctionUnit=unit;
    this.correctionWeight=unit.pesoBrutoKg??null;this.correctionTara=null;this.correctionReason='';
    this.correctionVariety=unit.variedadId??0;this.correctionCondition=unit.condicionId??0;
  }
  applyCorrection(){const u=this.correctionUnit;
    if(!u||this.correctionWeight==null||this.correctionWeight<=0||!this.correctionVariety||
      !this.correctionCondition||!this.correctionReason.trim()||this.busy())return;
    const request={pesoBrutoKg:this.correctionWeight,variedadId:this.correctionVariety,
      condicionId:this.correctionCondition,version:u.version,motivo:this.correctionReason.trim(),
      ...(this.correctionTara==null?{}:{taraExcepcionalKg:this.correctionTara})};
    if(!confirm(`Corregir el pesaje de la jaba ${u.numero}? La versión anterior permanecerá auditada.`))return;
    this.run(()=>this.e4.corregirPesaje(u.unidadId,request),'Pesaje corregido con historial.',
      ()=>{this.correctionUnit=null;this.selectAssignment()});
  }
  annulWeight(){const u=this.correctionUnit;
    if(!u||!this.correctionReason.trim()||this.busy())return;
    if(!confirm(`Anular el pesaje de jaba ${u.numero} conservando su historial?`))return;
    this.run(()=>this.e4.anularPesaje(u.unidadId,u.version,this.correctionReason.trim()),
      'Pesaje anulado; la jaba sigue identificada.',()=>{this.correctionUnit=null;this.selectAssignment()});
  }
  editClassification(unit:E4Unit){
    this.selectedClassificationId.set(unit.unidadId);
    const lines=unit.clasificaciones?.length?unit.clasificaciones:[{
      numero:1,pesoKg:unit.pesoNetoKg??0,rechazada:false,
      variedadId:unit.variedadId,condicionId:unit.condicionId,
    }];
    this.classificationLines=lines.map(line=>({pesoKg:line.pesoKg,rechazada:line.rechazada,
      variedadId:line.variedadId,condicionId:line.condicionId}));
    this.classificationReason='';
  }
  addClassificationLine(){if(this.classificationLines.length>=10)return;
    const unit=this.classificationUnit();this.classificationLines.push({pesoKg:0,rechazada:false,
      variedadId:unit?.variedadId??this.variedadId,condicionId:unit?.condicionId??this.condicionId});
    this.classificationLines=[...this.classificationLines];
  }
  removeClassificationLine(index:number){if(this.classificationLines.length<=1)return;
    this.classificationLines=this.classificationLines.filter((_,i)=>i!==index);
  }
  classificationValid(){const unit=this.classificationUnit();
    if(!unit||!this.classificationReason.trim()||this.classificationLines.length<1||this.classificationLines.length>10)return false;
    if(this.classificationLines.some(l=>!Number.isFinite(l.pesoKg)||l.pesoKg<=0||
      (!l.rechazada&&(!l.variedadId||!l.condicionId))))return false;
    return Math.round(this.classificationLines.reduce((n,l)=>n+l.pesoKg,0)*1000)===Math.round((unit.pesoNetoKg??-1)*1000);
  }
  saveClassification(){const id=this.selectedClassificationId();if(id==null||!this.classificationValid()||this.busy())return;
    this.run(()=>this.e4.clasificar(id,this.classificationLines,this.classificationReason.trim()),
      'Clasificación de jaba registrada.',()=>{this.selectedClassificationId.set(null);this.selectAssignment();this.refreshCampaign()});
  }
  returnCrates(){if(!confirm('Confirmar el retorno físico declarado? No se imputarán pesos inexistentes.'))return;const llenas=this.weighed();if(!this.asignacionId||this.vacias<0||llenas+this.vacias>this.assignment().asignadas||!this.canReturn()||this.busy())return;
    this.busy.set(true);this.e4.devolver(this.asignacionId,llenas,this.vacias).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:r=>{this.done(`${r.llenas} llenas, ${r.vacias} vacías y ${r.faltantes} faltantes.`);this.selectAssignment();this.refreshCampaign()},error:e=>this.fail(e)});}
  confirm(){if(!this.asignacionId||this.busy())return;if(!confirm('Confirmar definitivamente los kilos clasificados de esta entrega?'))return;this.busy.set(true);
    this.e4.confirmar(this.asignacionId).pipe(finalize(()=>this.busy.set(false))).subscribe({next:d=>{
      this.latestDelivery.set(d);this.done(`Entrega #${d.entregaId} confirmada (${d.kilosAceptados} kg).`);
      this.selectAssignment();this.refreshCampaign();},error:e=>this.fail(e)});}
  validateReturn(){
    if(!this.asignacionId||this.assignment().devueltas<=0||this.busy())return;
    if(!confirm('Validar que las jabas retornadas fueron recibidas e inspeccionadas físicamente?'))return;
    this.run(()=>this.e4.validarRetorno(this.asignacionId,this.retornoMotivo.trim()),
      'Retorno validado; stock disponible actualizado.',()=>{this.retornoMotivo='';this.selectAssignment();this.refreshCampaign()});
  }
  sanction(){const id=this.latestDelivery()?.entregaId??this.assignment().unidades.find(u=>u.entregaId)?.entregaId;
    if(!id||this.precioNuevo==null||!this.motivoSancion.trim()||this.busy())return;
    this.run(()=>this.e4.sancionar(id,this.precioNuevo!,this.motivoSancion.trim(),
      this.condicionId||undefined,this.variedadId||undefined),
      'Sanción particular registrada.',()=>this.refreshCampaign());}
  saveTariff(){if(!this.campaignId||this.tarifa==null||this.tarifa<0||this.busy())return;
    this.run(()=>this.e4.tarifa(this.campaignId,this.tarifa!),'Tarifa versionada.',()=>this.refreshCampaign());}
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
  eligibleOperations(){return this.operations()}
  eligiblePartners():readonly CommercialOption[]{const q=this.eligibleSearch.trim().toLocaleLowerCase();
    return q?this.eligible().filter(p=>`${p.label} ${p.description??''}`.toLocaleLowerCase().includes(q)):this.eligible()}
  priceOptions(){return this.campaign()?.precios??[]}
  assignmentReturned(){return this.assignment().unidades.some(u=>u.retorno!=='PENDIENTE')}
  unitLabel(u:E4Unit){return `Jaba ${u.numero}`}
}
