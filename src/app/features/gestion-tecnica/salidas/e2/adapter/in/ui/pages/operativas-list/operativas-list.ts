import { RecordCardComponent } from '../../../../../../../../../shared/data-display/record-card/record-card';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, ElementRef, AfterViewInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faRoute, faPlus, faMagnifyingGlass, faRotate, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { PaginatorComponent } from '../../../../../../../../../shared/data-display/paginator/paginator';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../../../shared/data-display/empty-state/empty-state';
import { PermissionDirective } from '../../../../../../../../../core/access/permission.directive';
import { ResumenE2, CatalogosE2, DetalleE2 } from '../../../../../domain/salida-operativa.model';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
@Component({selector:'app-operativas-list',standalone:true,
 imports: [RecordCardComponent, DatePipe,FormsModule,RouterLink,FaIconComponent,PageHeaderComponent,ActionConfirmDialogComponent,PaginatorComponent,
   LoadingStateComponent,ErrorStateComponent,EmptyStateComponent,PermissionDirective],
 providers:[...provideSalidasE2()],templateUrl:'./operativas-list.html',styleUrl:'./operativas-list.css',
 changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativasListPage implements OnInit, AfterViewInit {
 @ViewChild('createDialog') createDialog!:ElementRef<HTMLDialogElement>;
 @ViewChild(ActionConfirmDialogComponent) confirm!:ActionConfirmDialogComponent;
 private readonly api=inject(SalidasE2UseCase);
 private readonly toast=inject(ToastService);
 private readonly uot=inject(UotContextStore);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 readonly icon=faRoute;readonly viewIcon=faEye;readonly addIcon=faPlus;readonly editIcon=faPen;readonly trashIcon=faTrash;
 readonly searchIcon=faMagnifyingGlass;readonly refreshIcon=faRotate;
 readonly items=signal<ResumenE2[]>([]);readonly total=signal(0);
 readonly pendingCount=signal(0);readonly loading=signal(false);
 readonly error=signal<string|null>(null);
 readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||undefined;
 readonly uotId=this.uot.selectedId;
 vista:'tabla'|'tarjetas'='tabla';estado='';page=1;size=20;buscar='';busqueda='';
 readonly catalogos=signal<CatalogosE2>({motivos:[],tiposVisita:[],bienes:[],participantes:[]});
 readonly creating=signal(false);readonly saving=signal(false);
 readonly editingId=signal<number|null>(null);readonly editingLoading=signal<number|null>(null);
 nombre='';motivoId=0;inicio='';fin='';descripcion='';
 ngOnInit():void {this.load();this.loadCatalogos();}
 ngAfterViewInit():void {if(this.route.snapshot.queryParamMap.get('crear')==='1')this.openCreate();}
 loadCatalogos():void {const u=this.uotId();if(!u)return;
  this.api.catalogos(u,this.convenioId).subscribe({next:x=>this.catalogos.set(x),error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 openCreate():void {
  this.nombre='';this.motivoId=0;this.inicio=this.localInput();this.fin='';this.descripcion='';
  this.editingId.set(null);
  this.creating.set(true);this.createDialog.nativeElement.showModal();
 }
 closeCreate():void {if(this.saving())return;this.createDialog.nativeElement.close();this.creating.set(false);}
 async cancelarSolicitud(item:ResumenE2):Promise<void> {
  const u=this.uotId();if(!u||item.estado!=='SOLICITADA'||this.saving())return;
  const result=await this.confirm.show({title:'Cancelar solicitud',
    message:'La salida presentada se cancelará y quedará registrada en el historial.',
    tone:'danger',confirmLabel:'Cancelar solicitud',requiresReason:true,reasonLabel:'Motivo',minimumReasonLength:5});
  if(!result.confirmed||!result.reason)return;
  this.saving.set(true);
  this.api.cancelar(u,item.salidaId,result.reason,this.convenioId)
   .pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success('Solicitud cancelada');this.load();},
      error:e=>this.toast.error('No se pudo cancelar',mapOpenApiError(e).message)});
 }
 editar(salidaId:number):void {
  const u=this.uotId();if(!u||this.editingLoading()!==null||this.saving())return;
  this.editingLoading.set(salidaId);
  this.api.ver(u,salidaId,this.convenioId).pipe(finalize(()=>this.editingLoading.set(null)))
   .subscribe({next:(d:DetalleE2)=>{
     if(d.estado!=='BORRADOR'){this.toast.error('La salida ya fue presentada y no puede modificarse.');this.load();return;}
     this.editingId.set(d.salidaId);this.nombre=d.nombre;this.motivoId=d.motivoSalidaId;
     this.inicio=this.localInput(d.fechaInicioPrevista);this.fin=this.localInput(d.fechaFinPrevista);
     this.descripcion=d.descripcion??'';this.creating.set(true);this.createDialog.nativeElement.showModal();
   },error:e=>this.toast.error('No se pudo abrir el borrador',mapOpenApiError(e).message)});
 }
 private localInput(value?:string):string {const d=value?new Date(value):new Date();return Number.isNaN(d.getTime())?'':new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 guardar():void {
  const u=this.uotId();if(!u||this.saving())return;
  if(!this.nombre.trim()||!this.motivoId||!this.inicio||!this.fin){this.toast.error('Complete nombre, motivo e intervalo previsto.');return;}
  const start=new Date(this.inicio),end=new Date(this.fin);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){this.toast.error('La fecha final debe ser posterior al inicio.');return;}
  this.saving.set(true);
  const basic={nombre:this.nombre.trim(),motivoSalidaId:this.motivoId,
    fechaInicioPrevista:start.toISOString(),fechaFinPrevista:end.toISOString(),
    descripcion:this.descripcion.trim()};
  const editing=this.editingId();
  const action=editing!==null
    ?this.api.corregir(u,editing,{...basic,enviar:false},this.convenioId)
    :this.api.solicitar(u,{...basic,destinos:[],bienes:[],participantes:[],borrador:true},this.convenioId);
  action.pipe(finalize(()=>this.saving.set(false))).subscribe({
    next:r=>{this.createDialog.nativeElement.close();this.creating.set(false);
      this.toast.success(editing!==null?'Borrador actualizado':'Borrador creado');
      if(editing!==null)this.load();else this.open(r.salidaId);
      this.editingId.set(null);
    },error:e=>this.toast.error('No se pudo guardar la salida',mapOpenApiError(e).message)});
 }

 private context():number|null {const u=this.uotId();if(!u)this.error.set('Seleccione una UOT.');return u;}
 load():void {const u=this.context();if(!u)return;this.loading.set(true);this.error.set(null);
   this.api.listar(u,this.convenioId,this.estado||undefined,this.page,this.size)
   .pipe(finalize(()=>this.loading.set(false))).subscribe({
     next:r=>{this.items.set(r.items);this.total.set(r.total);},
     error:e=>this.error.set(mapOpenApiError(e).message)});
   this.api.listar(u,this.convenioId,'SOLICITADA',1,1).subscribe({
     next:r=>this.pendingCount.set(r.total),error:()=>this.pendingCount.set(0)});
 }
 applySearch():void {this.busqueda=this.buscar.trim().toLocaleLowerCase();}
 filtered():ResumenE2[]{const q=this.busqueda;return q?this.items().filter(x=>
   x.nombre.toLocaleLowerCase().includes(q)||String(x.salidaId).includes(q)):this.items();}
 totalPages():number {return Math.max(1,Math.ceil(this.total()/this.size));}
 changePage(page:number):void {this.page=page;this.load();}
 changeSize(size:number):void {this.size=size;this.page=1;this.load();}
 showPending():void {this.estado=this.estado==='SOLICITADA'?'':'SOLICITADA';this.page=1;this.load();}
 async eliminar(item:ResumenE2):Promise<void> {
   const u=this.uotId();if(!u||this.saving()||item.estado!=='BORRADOR')return;
   const result=await this.confirm.show({title:'Eliminar borrador',
     message:'La salida dejará de aparecer en el listado. No requiere motivo.',confirmLabel:'Eliminar borrador',tone:'danger'});
   if(!result.confirmed||this.saving())return;
   this.saving.set(true);
   this.api.cancelar(u,item.salidaId,'BORRADOR_DESCARTADO',this.convenioId)
    .pipe(finalize(()=>this.saving.set(false))).subscribe({next:()=>{this.toast.success('Borrador eliminado');this.load();},
      error:e=>this.toast.error('No se pudo eliminar el borrador',mapOpenApiError(e).message)});
 }
 open(id:number):void {this.router.navigate(['/gestion-tecnica/salidas/operativas',id],
   {queryParams:this.convenioId?{convenioId:this.convenioId}:undefined});}
}
