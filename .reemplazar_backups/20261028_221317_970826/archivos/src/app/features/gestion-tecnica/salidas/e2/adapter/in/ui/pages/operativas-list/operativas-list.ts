import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { faRoute } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { ExpedienteE1UseCase } from '../../../../../../../predios/expediente/application/expediente-e1.use-case';
import { provideExpedienteE1 } from '../../../../../../../predios/expediente/expediente-e1.providers';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { PaginatorComponent } from '../../../../../../../../../shared/data-display/paginator/paginator';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../../../shared/data-display/empty-state/empty-state';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { PermissionDirective } from '../../../../../../../../../core/access/permission.directive';
import { CatalogosE2, ResumenE2, SolicitudE2 } from '../../../../../domain/salida-operativa.model';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';

function localInput(): string {
  const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
@Component({selector:'app-operativas-list',standalone:true,
  imports:[DatePipe,FormsModule,RouterLink,PageHeaderComponent,PaginatorComponent,LoadingStateComponent,
           ErrorStateComponent,EmptyStateComponent,PermissionDirective],
  providers:[...provideSalidasE2(),...provideExpedienteE1()],
  templateUrl:'./operativas-list.html',styleUrl:'./operativas-list.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativasListPage implements OnInit {
  private readonly api=inject(SalidasE2UseCase);
  private readonly e1=inject(ExpedienteE1UseCase);
  private readonly uot=inject(UotContextStore);
  private readonly route=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private readonly toast=inject(ToastService);
  readonly icon=faRoute;
  readonly items=signal<ResumenE2[]>([]);
  readonly total=signal(0);
  readonly loading=signal(false);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly catalogos=signal<CatalogosE2>({motivos:[],tiposVisita:[],bienes:[]});
  readonly candidates=signal<{predioId:number;nombre:string;codigo:string}[]>([]);
  readonly destinos=signal<{predioId?:number;referencia?:string}[]>([]);
  readonly bienes=signal<{bienId:number;nombre:string}[]>([]);
  readonly showForm=signal(false);
  readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId')) || undefined;
  readonly uotId=this.uot.selectedId;
  estado='';page=1;size=20;
  nombre='';motivoId=0;inicio=localInput();fin='';descripcion='';
  destinoBuscar='';predioSeleccionado=0;referencia='';bienSeleccionado=0;
  ngOnInit():void {this.load();this.loadCatalogs();}
  private context():number|null {const id=this.uotId();if(!id)this.error.set('Seleccione primero la unidad territorial.');return id;}
  load():void {
    const uot=this.context();if(!uot)return;
    this.loading.set(true);this.error.set(null);
    this.api.listar(uot,this.convenioId,this.estado||undefined,this.page,this.size)
      .pipe(finalize(()=>this.loading.set(false))).subscribe({
        next:r=>{this.items.set(r.items);this.total.set(r.total);},
        error:e=>this.error.set(mapOpenApiError(e).message),
      });
  }
  loadCatalogs():void {
    const uot=this.context();if(!uot)return;
    this.api.catalogos(uot,this.convenioId).subscribe({next:c=>this.catalogos.set(c),
      error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  searchPredios():void {
    const uot=this.context();if(!uot || !this.destinoBuscar.trim())return;
    this.e1.buscarPredios(uot,this.destinoBuscar.trim(),this.convenioId).subscribe({
      next:items=>this.candidates.set(items.map(x=>({predioId:x.predioId,nombre:x.nombre,codigo:x.codigo}))),
      error:e=>this.toast.error('No se pudo buscar predios',mapOpenApiError(e).message),
    });
  }
  addDestino():void {
    if(this.predioSeleccionado>0){
      if(this.destinos().some(x=>x.predioId===this.predioSeleccionado))return;
      this.destinos.update(x=>[...x,{predioId:this.predioSeleccionado}]);
      this.predioSeleccionado=0;this.referencia='';return;
    }
    if(this.referencia.trim()) {this.destinos.update(x=>[...x,{referencia:this.referencia.trim()}]);this.referencia='';}
  }
  removeDestino(index:number):void {this.destinos.update(items=>items.filter((_,i)=>i!==index));}
  addBien():void {
    const bien=this.catalogos().bienes.find(x=>x.id===this.bienSeleccionado);
    if(bien && !this.bienes().some(x=>x.bienId===bien.id))this.bienes.update(x=>[...x,{bienId:bien.id,nombre:bien.nombre}]);
    this.bienSeleccionado=0;
  }
  removeBien(id:number):void {this.bienes.update(x=>x.filter(b=>b.bienId!==id));}
  solicitar():void {
    const uot=this.context();if(!uot||this.saving())return;
    if(!this.nombre.trim()||!this.motivoId||!this.inicio||!this.destinos().length){
      this.toast.error('Ingrese nombre, motivo, fecha inicial y al menos un destino.');return;
    }
    const entrada:SolicitudE2={nombre:this.nombre.trim(),motivoSalidaId:this.motivoId,
      fechaInicioPrevista:new Date(this.inicio).toISOString(),
      fechaFinPrevista:this.fin?new Date(this.fin).toISOString():undefined,
      descripcion:this.descripcion.trim()||undefined,destinos:this.destinos(),
      bienes:this.bienes().map(x=>({bienId:x.bienId}))};
    if(entrada.fechaFinPrevista && entrada.fechaFinPrevista<entrada.fechaInicioPrevista){
      this.toast.error('La fecha final no puede ser anterior a la inicial.');return;
    }
    this.saving.set(true);
    this.api.solicitar(uot,entrada,this.convenioId).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:r=>{this.toast.success('Solicitud enviada para aprobación');
        this.router.navigate(['/gestion-tecnica/salidas/operativas',r.salidaId],
          {queryParams:this.convenioId?{convenioId:this.convenioId}:undefined});},
      error:e=>this.toast.error('No se pudo enviar la solicitud',mapOpenApiError(e).message),
    });
  }
  totalPages():number {return Math.ceil(this.total()/this.size);}
  changePage(page:number):void {this.page=page;this.load();}
  changeSize(size:number):void {this.size=size;this.page=1;this.load();}
  open(id:number):void {this.router.navigate(['/gestion-tecnica/salidas/operativas',id],
    {queryParams:this.convenioId?{convenioId:this.convenioId}:undefined});}
}
