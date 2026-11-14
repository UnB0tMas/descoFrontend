import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMapLocationDot, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { GeographyCascadeComponent, GeographySelection } from '../../../shared/forms/geography-cascade/geography-cascade';
import { PredioMapComponent } from '../../gestion-tecnica/predios/adapter/in/ui/components/predio-map/predio-map';
import { ObtenerProductorUseCase } from '../../gestion-tecnica/productores/application/use-case/obtener-productor.use-case';
import { ProductorDetalle } from '../../gestion-tecnica/productores/domain/productor-detalle.model';
import { ExpedienteE1UseCase } from '../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import { ExpedienteE1 } from '../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import { PrediosService, PropertyDetailResponse, PropertyUpdateRequest } from '../../../infrastructure/openapi/generated';
import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { registroPredioError } from '../../../shared/feedback/expediente-error/registro-predio-error';

export interface AltaPredioModalResult { saved: boolean; predioId?: number; }
@Component({ selector:'app-apappss-predio-alta',standalone:true,
 imports:[FormsModule,FaIconComponent,GeographyCascadeComponent,PredioMapComponent],
 templateUrl:'./apappss-predio-alta.html',styleUrls:['../../gestion-tecnica/gestion-productiva/gestion-productiva.css','./apappss-predio-alta.css'],
 changeDetection:ChangeDetectionStrategy.OnPush })
