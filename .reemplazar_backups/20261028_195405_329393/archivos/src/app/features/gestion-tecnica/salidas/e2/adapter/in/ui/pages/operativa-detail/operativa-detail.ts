import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { faRoute } from '@fortawesome/free-solid-svg-icons';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../../../shared/data-display/empty-state/empty-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { PermissionDirective } from '../../../../../../../../../core/access/permission.directive';
import { EvidencePanelComponent } from '../../../../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { CatalogosE2, DetalleE2, EstadoBienE2, ResultadoE2 } from '../../../../../domain/salida-operativa.model';
import { ExpedienteE1UseCase } from '../../../../../../../predios/expediente/application/expediente-e1.use-case';
import { provideExpedienteE1 } from '../../../../../../../predios/expediente/expediente-e1.providers';
import { SalidasE2UseCase } from '../../../../../application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../salidas-e2.providers';

@Component({selector:'app-operativa-detail',standalone:true,
  imports:[DatePipe,FormsModule,RouterLink,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent,
    EmptyStateComponent,ActionConfirmDialogComponent,PermissionDirective,EvidencePanelComponent],
  providers:[...provideSalidasE2(),...provideExpedienteE1()],
  templateUrl:'./operativa-detail.html',styleUrl:'./operativa-detail.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativaDetailPage implements OnInit {
  private readonly api=inject(SalidasE2UseCase);
  private readonly e1=inject(ExpedienteE1UseCase);
  private readonly uot=inject(UotContextStore);
  private readonly route=inject(ActivatedRoute);
  private readonly toast=inject(ToastService);
  readonly icon=faRoute;
  readonly id=Number(this.route.snapshot.paramMap.get('id'));
  readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||undefined;
  readonly uotId=this.uot.selectedId;
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly detail=signal<DetalleE2|null>(null);
  readonly catalogos=signal<CatalogosE2>({motivos:[],tiposVisita:[],bienes:[]});
  decision:'APROBADA'|'OBSERVADA'|'RECHAZADA'='APROBADA';motivoDecision='';
  nombreCorreccion='';descripcionCorreccion='';motivoCancelar='';
  buscarPredio='';destinoVincular=0;predioVincular=0;
  readonly candidatos=signal<{predioId:number;nombre:string}[]>([]);
  destinoId=0;tipoVisitaId=0;objetivo='';
  visitaFinalizar=0;resumen='';
  observacionGeneral='';observacionInspeccion='';
  readonly resultadoDeclarado=signal<Record<number,EstadoBienE2['resultado']>>({});
  readonly resultadoInspeccion=signal<Record<number,EstadoBienE2['resultado']>>({});
  ngOnInit():void {this.load();this.loadCatalogs();}
  load():void {
    const uot=this.uotId();if(!uot){this.error.set('Seleccione una UOT.');this.loading.set(false);return;}
    this.loading.set(true);this.error.set(null);
    this.api.ver(uot,this.id,this.convenioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:d=>{this.detail.set(d);this.nombreCorreccion=d.nombre;this.descripcionCorreccion=d.descripcion??'';
        this.resultadoDeclarado.set(Object.fromEntries(d.bienes.map(b=>[b.solicitudRecursoId,
         (b.resultadoDeclarado??'CONFORME') as EstadoBienE2['resultado']])));
        this.resultadoInspeccion.set(Object.fromEntries(d.bienes.map(b=>[b.solicitudRecursoId,
         (b.resultadoValidado??b.resultadoDeclarado??'CONFORME') as EstadoBienE2['resultado']])));
      },error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  loadCatalogs():void {const uot=this.uotId();if(uot)this.api.catalogos(uot,this.convenioId).subscribe({
    next:c=>this.catalogos.set(c),error:e=>this.toast.error('No se pudieron cargar los catálogos',mapOpenApiError(e).message)});}
  run(action:Observable<ResultadoE2>,message:string):void {
    if(this.saving())return;
    this.saving.set(true);
    action.pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success(message);this.load();},
      error:e=>this.toast.error('No se pudo completar la acción',mapOpenApiError(e).message),
    });
  }
  corregir():void {const u=this.uotId();if(!u||!this.nombreCorreccion.trim())return;
    this.run(this.api.corregir(u,this.id,this.nombreCorreccion.trim(),this.descripcionCorreccion.trim(),this.convenioId),'Solicitud reenviada');}
  decidir():void {const u=this.uotId();if(!u)return;
    if(this.decision!=='APROBADA'&&!this.motivoDecision.trim()){
      this.toast.error('Ingrese el motivo de la decisión.');return;}
    this.run(this.api.decidir(u,this.id,this.decision,this.motivoDecision.trim()||undefined,this.convenioId),'Decisión registrada');}
  entregar():void {const u=this.uotId();if(u)this.run(this.api.entregar(u,this.id,this.convenioId),'Entrega registrada');}
  iniciar():void {const u=this.uotId();if(u)this.run(this.api.iniciar(u,this.id,this.convenioId),'Salida iniciada');}
  visitar():void {const u=this.uotId();if(!u||!this.destinoId||!this.tipoVisitaId){this.toast.error('Seleccione destino y tipo de visita.');return;}
    this.run(this.api.visitar(u,this.id,this.destinoId,this.tipoVisitaId,this.objetivo.trim()||undefined,this.convenioId),'Visita iniciada');}
  finalizarVisita():void {const u=this.uotId();if(!u||!this.visitaFinalizar||!this.resumen.trim()){
    this.toast.error('Seleccione visita e indique qué se hizo.');return;}
    this.run(this.api.finalizarVisita(u,this.id,this.visitaFinalizar,this.resumen.trim(),this.convenioId),'Visita finalizada');}
  buscarPredios():void {const u=this.uotId();if(!u||!this.buscarPredio.trim())return;
    this.e1.buscarPredios(u,this.buscarPredio.trim(),this.convenioId).subscribe({
      next:r=>this.candidatos.set(r.map(p=>({predioId:p.predioId,nombre:p.nombre}))),
      error:e=>this.toast.error('No se pudo buscar predios',mapOpenApiError(e).message),
    });
  }
  vincular():void {const u=this.uotId();if(!u||!this.destinoVincular||!this.predioVincular)return;
    this.run(this.api.vincularDestino(u,this.id,this.destinoVincular,this.predioVincular,this.convenioId),'Destino asociado al predio');}
  cancelar():void {const u=this.uotId();if(!u||!this.motivoCancelar.trim()){
    this.toast.error('Ingrese un motivo para cancelar.');return;}
    this.run(this.api.cancelar(u,this.id,this.motivoCancelar.trim(),this.convenioId),'Solicitud cancelada');}
  hasPendingDestinations(detail:DetalleE2):boolean {return detail.destinos.some(x=>!x.predioId);}
  changeDeclarado(id:number,value:EstadoBienE2['resultado']):void {this.resultadoDeclarado.update(s=>({...s,[id]:value}));}
  changeInspeccion(id:number,value:EstadoBienE2['resultado']):void {this.resultadoInspeccion.update(s=>({...s,[id]:value}));}
  retornar():void {const u=this.uotId();const d=this.detail();if(!u||!d||!this.observacionGeneral.trim()){
     this.toast.error('Escriba una observación general del retorno.');return;}
     const bienes=d.bienes.filter(x=>x.estado==='ENTREGADO').map(b=>({
       solicitudRecursoId:b.solicitudRecursoId,resultado:this.resultadoDeclarado()[b.solicitudRecursoId]??'CONFORME'}));
     this.run(this.api.retornar(u,this.id,this.observacionGeneral.trim(),bienes,this.convenioId),'Retorno declarado');}
  inspeccionar():void {const u=this.uotId();const d=this.detail();if(!u||!d)return;
     const bienes=d.bienes.filter(x=>x.estado==='ENTREGADO').map(b=>({
       solicitudRecursoId:b.solicitudRecursoId,resultado:this.resultadoInspeccion()[b.solicitudRecursoId]??'FALTANTE'}));
     this.run(this.api.inspeccionar(u,this.id,bienes,this.observacionInspeccion.trim()||undefined,this.convenioId),'Inspección registrada');}
  cerrar():void {const u=this.uotId();if(u)this.run(this.api.cerrar(u,this.id,this.convenioId),'Salida cerrada');}
}
