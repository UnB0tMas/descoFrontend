import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCommentDots, faEye, faLeaf, faPen, faPlus, faRotate, faTableCellsLarge, faTableList, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { GpActividadResponse } from '../../../infrastructure/openapi/generated/model/gpActividadResponse';
import { GpCatalogoResponse } from '../../../infrastructure/openapi/generated/model/gpCatalogoResponse';
import { DataTableComponent } from '../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { GpGeneralFacade } from './gp-general.facade';
import { GpAccionModal } from './gp-accion-modal';

type Category = 'TODOS'|'CULTIVO'|'CRIANZA';
@Component({selector:'app-gestion-productiva-parcela',standalone:true,
  imports: [RecordCardComponent, FormsModule,RouterLink,FaIconComponent,PermissionDirective,PageHeaderComponent,
    DataTableComponent,PaginatorComponent,EmptyStateComponent,ErrorStateComponent,LoadingStateComponent,GpAccionModal,ActionConfirmDialogComponent],
  templateUrl:'./gestion-productiva-parcela.html',styleUrl:'./gestion-productiva.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class GestionProductivaParcela implements OnInit,OnDestroy {
  private readonly route=inject(ActivatedRoute);
  private readonly gp=inject(GpGeneralFacade);
  private readonly uot=inject(UotContextStore);
  private readonly permissions=inject(PermissionService);
  private readonly toast=inject(ToastService);
  @ViewChild(GpAccionModal) private modal!:GpAccionModal;
  @ViewChild(ActionConfirmDialogComponent) private confirmation!:ActionConfirmDialogComponent;
  private subscription?:Subscription;
  readonly predioId=Number(this.route.snapshot.paramMap.get('predioId'));
  readonly parcelaId=Number(this.route.snapshot.paramMap.get('parcelaId'));
  readonly pageIcon=faLeaf;readonly backIcon=faArrowLeft;readonly refreshIcon=faRotate;
  readonly addIcon=faPlus;readonly detailsIcon=faEye;readonly editIcon=faPen;readonly deleteIcon=faTrash;readonly commentIcon=faCommentDots;readonly tableIcon=faTableList;readonly cardsIcon=faTableCellsLarge;
  readonly busy=signal(false);
  readonly loading=signal(true);readonly error=signal<string|null>(null);
  readonly parcelaNombre=signal('Parcela');readonly parcelaAreaM2=signal<number|null>(null);
  readonly actividades=signal<GpActividadResponse[]>([]);readonly catalogos=signal<GpCatalogoResponse[]>([]);
  readonly activityView=signal<'tabla'|'tarjetas'>('tabla');
  readonly activitySearch=signal('');readonly category=signal<Category>('TODOS');
  readonly estadoFiltro=signal<'TODOS'|'ACTIVA'|'FINALIZADA'>('TODOS');
  readonly activityPage=signal(1);readonly activitySize=signal(10);
  readonly activityColumns:readonly DataTableColumn<GpActividadResponse>[]=[
    {key:'nombre',label:'Actividad'}, {key:'rubro',label:'Rubro'},
    {key:'superficieExactaM2',label:'Superficie (m²)',align:'right',format:v=>v==null?'—':`${v} m²`},
    {key:'estadoProceso',label:'Estado'}, {key:'acciones',label:'Acciones',align:'right'}];
  readonly crops=computed(()=>this.actividades().filter(a=>a.rubro==='CULTIVO'&&a.estadoProceso!=='FINALIZADA'));
  readonly animals=computed(()=>this.actividades().filter(a=>a.rubro==='CRIANZA'&&a.estadoProceso!=='FINALIZADA'));
  readonly filteredActivities=computed(()=>{
    const term=this.activitySearch().trim().toLocaleLowerCase();
    return this.actividades().filter(a=>(this.category()==='TODOS'||this.category()===a.rubro)
      &&(this.estadoFiltro()==='TODOS'||(a.estadoProceso??'ACTIVA')===this.estadoFiltro())
      &&(!term||a.nombre.toLocaleLowerCase().includes(term)));
  });
  readonly activityPages=computed(()=>Math.ceil(this.filteredActivities().length/this.activitySize()));
  readonly visibleActivities=computed(()=>this.filteredActivities().slice(
    (this.activityPage()-1)*this.activitySize(),this.activityPage()*this.activitySize()));
  ngOnInit():void{
    if(!Number.isInteger(this.predioId)||this.predioId<1||!Number.isInteger(this.parcelaId)||this.parcelaId<1){
      this.loading.set(false);this.error.set('Parcela no válida.');return;
    }
    this.refresh();
  }
  ngOnDestroy():void{this.subscription?.unsubscribe();}
  refresh():void{
    const u=this.uot.selectedId();if(!u){this.loading.set(false);this.error.set('Selecciona una UOT.');return;}
    this.subscription?.unsubscribe();this.loading.set(true);this.error.set(null);
    this.subscription=forkJoin({parcelas:this.gp.parcelas(u,this.predioId),
      actividades:this.gp.actividades(u,this.parcelaId),catalogos:this.gp.catalogos(u)})
      .pipe(finalize(()=>this.loading.set(false))).subscribe({
        next:result=>{
          const p=result.parcelas.find(x=>x.parcelaId===this.parcelaId);
          if(!p){this.error.set('La parcela no está disponible en este predio.');this.actividades.set([]);return;}
          this.parcelaNombre.set(p.nombre);this.parcelaAreaM2.set(p.areaHa==null?null:Number(p.areaHa)*10000);
          this.catalogos.set(result.catalogos);
          this.actividades.set([...result.actividades].sort((a,b)=>b.actividadId-a.actividadId));
          this.activityPage.set(Math.max(1,Math.min(this.activityPage(),this.activityPages())));
        },error:e=>this.error.set(mapOpenApiError(e).message)
      });
  }
  medidaResumen(a:GpActividadResponse):string{
    const area=a.superficieExactaM2??a.superficieAproximadaM2;
    if(a.rubro==='CULTIVO')return area==null?'Superficie no registrada':`${area} m² sembrados`;
    const total=a.cantidadExacta??a.cantidadAproximada;
    return `${total==null?'Censo sin registrar':total+' animales'} · ${area==null?'Superficie pendiente':area+' m²'}`;
  }
  disponibleSuperficie():number|null{
    const total=this.parcelaAreaM2();if(total===null)return null;
    const ocupada=this.actividades().filter(a=>a.estado&&a.estadoProceso!=='FINALIZADA')
      .reduce((sum,a)=>sum+Number(a.superficieExactaM2??a.superficieAproximadaM2??0),0);
    return Math.max(0,Math.round((total-ocupada)*100)/100);
  }
  setView(v:'tabla'|'tarjetas'):void{this.activityView.set(v);}
  changeSearch(v:string):void{this.activitySearch.set(v);this.activityPage.set(1);}
  changeCategory(v:Category):void{this.category.set(v);this.activityPage.set(1);}
  changeEstado(v:'TODOS'|'ACTIVA'|'FINALIZADA'):void{this.estadoFiltro.set(v);this.activityPage.set(1);}
  setActivityPage(v:number):void{if(v>=1&&v<=this.activityPages())this.activityPage.set(v);}
  setActivitySize(v:number):void{this.activitySize.set(v);this.activityPage.set(1);}
  createActivity():void{this.modal.show('actividad',this.parcelaId,null,this.catalogos(),[],()=>this.refresh(),null,this.disponibleSuperficie());}
  editActivity(a:GpActividadResponse):void{
    if(this.busy()||!a.estado||a.estadoProceso==='FINALIZADA'||!this.permissions.has('CULTIVOS_EDITAR'))return;
    this.modal.show('editar',this.parcelaId,a,this.catalogos(),[],()=>this.refresh());
  }
  comment(a:GpActividadResponse):void{
    if(this.busy()||!a.estado||a.estadoProceso==='FINALIZADA'||!this.permissions.has('PREDIOS_EDITAR'))return;
    this.modal.show('comentario',this.parcelaId,a,this.catalogos(),[],()=>this.refresh());
  }
  async removeActivity(a:GpActividadResponse):Promise<void>{
    const u=this.uot.selectedId();
    if(!u||this.busy()||!a.estado||!this.permissions.has('CULTIVOS_RETIRAR'))return;
    const answer=await this.confirmation.show({title:'Eliminar actividad',
      message:`La actividad “${a.nombre}” dejará de aparecer en el listado. Los censos, incidencias y seguimientos se conservarán para auditoría.`,
      tone:'danger',confirmLabel:'Eliminar actividad',requiresReason:true,minimumReasonLength:3,
      maximumReasonLength:1000,reasonLabel:'Motivo de eliminación'});
    if(!answer.confirmed||!answer.reason)return;
    this.busy.set(true);
    this.gp.eliminarActividad(u,a.actividadId,answer.reason).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.toast.success('Actividad eliminada lógicamente');this.refresh();},
      error:e=>this.error.set(mapOpenApiError(e).message)});
  }

}
