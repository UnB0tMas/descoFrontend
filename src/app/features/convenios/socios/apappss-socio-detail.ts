import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faEye, faMapLocationDot, faPen, faPlus, faRotate, faTableCellsLarge, faTableList, faUsers, faSeedling, faBan, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { FundoAccionesApi, FundoAptitud } from '../predios/fundo-acciones.api';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ObtenerProductorUseCase } from '../../gestion-tecnica/productores/application/use-case/obtener-productor.use-case';
import { ProductorDetalle, ProductorPredio } from '../../gestion-tecnica/productores/domain/productor-detalle.model';
import { ApappssPredioAltaPage } from '../predios/apappss-predio-alta';
import { ExpedienteE1UseCase } from '../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';

@Component({
 selector:'app-apappss-socio-detail',standalone:true,
 imports:[DatePipe,RouterLink,FaIconComponent,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent,EmptyStateComponent,PaginatorComponent,RecordCardComponent,ApappssPredioAltaPage,ActionConfirmDialogComponent],
 templateUrl:'./apappss-socio-detail.html',styleUrls: ['../../gestion-tecnica/gestion-productiva/gestion-productiva.css', './apappss-socio-detail.css'],
 changeDetection:ChangeDetectionStrategy.OnPush,
})
export class ApappssSocioDetailPage implements OnInit {
 @ViewChild(ApappssPredioAltaPage) private alta?:ApappssPredioAltaPage;
 @ViewChild(ActionConfirmDialogComponent) private confirm?:ActionConfirmDialogComponent;
 private readonly route=inject(ActivatedRoute);
 private readonly getSocio=inject(ObtenerProductorUseCase);
 private readonly expediente=inject(ExpedienteE1UseCase);
 private readonly uot=inject(UotContextStore);
 private readonly permissions=inject(PermissionService);
 private readonly acciones=inject(FundoAccionesApi);
 private readonly toast=inject(ToastService);
 readonly socioId=Number(this.route.snapshot.paramMap.get('socioId'));
 readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'));
 readonly icon=faUsers;readonly backIcon=faArrowLeft;readonly plusIcon=faPlus;readonly refreshIcon=faRotate;
 readonly predioIcon=faMapLocationDot;readonly detalleIcon=faEye;readonly editarIcon=faPen;
 readonly tablaIcon=faTableList;readonly tarjetasIcon=faTableCellsLarge;
 readonly productionIcon=faSeedling;readonly disabledIcon=faBan;readonly deleteIcon=faTrashCan;
 readonly aptitudes=signal<Record<number,FundoAptitud>>({});
 readonly aptitudesCargando=signal<ReadonlySet<number>>(new Set<number>());
 readonly aptitudesErrores=signal<Record<number,string>>({});
 readonly accionEnCurso=signal<number|null>(null);
 readonly accionError=signal<string|null>(null);
 private consultaVersion=0;
 readonly loading=signal(true);readonly error=signal<string|null>(null);
 readonly socio=signal<ProductorDetalle|null>(null);readonly predios=signal<ProductorPredio[]>([]);
 readonly vista=signal<'tabla'|'tarjetas'>('tabla');
 readonly busqueda=signal('');readonly pagina=signal(1);readonly tamano=signal(10);
 readonly prediosFiltrados=computed(()=>{
  const filtro=this.busqueda().trim().toLocaleLowerCase();
  if(!filtro)return this.predios();
  return this.predios().filter(p=>
   p.nombre.toLocaleLowerCase().includes(filtro)||p.codigo.toLocaleLowerCase().includes(filtro));
 });
 readonly totalPaginas=computed(()=>Math.max(1,Math.ceil(this.prediosFiltrados().length/this.tamano())));
 readonly prediosPagina=computed(()=>{
  const start=(this.pagina()-1)*this.tamano();
  return this.prediosFiltrados().slice(start,start+this.tamano());
 });
 buscarPredio(texto:string):void{this.busqueda.set(texto);this.pagina.set(1);this.consultarAptitudes();}
 cambiarVista(vista:'tabla'|'tarjetas'):void{this.vista.set(vista);}
 cambiarPagina(pagina:number):void{if(pagina>=1&&pagina<=this.totalPaginas()){this.pagina.set(pagina);this.consultarAptitudes();}}
 cambiarTamano(tamano:number):void{
  if(![10,20,50,100].includes(tamano))return;
  this.tamano.set(tamano);this.pagina.set(1);this.consultarAptitudes();
 }
 readonly puedeCrear=computed(()=>this.permissions.hasAll(['PREDIOS_CREAR','APAPPSS_PREDIOS_CREAR']));
 readonly puedeEditar=computed(()=>this.permissions.hasAll(['PREDIOS_EDITAR','APAPPSS_PREDIOS_EDITAR']));
 readonly puedeRetirar=computed(()=>this.permissions.hasAll(['PREDIOS_RETIRAR','APAPPSS_PREDIOS_EDITAR']));
 aptitud(predioId:number):FundoAptitud|null{return this.aptitudes()[predioId]??null;}
 private consultarAptitudes():void{
  const version=this.consultaVersion;
  for(const predio of this.prediosPagina()){
   const id=predio.predioId;
   if(this.aptitudes()[id]||this.aptitudesCargando().has(id)||this.aptitudesErrores()[id])continue;
   this.aptitudesCargando.update(ids=>new Set([...ids,id]));
   this.acciones.consultar(id,this.convenioId).pipe(finalize(()=>{
    if(version===this.consultaVersion)this.aptitudesCargando.update(ids=>{
     const siguientes=new Set(ids);siguientes.delete(id);return siguientes;
    });
   })).subscribe({
    next:valor=>{
     if(version!==this.consultaVersion)return;
     this.aptitudes.update(items=>({...items,[id]:valor}));
    },
    error:e=>{
     if(version!==this.consultaVersion)return;
     this.aptitudesErrores.update(items=>({...items,[id]:mapOpenApiError(e).message}));
    },
   });
  }
 }
 async cambiarAptitud(predioId:number):Promise<void>{
  const actual=this.aptitud(predioId);
  if(!this.puedeEditar()||!actual||this.accionEnCurso()!==null||
    !this.predios().some(p=>p.predioId===predioId))return;
  if(actual.habilitado){
   const respuesta=await this.confirm?.show({title:'Deshabilitar producción',
    message:'El fundo dejará de estar disponible para nuevas campañas.',
    confirmLabel:'Deshabilitar',tone:'warning'});
   if(!respuesta?.confirmed)return;
  }
  this.accionEnCurso.set(predioId);this.accionError.set(null);
  this.acciones.cambiar(predioId,this.convenioId,actual)
   .pipe(finalize(()=>this.accionEnCurso.set(null))).subscribe({
    next:valor=>{
     this.aptitudes.update(items=>({...items,[predioId]:valor}));
     this.toast.success(valor.habilitado?'Fundo habilitado para producción':'Producción deshabilitada');
    },
    error:e=>this.accionError.set(mapOpenApiError(e).message),
   });
 }
 async eliminarFundo(predioId:number):Promise<void>{
  if(!this.puedeRetirar()||this.accionEnCurso()!==null||
    !this.predios().some(p=>p.predioId===predioId))return;
  const respuesta=await this.confirm?.show({title:'Eliminar fundo',
   message:'Se desactivará el fundo y sus registros operativos. Se conservará el historial.',
   confirmLabel:'Eliminar fundo',tone:'danger',requiresReason:true,minimumReasonLength:5});
  if(!respuesta?.confirmed||!respuesta.reason)return;
  this.accionEnCurso.set(predioId);this.accionError.set(null);
  this.acciones.retirar(predioId,this.convenioId,respuesta.reason)
   .pipe(finalize(()=>this.accionEnCurso.set(null))).subscribe({
    next:()=>{this.toast.success('Fundo desactivado');this.cargar();},
    error:e=>this.accionError.set(mapOpenApiError(e).message),
   });
 }
 readonly nombre=computed(()=>{const s=this.socio();return s?[s.nombres,s.apellidoPaterno,s.apellidoMaterno].filter(Boolean).join(' '):'Detalle del socio';});
 ngOnInit():void { this.cargar(); }
 cargar():void {
  const uotId=this.uot.selectedId();
  if(!uotId||!Number.isInteger(this.socioId)||this.socioId<=0||!Number.isInteger(this.convenioId)||this.convenioId<=0){this.error.set('Seleccione un socio y un convenio válidos.');this.loading.set(false);return;}
  this.loading.set(true);this.error.set(null);
  this.consultaVersion++;
  this.aptitudes.set({});this.aptitudesCargando.set(new Set<number>());
  this.aptitudesErrores.set({});
  this.getSocio.execute(this.socioId).subscribe({next:s=>{
   this.socio.set(s);
   // El listado E1 controla el ámbito de convenio; no basta con el listado general del productor.
   this.expediente.buscarPredios(uotId,s.numeroDocumento,this.convenioId)
    .pipe(finalize(()=>this.loading.set(false))).subscribe({next:rows=>{
     const ids=new Set(rows.map(p=>p.predioId));
     this.predios.set(s.predios.filter(p=>p.estado&&(!p.fechaHasta)&&ids.has(p.predioId)));
     if(this.pagina()>this.totalPaginas())this.pagina.set(this.totalPaginas());
     this.consultarAptitudes();
    },error:e=>this.error.set(mapOpenApiError(e).message)});
  },error:e=>{this.loading.set(false);this.error.set(mapOpenApiError(e).message);}});
 }
 async editarPredio(predioId:number):Promise<void>{
  if(!this.puedeEditar()||!this.alta||!this.predios().some(p=>p.predioId===predioId))return;
  const r=await this.alta.openEditar(this.socioId,this.convenioId,predioId);
  if(r.saved)this.cargar();
 }
 async crearPredio():Promise<void>{
  if(!this.puedeCrear()||!this.alta)return;
  const res=await this.alta.open(this.socioId,this.convenioId);
  if(res.saved)this.cargar();
 }
}