export class ApappssPredioAltaPage {
 @ViewChild('dialog',{static:true}) private dialog!:ElementRef<HTMLDialogElement>;
 private readonly uot=inject(UotContextStore);
 private readonly permission=inject(PermissionService);
 private readonly socioApi=inject(ObtenerProductorUseCase);
 private readonly e1=inject(ExpedienteE1UseCase);
 private readonly prediosApi=inject(PrediosService);
 private readonly keys=inject(IdempotencyKeyService);
 private readonly toast=inject(ToastService);
 readonly icon=faMapLocationDot;readonly closeIcon=faXmark;
 readonly socio=signal<ProductorDetalle|null>(null);
 readonly loading=signal(false);readonly guardando=signal(false);
 readonly error=signal<string|null>(null);
 readonly puedeCrear=computed(()=>this.permission.hasAll(['PREDIOS_CREAR','APAPPSS_PREDIOS_CREAR']));
 readonly puedeEditar=computed(()=>this.permission.hasAll(['PREDIOS_EDITAR','APAPPSS_PREDIOS_EDITAR']));
 private resolver:((r:AltaPredioModalResult)=>void)|null=null;
 private original:ExpedienteE1|null=null;
 private originalPropiedad:PropertyDetailResponse|null=null;
 socioId=0;convenioId=0;predioId=0;
 nombre='';distrito='';centroPobladoId:number|null=null;referencia='';
 latitud:number|null=null;longitud:number|null=null;
 superficieHa:number|null=null;areaCultivableHa:number|null=null;tipoRiego='';
 get esEdicion():boolean{return this.predioId>0;}
 private reset(socioId:number,convenioId:number,predioId=0):void{
  this.socioId=socioId;this.convenioId=convenioId;this.predioId=predioId;
  this.nombre='';this.distrito='';this.centroPobladoId=null;this.referencia='';
  this.latitud=null;this.longitud=null;this.superficieHa=null;
  this.areaCultivableHa=null;this.tipoRiego='';this.original=null;this.originalPropiedad=null;
  this.error.set(null);this.socio.set(null);this.loading.set(true);
  this.dialog.nativeElement.showModal();
 }
 open(socioId:number,convenioId:number):Promise<AltaPredioModalResult>{
  if(!this.uot.selectedId()||!this.puedeCrear()||socioId<=0||convenioId<=0)return Promise.resolve({saved:false});
  this.reset(socioId,convenioId);
  this.socioApi.execute(socioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:s=>{if(this.socioId===socioId)this.socio.set(s);},
   error:e=>this.error.set(mapOpenApiError(e).message),
  });
  return new Promise(resolve=>{this.resolver=resolve;});
 }
 openEditar(socioId:number,convenioId:number,predioId:number):Promise<AltaPredioModalResult>{
  const uotId=this.uot.selectedId();
  if(!uotId||!this.puedeEditar()||socioId<=0||convenioId<=0||predioId<=0)return Promise.resolve({saved:false});
  this.reset(socioId,convenioId,predioId);
  forkJoin({socio:this.socioApi.execute(socioId),
   expediente:this.e1.detalle(uotId,predioId,convenioId),
   propiedad:this.prediosApi.prediosVer({id:predioId},'body',false,{transferCache:false})})
   .pipe(finalize(()=>this.loading.set(false))).subscribe({next:({socio,expediente,propiedad})=>{
    if(this.predioId!==predioId)return;
    if(!expediente.titulares.some(t=>t.personaId===socioId||t.socioId===socioId)
      ||propiedad.datos?.predioId!==predioId){
     this.error.set('Este predio no está vinculado al socio.');return;
    }
    this.socio.set(socio);this.original=expediente;this.originalPropiedad=propiedad.datos;
    this.nombre=expediente.nombre;this.distrito=expediente.distritoCodigo;
    this.centroPobladoId=expediente.centroPobladoId??null;
    this.referencia=expediente.referencia??'';
    this.latitud=expediente.latitud??null;this.longitud=expediente.longitud??null;
    this.superficieHa=expediente.areaTotalHa??null;
    this.areaCultivableHa=expediente.areaCultivableHa??null;
    this.tipoRiego=expediente.tipoRiego??'';
   },error:e=>this.error.set(mapOpenApiError(e).message)});
  return new Promise(resolve=>{this.resolver=resolve;});
 }
 close():void{if(!this.guardando())this.finish({saved:false});}
 private finish(result:AltaPredioModalResult):void{
  if(this.dialog.nativeElement.open)this.dialog.nativeElement.close();
  const done=this.resolver;this.resolver=null;done?.(result);
 }
 ubicacion(v:GeographySelection):void{this.distrito=v.districtCode;this.centroPobladoId=v.populationCenterId;}
 punto(v:{latitude:number;longitude:number}):void{this.latitud=v.latitude;this.longitud=v.longitude;}
 coordenadasValidas():boolean{return this.latitud!==null&&this.longitud!==null&&Number.isFinite(this.latitud)&&Number.isFinite(this.longitud)
  &&this.latitud>=-90&&this.latitud<=90&&this.longitud>=-180&&this.longitud<=180;}
 formularioValido():boolean{
  return !!this.socio()?.estado && (this.esEdicion?this.puedeEditar():this.puedeCrear())
   &&this.nombre.trim().length>=2&&this.nombre.trim().length<=150&&/^\d{6}$/.test(this.distrito)
   &&this.superficieHa!==null&&Number.isFinite(this.superficieHa)&&this.superficieHa>0&&this.superficieHa<=999999.9999
   &&Math.abs(this.superficieHa*10000-Math.round(this.superficieHa*10000))<0.00001
   &&(this.areaCultivableHa===null||(Number.isFinite(this.areaCultivableHa)&&this.areaCultivableHa>=0
     &&this.areaCultivableHa<=this.superficieHa&&Math.abs(this.areaCultivableHa*10000-Math.round(this.areaCultivableHa*10000))<0.00001))
   &&this.tipoRiego.trim().length<=30
   &&(this.coordenadasValidas()||(this.esEdicion&&this.latitud===null&&this.longitud===null));
 }
 motivoInvalido():string|null{
  if(!this.socio())return 'No se pudo cargar la información del socio.';
  if(!this.esEdicion&&!this.puedeCrear()||this.esEdicion&&!this.puedeEditar())return 'No tiene permisos para guardar este predio.';
  if(this.nombre.trim().length<2)return 'Indique el nombre del predio.';
  if(!/^\d{6}$/.test(this.distrito))return 'Seleccione el distrito del predio.';
  if(this.superficieHa===null||!Number.isFinite(this.superficieHa)||this.superficieHa<=0)return 'Indique la superficie del predio.';
  if(this.areaCultivableHa!==null&&this.areaCultivableHa>this.superficieHa)return 'El área cultivable no puede superar el área total.';
  if(!this.coordenadasValidas()&&!this.esEdicion)return 'Marque la ubicación del predio en el mapa.';
  return null;
 }
 guardar():void{
  const uotId=this.uot.selectedId();
  if(!uotId||!this.formularioValido()||this.guardando()){
   this.error.set(this.motivoInvalido()||'Revise los datos del predio.');return;
  }
  if(!this.esEdicion){
   this.guardando.set(true);this.error.set(null);
   this.e1.altaPredio(uotId,{personaId:this.socioId,nombre:this.nombre.trim(),
    distritoCodigo:this.distrito,centroPobladoId:this.centroPobladoId??undefined,
    referencia:this.referencia.trim()||undefined,
    latitud:this.latitud===null?undefined:Number(this.latitud.toFixed(6)),
    longitud:this.longitud===null?undefined:Number(this.longitud.toFixed(6)),
    areaTotalHa:this.superficieHa!,areaCultivableHa:this.areaCultivableHa??undefined,
    tipoRiego:this.tipoRiego.trim()||undefined},this.convenioId)
    .pipe(finalize(()=>this.guardando.set(false))).subscribe({
     next:id=>{this.toast.success('Predio registrado');this.finish({saved:true,predioId:id});},
     error:e=>this.error.set(registroPredioError(e)),
    });return;
  }
  const base=this.original;const property=this.originalPropiedad;
  if(!base||!property||property.predioId!==this.predioId){this.error.set('No se pudo cargar el predio.');return;}
  if((base.areaCultivableHa!=null&&this.areaCultivableHa===null)||
     ((base.tipoRiego??'').trim()!==''&&this.tipoRiego.trim()==='')){
   this.error.set('Para conservar el historial, los datos registrados no pueden quedar vacíos.');return;
  }
  const geoChanged=this.nombre.trim()!==base.nombre||this.distrito!==base.distritoCodigo
   ||this.centroPobladoId!==(base.centroPobladoId??null)||this.referencia.trim()!==(base.referencia??'')
   ||this.latitud!==(base.latitud??null)||this.longitud!==(base.longitud??null);
  const techChanged=this.superficieHa!==base.areaTotalHa
   ||this.areaCultivableHa!==(base.areaCultivableHa??null)||this.tipoRiego.trim()!==(base.tipoRiego??'');
  if(!geoChanged&&!techChanged){this.toast.success('Sin cambios pendientes');this.finish({saved:false});return;}
  const id=this.predioId;const coord=(n:number|null)=>n===null?undefined:Number(n.toFixed(6));
  // Ambas rutas actuales conservan el historial y sus controles de seguridad.
  const solicitud:PropertyUpdateRequest={nombre:this.nombre.trim(),
   ubicacion:{distritoCodigo:this.distrito,centroPobladoId:this.centroPobladoId??undefined,
    referencia:this.referencia.trim()||undefined,latitud:coord(this.latitud),longitud:coord(this.longitud),
    altitudM:property.altitudM??undefined}};
  const general$=geoChanged?this.keys.idempotent(`APAPPSS:predio:editar:${id}`,solicitud,key=>
   this.prediosApi.prediosEditar({id,xIdempotencyKey:key,propertyUpdateRequest:solicitud},'body',false,{transferCache:false})
    .pipe(map(()=>null))):of(null);
  this.guardando.set(true);this.error.set(null);
  general$.pipe(switchMap(()=>techChanged?this.e1.ficha(uotId,id,{
   areaTotalHa:this.superficieHa!,areaCultivableHa:this.areaCultivableHa??undefined,
   tipoRiego:this.tipoRiego.trim()||undefined},this.convenioId):of(null)),
   finalize(()=>this.guardando.set(false))).subscribe({
   next:()=>{this.toast.success('Predio actualizado');this.finish({saved:true,predioId:id});},
   error:e=>{this.error.set(mapOpenApiError(e).message);this.toast.error('No se completó la edición','Actualice la ficha antes de volver a guardar.');},
  });
 }
}
