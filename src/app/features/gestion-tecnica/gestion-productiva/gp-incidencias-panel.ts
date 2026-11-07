import { ResourceDatePipe } from '../../../shared/formatting/resource-date.pipe';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faEye, faEyeSlash, faPen, faTrash, faMagnifyingGlass, faXmark, faPrescriptionBottleMedical } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { GpActividadResponse } from '../../../infrastructure/openapi/generated/model/gpActividadResponse';
import { GpCatalogoResponse } from '../../../infrastructure/openapi/generated/model/gpCatalogoResponse';
import { GpIncidenciaResponse, GpIncidenciaRevisionResponse, GpTratamientoSeguimientoResponse } from '../../../infrastructure/openapi/generated/api/gestionProductivaGeneral.service';
import { GpGeneralFacade } from './gp-general.facade';
import { DataTableComponent } from '../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';

@Component({selector:'app-gp-incidencias-panel',standalone:true,
 imports: [ResourceDatePipe,RecordCardComponent, FormsModule,RouterLink,DatePipe,FaIconComponent,PermissionDirective,DataTableComponent,PaginatorComponent,EmptyStateComponent,ActionConfirmDialogComponent],templateUrl:'./gp-incidencias-panel.html',styleUrl:'./gestion-productiva.css',
 changeDetection:ChangeDetectionStrategy.OnPush})
