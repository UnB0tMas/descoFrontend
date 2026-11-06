import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMapLocationDot, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { GeographyCascadeComponent, GeographySelection } from '../../../shared/forms/geography-cascade/geography-cascade';
import { PredioMapComponent } from '../../gestion-tecnica/predios/adapter/in/ui/components/predio-map/predio-map';
import { ObtenerProductorUseCase } from '../../gestion-tecnica/productores/application/use-case/obtener-productor.use-case';
import { ProductorDetalle } from '../../gestion-tecnica/productores/domain/productor-detalle.model';
import { ExpedienteE1UseCase } from '../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { registroPredioError } from '../../../shared/feedback/expediente-error/registro-predio-error';

export interface AltaPredioModalResult { saved:boolean; predioId?:number; }
@Component({selector:'app-apappss-predio-alta',standalone:true,
 imports:[FormsModule,DecimalPipe,FaIconComponent,GeographyCascadeComponent,PredioMapComponent],
 templateUrl:'./apappss-predio-alta.html',styleUrls:['../../gestion-tecnica/gestion-productiva/gestion-productiva.css','./apappss-predio-alta.css'],
 changeDetection:ChangeDetectionStrategy.OnPush})
export class ApappssPredioAltaPage {
 @ViewChild('dialog',{static:true}) private dialog!:ElementRef<HTMLDialogElement>;
 private readonly uot=inject(UotContextStore);
 private readonly permission=inject(PermissionService);
 private readonly socioApi=inject(ObtenerProductorUseCase);
 private readonly e1=inject(ExpedienteE1UseCase);
 private readonly toast=inject(ToastService);
 readonly icon=faMapLocationDot;readonly closeIcon=faXmark;
 readonly socio=signal<ProductorDetalle|null>(null);
 readonly loading=signal(false);readonly guardando=signal(false);
 readonly error=signal<string|null>(null);
 readonly puedeCrear=computed(()=>this.permission.hasAll(['PREDIOS_CREAR','APAPPSS_PREDIOS_CREAR']));
 private resolver:((r:AltaPredioModalResult)=>void)|null=null;
 socioId=0;convenioId=0;nombre='';distrito='';centroPobladoId:number|null=null;referencia='';
 latitud:number|null=null;longitud:number|null=null;superficieHa:number|null=null;
 open(socioId:number,convenioId:number):Promise<AltaPredioModalResult>{
  if(!this.uot.selectedId()||!this.puedeCrear()||socioId<=0||convenioId<=0)return Promise.resolve({saved:false});
  this.socioId=socioId;this.convenioId=convenioId;
  this.nombre='';this.distrito='';this.centroPobladoId=null;this.referencia='';
  this.latitud=null;this.longitud=null;this.superficieHa=null;
  this.error.set(null);this.socio.set(null);this.loading.set(true);
  this.dialog.nativeElement.showModal();
  this.socioApi.execute(socioId).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:s=>{if(this.socioId===socioId)this.socio.set(s);},
   error:e=>this.error.set(mapOpenApiError(e).message),
  });
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
 formularioValido():boolean{return !!this.socio()?.estado&&this.puedeCrear()&&this.nombre.trim().length>=2&&/^\d{6}$/.test(this.distrito)
  &&this.superficieHa!==null&&Number.isFinite(this.superficieHa)&&this.superficieHa>0&&this.superficieHa<=999999.9999
  &&Math.abs(this.superficieHa*10000-Math.round(this.superficieHa*10000))<0.00001&&this.coordenadasValidas();}

guardar():void{
 const uotId=this.uot.selectedId(), socio=this.socio();
 if(!uotId||!socio||socio.socioId!==this.socioId||!this.formularioValido()||this.guardando()){
  this.error.set(this.motivoInvalido()||'Verifique los datos del socio y del convenio.');
  return;
 }
 // org.Socio.socio_id es la PK/FK de org.Persona.persona_id.
 // Evita consultar /personas por documento y depender del permiso adicional PREDIOS_VER.
 // La superficie y el vinculo se guardan juntos por V577, sin segundo PUT de ficha.
 this.guardando.set(true);this.error.set(null);
 this.e1.altaPredio(uotId,{
  personaId:this.socioId,
  nombre:this.nombre.trim(),distritoCodigo:this.distrito,
  centroPobladoId:this.centroPobladoId??undefined,
  referencia:this.referencia.trim()||undefined,
  latitud:this.latitud===null?undefined:Number(this.latitud.toFixed(6)),
  longitud:this.longitud===null?undefined:Number(this.longitud.toFixed(6)),
  areaTotalHa:this.superficieHa!,
 },this.convenioId).pipe(finalize(()=>this.guardando.set(false))).subscribe({
  next:id=>{this.toast.success('Predio registrado correctamente');this.finish({saved:true,predioId:id});},
  error:e=>{
   this.error.set(registroPredioError(e));
  },
 });
}
motivoInvalido():string|null{
 if(!this.socio())return 'No se pudo cargar la información del socio.';
 if(!this.puedeCrear())return 'Su usuario no tiene permisos para registrar predios en este convenio.';
 if(this.nombre.trim().length<2)return 'Indique el nombre del predio (mínimo dos caracteres).';
 if(!/^\d{6}$/.test(this.distrito))return 'Seleccione el distrito del predio.';
 if(this.superficieHa===null||!Number.isFinite(this.superficieHa)||this.superficieHa<=0||this.superficieHa>999999.9999)
  return 'Indique una superficie válida en hectáreas.';
 if(Math.abs(this.superficieHa*10000-Math.round(this.superficieHa*10000))>=0.00001)
  return 'La superficie admite hasta cuatro decimales.';
 if(!this.coordenadasValidas())return 'Seleccione un punto GPS en el mapa. Puede usar Ubicación actual o marcarlo manualmente.';
 return null;
}
}