export class GpIncidenciasPanel implements OnChanges {
 readonly viewIcon=faEye;
 readonly hideIcon=faEyeSlash;
 readonly editIcon=faPen;
 readonly deleteIcon=faTrash;
 readonly completeIcon=faCheck;
 readonly treatmentIcon=faPrescriptionBottleMedical;
 readonly searchIcon=faMagnifyingGlass;
 readonly closeIcon=faXmark;
 @ViewChild('formDialog') private readonly formDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild(ActionConfirmDialogComponent) private readonly confirmDialog!:ActionConfirmDialogComponent;
 @Input({required:true}) actividad!:GpActividadResponse;
 @Input() modo:'lista'|'detalle'='lista';
 @Input() incidenciaSeleccionadaId:number|null=null;
 @Input({required:true}) catalogos:GpCatalogoResponse[]=[];
 @Output() changed=new EventEmitter<void>();
 private readonly gp=inject(GpGeneralFacade);
 private readonly uot=inject(UotContextStore);
 private readonly permissions=inject(PermissionService);
 private readonly toast=inject(ToastService);
 readonly revisions=signal<GpIncidenciaRevisionResponse[]>([]);
 readonly loading=signal(false);readonly saving=signal(false);readonly error=signal<string|null>(null);
 readonly incidencias=signal<GpIncidenciaResponse[]>([]);
 readonly tratamientos=signal<GpTratamientoSeguimientoResponse[]>([]);
 readonly abiertas=computed(()=>this.incidencias().filter(i=>i.estado==='ABIERTA').length);
 readonly view=signal<'tabla'|'tarjetas'>('tabla');
 readonly treatmentView=signal<'tabla'|'tarjetas'>('tabla');
 readonly selectedIncidence=signal<number|null>(null);
 incidenceSearchInput=''; treatmentSearchInput='';
 readonly incidenceSearch=signal('');
 readonly treatmentSearch=signal('');
 readonly revisionView=signal<'tabla'|'tarjetas'>('tabla');
 readonly revisionSearch=signal('');
 revisionSearchInput='';
 applyRevisionSearch():void{this.revisionSearch.set(this.revisionSearchInput.trim());}
 readonly filteredRevisions=computed(()=>{const q=this.revisionSearch().toLocaleLowerCase('es-PE');return this.revisions().filter(x=>!q||[x.revisionId,x.accion,x.fechaRegistro,x.motivo,x.descripcionAnterior,x.descripcionNueva].some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(q)));});
 readonly filteredIncidences=computed(()=>{
   const term=this.incidenceSearch().trim().toLocaleLowerCase('es-PE');
   return this.incidencias().filter(i=>!term||[i.incidenciaId,i.problema,i.descripcion,i.estado,i.fechaRegistro,i.descripcionCierre]
     .some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(term)));
 });
 readonly page=signal(1);readonly size=signal(10);
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.filteredIncidences().length/this.size())));
 readonly visible=computed(()=>this.filteredIncidences().slice((this.page()-1)*this.size(),this.page()*this.size()));
 readonly selected=computed(()=>this.incidencias().find(i=>i.incidenciaId===this.selectedIncidence())??null);
 readonly filteredTreatments=computed(()=>{
   const id=this.selectedIncidence();const term=this.treatmentSearch().trim().toLocaleLowerCase('es-PE');
   return this.tratamientos().filter(t=>t.incidenciaId===id && (!term||
     [t.eventoId,t.tratamiento,t.descripcion,t.descripcionCierre,t.fechaInicio,t.fechaFinReal]
     .some(v=>String(v??'').toLocaleLowerCase('es-PE').includes(term))));
 });
 readonly revisionColumns:readonly DataTableColumn<GpIncidenciaRevisionResponse>[]=[
  {key:'revisionId',label:'Revisión',format:v=>`#${v}`},
  {key:'accion',label:'Acción'},
  {key:'fechaRegistro',label:'Fecha',format:v=>this.fechaHora(v)},
  {key:'descripcionAnterior',label:'Antes',format:v=>String(v??'—')},
  {key:'descripcionNueva',label:'Después',format:v=>String(v??'—')},
  {key:'motivo',label:'Motivo'},
  {key:'usuarioId',label:'Técnico',format:v=>`#${v}`},
 ];
 readonly incidenceColumns:readonly DataTableColumn<GpIncidenciaResponse>[]=[
  {key:'incidenciaId',label:'ID',format:v=>`#${v}`},
  {key:'problema',label:'Enfermedad / plaga'},
  {key:'fechaRegistro',label:'Registro',format:v=>this.fechaHora(v)},
  {key:'afectacion',label:'Afectación',value:i=>this.medida(i.afectadaM2,i.afectadosAnimales)},
  {key:'estado',label:'Estado',format:v=>v==='ABIERTA'?'En seguimiento':'Cerrada'},
  {key:'tratamientos',label:'Tratamientos',value:i=>this.eventosDe(i.incidenciaId).length},
  {key:'acciones',label:'Acciones',align:'right'},
 ];
 readonly treatmentColumns:readonly DataTableColumn<GpTratamientoSeguimientoResponse>[]=[
  {key:'eventoId',label:'ID',format:v=>`#${v}`},
  {key:'tratamiento',label:'Tratamiento'},
  {key:'fechaInicio',label:'Inicio',format:v=>this.fechaHora(v)},
  {key:'fechaFinPrevista',label:'Fin previsto',format:v=>v?this.fechaHora(v):'—'},
  {key:'fechaFinReal',label:'Estado',format:v=>v?'Finalizado':'En curso'},
  {key:'usuarioId',label:'Técnico',format:v=>`#${v}`},
  {key:'acciones',label:'Acciones',align:'right'},
 ];
 fechaHora(value:unknown):string {
  if(!value)return '—';
  const raw=String(value);
  const normalized=!/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)?raw+'Z':raw;
  return new Date(normalized).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short',timeZone:'America/Lima'});
 }
 medida(superficie?:number|null,animales?:number|null):string{
  return this.actividad.rubro==='CULTIVO'?(superficie==null?'—':`${superficie} m²`):(animales==null?'—':`${animales} animales`);
 }
 resultado(i:GpIncidenciaResponse):string{
  if(i.estado==='ABIERTA')return 'En seguimiento';
  return i.resultado==='RECUPERADA'?'Recuperación':i.resultado==='PERDIDA_TOTAL'?'Pérdida total':i.resultado==='PERDIDA_PARCIAL'?'Pérdida parcial':i.resultado||'Cerrada';
 }
 applyIncidenceSearch():void{this.incidenceSearch.set(this.incidenceSearchInput.trim());this.page.set(1);}
 applyTreatmentSearch():void{this.treatmentSearch.set(this.treatmentSearchInput.trim());}
 private loadRevisions(id:number):void {
   const u=this.uot.selectedId();if(!u)return;
   this.revisions.set([]);
   this.gp.revisionesIncidencia(u,id).subscribe({
     next:items=>{if(this.selectedIncidence()===id)this.revisions.set(items);},
     error:e=>this.error.set(mapOpenApiError(e).message),
   });
 }
 closeDetail():void{
   this.selectedIncidence.set(null);this.revisions.set([]);
   this.treatmentSearchInput='';this.treatmentSearch.set('');
 }
 can(code:string):boolean{return this.permissions.has(code);}
 async retirar(i:GpIncidenciaResponse):Promise<void>{
   const u=this.uot.selectedId();if(!u||this.saving()||i.estado!=='ABIERTA'||!this.can('SANIDAD_RETIRAR'))return;
   const answer=await this.confirmDialog.show({title:'Retirar incidencia',
     message:`Se ocultará la incidencia #${i.incidenciaId} y sus tratamientos de las consultas normales. El historial técnico conservará el motivo y la auditoría.`,
     tone:'danger',confirmLabel:'Retirar incidencia',requiresReason:true,minimumReasonLength:3,
     maximumReasonLength:1000,reasonLabel:'Motivo de retiro'});
   if(!answer.confirmed||!answer.reason)return;
   this.saving.set(true);this.error.set(null);
   this.gp.retirarIncidencia(u,i.incidenciaId,answer.reason).pipe(finalize(()=>this.saving.set(false))).subscribe({
     next:()=>{this.toast.success('Incidencia retirada lógicamente');this.closeDetail();this.load();this.changed.emit();},
     error:e=>this.error.set(mapOpenApiError(e).message)});
 }

 setPage(page:number):void{if(page>=1&&page<=this.pages())this.page.set(page);}
 setSize(size:number):void{this.size.set(size);this.page.set(1);} 
 form:'ninguno'|'incidencia'|'editar'|'tratamiento'|'cerrar'|'finalizar'='ninguno';
 motivo='';
 incidenciaId:number|null=null;eventoTratamientoId:number|null=null;problemaId=0;tratamientoId=0;
 afectacion:number|null=null;perdida:number|null=null;descripcion='';fechaFinPrevista='';
 ngOnChanges():void{this.closeForm();this.closeDetail();this.page.set(1);this.incidenceSearchInput='';this.incidenceSearch.set('');if(this.actividad?.actividadId)this.load();}
 reset():void{this.form='ninguno';this.incidenciaId=null;this.eventoTratamientoId=null;this.problemaId=0;this.tratamientoId=0;
  this.afectacion=null;this.perdida=null;this.descripcion='';this.fechaFinPrevista='';this.motivo='';this.error.set(null);}
 problemas(){const a=this.actividad;return this.catalogos.filter(x=>x.tipo===(a.rubro==='CULTIVO'?'PROBLEMA_CULTIVO':'PROBLEMA_CRIANZA')
 && x.padreId===(a.rubro==='CULTIVO'?a.cultivoId:a.especieId));}
 tratamientosDe(id:number){const problemas=this.incidencias().find(i=>i.incidenciaId===id)?.problemaId;
  const ids=this.catalogos.filter(x=>x.tipo==='RELACION' && x.padreId===problemas).map(x=>x.id);
  return this.catalogos.filter(x=>x.tipo==='TRATAMIENTO' && ids.includes(x.id));}
 eventosDe(id:number){return this.tratamientos().filter(x=>x.incidenciaId===id);}
 open(form:typeof this.form,id:number|null=null):void{
  this.reset();this.form=form;if(form==='finalizar')this.eventoTratamientoId=id;
  else this.incidenciaId=id;
  if(form==='editar'&&id){const i=this.incidencias().find(x=>x.incidenciaId===id);
    if(i){this.problemaId=i.problemaId;this.afectacion=this.actividad.rubro==='CULTIVO'?(i.afectadaM2??null):(i.afectadosAnimales??null);this.descripcion=i.descripcion;}
  }
  this.formDialog?.nativeElement.showModal();
 }
 closeForm():void{if(this.saving())return;this.formDialog?.nativeElement.close();this.reset();}
 load():void{const u=this.uot.selectedId();if(!u)return;this.loading.set(true);
  forkJoin({incidencias:this.gp.incidencias(u,this.actividad.actividadId),tratamientos:this.gp.tratamientosIncidencias(u,this.actividad.actividadId)})
  .pipe(finalize(()=>this.loading.set(false))).subscribe({next:x=>{this.incidencias.set(x.incidencias);this.tratamientos.set(x.tratamientos);
     this.page.set(Math.min(this.page(),this.pages()));
     if(this.modo==='detalle'&&this.incidenciaSeleccionadaId!=null){
       const found=x.incidencias.some(i=>i.incidenciaId===this.incidenciaSeleccionadaId);
       this.selectedIncidence.set(found?this.incidenciaSeleccionadaId:null);
       if(found)this.loadRevisions(this.incidenciaSeleccionadaId);
     }else if(this.selectedIncidence()&&!x.incidencias.some(i=>i.incidenciaId===this.selectedIncidence()))this.closeDetail();},
   error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 registrar():void{
  const u=this.uot.selectedId();if(!u||this.saving())return;const obs=this.descripcion.trim();
  if(obs.length<3){this.error.set('Describe el procedimiento o resultado con al menos 3 caracteres.');return;}
  const a=this.actividad;let action;
  if(this.form==='incidencia'||this.form==='editar'){
   if(!this.problemas().some(x=>x.id===this.problemaId)||!Number.isFinite(this.afectacion)||this.afectacion===null||this.afectacion<=0){
     this.error.set('Seleccione la enfermedad e indique la afectación exacta.');return;
   }
   const max=a.rubro==='CULTIVO'?a.superficieExactaM2:a.cantidadExacta;
   if((max??0)<this.afectacion || (a.rubro==='CRIANZA'&&!Number.isInteger(this.afectacion))){this.error.set('La afectación supera la cantidad vigente.');return;}
   const body={problemaId:this.problemaId,descripcion:obs,
    afectadaM2:a.rubro==='CULTIVO'?this.afectacion:null,afectadosAnimales:a.rubro==='CRIANZA'?this.afectacion:null};
   if(this.form==='editar'){
     if(!this.incidenciaId||this.motivo.trim().length<3){this.error.set('Indica por qué corriges la incidencia.');return;}
     action=this.gp.editarIncidencia(u,this.incidenciaId,{...body,motivo:this.motivo.trim()});
   }else action=this.gp.registrarIncidencia(u,a.actividadId,body);
  }else if(this.form==='tratamiento'){
   if(!this.incidenciaId||!this.tratamientosDe(this.incidenciaId).some(x=>x.id===this.tratamientoId)){
     this.error.set('Seleccione un tratamiento vinculado a esta enfermedad.');return;
   }
   const fecha=this.fechaFinPrevista?new Date(this.fechaFinPrevista):null;
   if(fecha && (Number.isNaN(fecha.getTime())||fecha.getTime()<=Date.now())){
      this.error.set('La fecha prevista debe ser posterior a la fecha actual.');return;
   }
   action=this.gp.aplicarTratamiento(u,a.actividadId,{incidenciaId:this.incidenciaId,tratamientoId:this.tratamientoId,
    descripcion:obs,fechaFinPrevista:fecha?fecha.toISOString().replace('Z',''):null});
  }else if(this.form==='finalizar'){
   if(!this.eventoTratamientoId)return;action=this.gp.finalizarTratamiento(u,this.eventoTratamientoId,obs);
  }else if(this.form==='cerrar'){
   const i=this.incidencias().find(x=>x.incidenciaId===this.incidenciaId);
   if(!i||this.perdida===null||!Number.isFinite(this.perdida)||this.perdida<0||
     (a.rubro==='CRIANZA'&&!Number.isInteger(this.perdida))||
     this.perdida>(a.rubro==='CULTIVO'?(i.afectadaM2??0):(i.afectadosAnimales??0))){
    this.error.set('Indique la pérdida exacta, sin superar la afectación inicial.');return;
   }
   action=this.gp.cerrarIncidencia(u,i.incidenciaId,{perdidaM2:a.rubro==='CULTIVO'?this.perdida:null,
     perdidosAnimales:a.rubro==='CRIANZA'?this.perdida:null,descripcion:obs});
  }else return;
  this.saving.set(true);this.error.set(null);action.pipe(finalize(()=>this.saving.set(false))).subscribe({
   next:()=>{this.saving.set(false);const id=this.selectedIncidence();this.closeForm();this.load();this.changed.emit();if(id){const u=this.uot.selectedId();if(u)this.gp.revisionesIncidencia(u,id).subscribe({next:rows=>this.revisions.set(rows)});}},error:e=>this.error.set(mapOpenApiError(e).message)});
 }
}
