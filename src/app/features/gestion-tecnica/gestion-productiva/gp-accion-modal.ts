import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSeedling, faXmark } from '@fortawesome/free-solid-svg-icons';
import { catchError, concatMap, finalize, from, Observable, of, toArray } from 'rxjs';
import { GpGeneralFacade } from './gp-general.facade';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { PermissionService } from '../../../core/access/permission.service';
import { GpActividadResponse } from '../../../infrastructure/openapi/generated/model/gpActividadResponse';
import { GpCatalogoResponse } from '../../../infrastructure/openapi/generated/model/gpCatalogoResponse';
import { GpEventoResponse } from '../../../infrastructure/openapi/generated/model/gpEventoResponse';
import { GpRubro } from '../../../infrastructure/openapi/generated/model/gpRubro';
import { GpCensoResponse } from '../../../infrastructure/openapi/generated/model/gpCensoResponse';
import { GpRazaConteo } from '../../../infrastructure/openapi/generated/model/gpRazaConteo';
import { GpVariedadSuperficie } from '../../../infrastructure/openapi/generated/model/gpVariedadSuperficie';
import { GpTipoEvento } from '../../../infrastructure/openapi/generated/model/gpTipoEvento';
import { E3FileDropzoneComponent } from '../../../shared/files/file-dropzone/file-dropzone';
import { CapacityMeterComponent } from '../../../shared/data-display/capacity-meter/capacity-meter';
import { superficieLimitada } from '../../../shared/forms/limited-surface/limited-surface';

type Mode='actividad'|'editar'|'censo'|'evento'|'catalogo';
type Kind='CULTIVO'|'CRIANZA'|'VARIEDAD'|'RAZA'|'PROBLEMA'|'TRATAMIENTO';
@Component({selector:'app-gp-accion-modal',standalone:true,imports:[FormsModule,FaIconComponent,E3FileDropzoneComponent,CapacityMeterComponent],
 templateUrl:'./gp-accion-modal.html',styleUrl:'./gestion-productiva.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class GpAccionModal {
  @ViewChild('dialog',{static:true})private dialog!:ElementRef<HTMLDialogElement>;
  private readonly gp=inject(GpGeneralFacade);private readonly uot=inject(UotContextStore);private readonly toast=inject(ToastService);private readonly permissions=inject(PermissionService);
  readonly modalIcon=faSeedling;readonly closeIcon=faXmark;
  readonly mode=signal<Mode>('actividad');readonly saving=signal(false);readonly error=signal<string|null>(null);
  readonly razaExcedida=signal(false);
  readonly selected=signal<GpActividadResponse|null>(null);
  readonly catalogos=signal<GpCatalogoResponse[]>([]);
  readonly events=signal<GpEventoResponse[]>([]);
  private parcelaId=0;private onSaved:(()=>void)|null=null;maxCropAreaM2:number|null=null;parcelaTotalM2:number|null=null;
  private linkedProblemId:number|null=null;
  rubro:GpRubro='CULTIVO';cultivoId=0;especieId=0;variedadId=0;nombre='';estado=true;
  cantidadAproximada:number|null=null;cantidadExacta:number|null=null;
  superficieAproximadaM2:number|null=null;superficieExactaM2:number|null=null;
  tipoRiego='';fuenteAgua='';
  motivoCambio='';
  readonly motivosCrianza=[{codigo:'COMPRA',nombre:'Compra de animales'},{codigo:'NACIMIENTO',nombre:'Nacimientos'},{codigo:'VENTA',nombre:'Venta de animales'},{codigo:'FALLECIMIENTO',nombre:'Fallecimiento o enfermedad'},{codigo:'AJUSTE',nombre:'Corrección del censo'}];
  readonly motivosCultivo=[{codigo:'AMPLIACION',nombre:'Ampliación de siembra'},{codigo:'REDUCCION',nombre:'Reducción de superficie'},{codigo:'COSECHA',nombre:'Cosecha'},{codigo:'AJUSTE',nombre:'Corrección de medición'}];
  razasDetalle:GpRazaConteo[]=[];variedadesDetalle:GpVariedadSuperficie[]=[]; afectacion='SIN_DATO'; cantidadAfectada:number|null=null;fotos:File[]=[];fecha='';observacion='';
  tipo:GpTipoEvento='OBSERVACION';problemaId=0;tratamientoId=0;respuestaAId=0;respuestaBusqueda='';
  kind:Kind='CULTIVO';codigo='';nombreCatalogo='';descripcion='';padreId=0;
  readonly editingCatalog=signal<GpCatalogoResponse|null>(null);
  readonly catalogKindLocked=signal(false);
  readonly catalogParentLocked=signal(false);
  readonly tipoEventos:readonly GpTipoEvento[]=['OBSERVACION','EVALUACION','RESPUESTA'];
  canUseType(t:GpTipoEvento):boolean{return this.permissions.has(t==='INCIDENCIA'||t==='TRATAMIENTO'?'SANIDAD_CREAR':t==='EVALUACION'?'EVALUACIONES_CREAR':'PREDIOS_EDITAR');}
  /** Etiqueta estable para localizar actuaciones anteriores; no se usan IDs de usuario como identidad visible. */
  raizDeActuacion(e:GpEventoResponse):number {
    const lookup=new Map(this.events().map(item=>[item.eventoId,item]));
    let current=e;
    const vistos=new Set<number>();
    while(current.tipo==='RESPUESTA' && current.respuestaAId && !vistos.has(current.eventoId)){
      vistos.add(current.eventoId);
      const padre=lookup.get(current.respuestaAId);
      if(!padre||vistos.has(padre.eventoId))break;
      current=padre;
    }
    return current.eventoId;
  }
  etiquetaActuacion(e:GpEventoResponse):string {
    const fecha = e.fechaRegistro ? this.formatearFechaActuacion(e.fechaRegistro) : 'Sin fecha';
    const detalle = String(e.problema || e.observacion || e.tratamiento || '').trim().slice(0, 38);
    return `#${e.eventoId}${e.tipo==='RESPUESTA'?` (hilo #${this.raizDeActuacion(e)})`:''} · ${this.etiquetaTipo(e.tipo)} · ${e.usuarioNombre || 'No identificado'} · ${fecha}${detalle ? ' · '+detalle : ''}`;
  }
  private etiquetaTipo(tipo:string):string {
    return ({OBSERVACION:'Observación',EVALUACION:'Evaluación',RESPUESTA:'Respuesta',INCIDENCIA:'Incidencia',TRATAMIENTO:'Tratamiento'} as Record<string,string>)[tipo] || tipo;
  }
  private formatearFechaActuacion(value:string):string {
    const raw=/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)?value:value+'Z';
    const date=new Date(raw);
    return Number.isNaN(date.getTime())?value:date.toLocaleString('es-PE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  opcionesRespuesta():GpEventoResponse[] {
    const q=this.respuestaBusqueda.trim().toLocaleLowerCase('es-PE');
    return [...this.events()].filter(e=>e.eventoId===this.respuestaAId || !q ||
      `${e.eventoId} ${e.tipo} ${e.usuarioNombre||''} ${e.observacion||''} ${e.problema||''} ${e.fechaRegistro||''} ${this.etiquetaActuacion(e)}`.toLocaleLowerCase('es-PE').includes(q))
      .sort((a,b)=>Number(b.tipo==='INCIDENCIA')-Number(a.tipo==='INCIDENCIA') || b.eventoId-a.eventoId);
  }
  show(mode:Mode,parcelaId:number,actividad:GpActividadResponse|null,catalogos:GpCatalogoResponse[],events:GpEventoResponse[],onSaved:()=>void,censoActual:GpCensoResponse|null=null,maxCropAreaM2:number|null=null,parcelaTotalM2:number|null=null):void{
    this.mode.set(mode);this.parcelaId=parcelaId;this.maxCropAreaM2=maxCropAreaM2;this.parcelaTotalM2=parcelaTotalM2;this.selected.set(actividad);this.catalogos.set(catalogos);this.events.set(events);this.onSaved=onSaved;
    this.error.set(null);this.razaExcedida.set(false);this.rubro=actividad?.rubro??'CULTIVO';this.cultivoId=0;this.especieId=0;this.variedadId=0;this.editingCatalog.set(null);this.catalogKindLocked.set(false);this.catalogParentLocked.set(false);
    this.nombre=actividad?.nombre??'';this.estado=actividad?.estado??true;
    this.cantidadAproximada=actividad?.cantidadAproximada??null;
    this.cantidadExacta=actividad?.cantidadExacta??null;
    this.superficieAproximadaM2=actividad?.superficieAproximadaM2??null;
    this.superficieExactaM2=actividad?.superficieExactaM2??null;
    this.razasDetalle=mode==='censo' ? (censoActual?.razas??[]).map(r=>({...r,cantidadAproximada:null})) : [];
    this.variedadesDetalle=mode==='censo'?(censoActual?.variedades??[]).map(v=>({...v})):[];
    this.tipoRiego=actividad?.tipoRiego??'';this.fuenteAgua=actividad?.fuenteAgua??'';
    this.fecha='';this.observacion='';this.motivoCambio='';this.tipo=this.tipoEventos.find(t=>this.canUseType(t))??'OBSERVACION';this.problemaId=0;this.tratamientoId=0;
    this.respuestaAId=0;this.respuestaBusqueda='';this.fotos=[];this.afectacion='SIN_DATO';this.cantidadAfectada=null;this.kind='CULTIVO';this.codigo='';this.nombreCatalogo='';this.descripcion='';this.padreId=0;this.linkedProblemId=null;
    this.dialog.nativeElement.showModal();
  }
  /** Mismo formulario; abre una respuesta vinculada a una actuación existente. */
  showReplyTo(parcelaId:number,actividad:GpActividadResponse,catalogos:GpCatalogoResponse[],events:GpEventoResponse[],padreId:number,onSaved:()=>void):void {
    if(!events.some(e=>e.eventoId===padreId))return;
    this.show('evento',parcelaId,actividad,catalogos,events,onSaved);
    this.tipo='RESPUESTA';this.respuestaAId=padreId;
  }
  showCatalogCreate(kind:Kind,catalogos:GpCatalogoResponse[],onSaved:()=>void,rubro:GpRubro='CULTIVO',lockKind=false):void {
    this.show('catalogo',0,null,catalogos,[],onSaved);
    this.kind=kind;this.rubro=rubro;this.catalogKindLocked.set(lockKind);
  }
  showCatalogTreatmentForDisease(problem:GpCatalogoResponse,catalogos:GpCatalogoResponse[],onSaved:()=>void):void {
    if(problem.tipo!=='PROBLEMA_CULTIVO' && problem.tipo!=='PROBLEMA_CRIANZA')return;
    this.showCatalogCreate('TRATAMIENTO',catalogos,onSaved,
      problem.tipo==='PROBLEMA_CRIANZA'?'CRIANZA':'CULTIVO',true);
    this.linkedProblemId=problem.id;
  }
  contextName():string {
    const current=this.selected();if(current)return `${current.rubro==='CRIANZA'?'Crianza':'Cultivo'} · ${current.nombre}${current.variedadNombre?' · '+current.variedadNombre:''} · Actividad #${current.actividadId}`;
    if(this.mode()==='actividad'){
      const chosen=this.rubro==='CRIANZA'?this.options('CRIANZA').find(x=>x.id===this.especieId):this.options('CULTIVO').find(x=>x.id===this.cultivoId);
      return `${this.rubro==='CRIANZA'?'Crianza animal':'Agricultura'}${chosen?' · '+chosen.nombre:''}`;
    }
    if(this.mode()==='catalogo'){
      const relationId=this.kind==='TRATAMIENTO'?this.linkedProblemId:null;
      const relation=relationId ? this.catalogos().find(x=>x.id===relationId && (x.tipo==='PROBLEMA_CULTIVO'||x.tipo==='PROBLEMA_CRIANZA')) : null;
      if(relation)return `Enfermedad · ${relation.nombre}`;
      const parent=this.catalogos().find(x=>x.id===this.padreId && x.tipo===(this.kind==='RAZA'?'CRIANZA':'CULTIVO'));
      return parent?`${this.kind==='RAZA'?'Especie animal':'Cultivo'} · ${parent.nombre}`:'';
    }
    return '';
  }
  showCatalogEdit(row:GpCatalogoResponse,catalogos:GpCatalogoResponse[],onSaved:()=>void):void {
    this.show('catalogo',0,null,catalogos,[],onSaved);
    this.editingCatalog.set(row);this.catalogKindLocked.set(true);
    this.kind=(row.tipo==='PROBLEMA_CULTIVO'||row.tipo==='PROBLEMA_CRIANZA'?'PROBLEMA':row.tipo) as Kind;
    this.rubro=row.tipo==='PROBLEMA_CRIANZA'?'CRIANZA':'CULTIVO';
    this.padreId=row.padreId??0;
    this.nombreCatalogo=row.nombre??'';
    this.codigo=row.codigo??'';
    this.descripcion=row.descripcion??'';
  }
  showCatalogChild(parent:GpCatalogoResponse,catalogos:GpCatalogoResponse[],onSaved:()=>void,lockKind=false):void {
    this.show('catalogo',0,null,catalogos,[],onSaved);
    this.kind=parent.tipo==='CULTIVO'?'VARIEDAD':'RAZA';
    this.padreId=parent.id;this.catalogKindLocked.set(lockKind);this.catalogParentLocked.set(lockKind);
  }
  close():void{if(!this.saving())this.dialog.nativeElement.close();}
  options(type:string){return this.catalogos().filter(x=>x.tipo===type);}
  problems(){const a=this.selected();if(!a)return [];
    return this.options(a.rubro==='CULTIVO'?'PROBLEMA_CULTIVO':'PROBLEMA_CRIANZA').filter(x=>
      x.padreId===(a.rubro==='CULTIVO'?a.cultivoId:a.especieId));}
  treatments(){const links=this.options('RELACION').filter(x=>x.padreId===this.problemaId).map(x=>x.id);
    return this.options('TRATAMIENTO').filter(x=>links.includes(x.id));}
  catalogParents(){return this.options(this.rubro);}
  isAnimal():boolean{return this.mode()==='actividad' ? this.rubro==='CRIANZA' : this.selected()?.rubro==='CRIANZA';}
  breedOptions(){const specie=this.mode()==='actividad'?this.especieId:this.selected()?.especieId;
    return this.options('RAZA').filter(x=>x.padreId===specie);}
  resetBreedSelection():void{this.razasDetalle=[];this.variedadesDetalle=[];this.variedadId=0;this.razaExcedida.set(false);}
  varietyOptions(){const cultivo=this.mode()==='actividad'?this.cultivoId:this.selected()?.cultivoId;
    return this.options('VARIEDAD').filter(x=>x.padreId===cultivo);}
  addVariety():void{this.variedadesDetalle=[...this.variedadesDetalle,{variedadId:0,superficieM2:0}];}
  removeVariety(index:number):void{this.variedadesDetalle=this.variedadesDetalle.filter((_,i)=>i!==index);}
  /** Superficie libre para esta variedad, descontando todas las demás. */
  limiteVariedadM2(index: number): number {
    const total = Math.max(0, Number(this.superficieExactaM2 ?? 0));
    const asignada = this.variedadesDetalle.reduce((suma, variedad, i) =>
      i === index ? suma : suma + Math.max(0, Number(variedad.superficieM2 ?? 0)), 0);
    return Math.max(0, Math.round((total - asignada) * 100) / 100);
  }

  onVariedadChange(index: number, value: number | null): void {
    if (index < 0 || index >= this.variedadesDetalle.length) return;
    const numero = Number(value);
    const maximo = this.limiteVariedadM2(index);
    const superficie = value === null || !Number.isFinite(numero)
      ? 0 : Math.round(Math.min(Math.max(0, numero), maximo) * 100) / 100;
    this.variedadesDetalle = this.variedadesDetalle.map((item, i) =>
      i === index ? { ...item, superficieM2: superficie } : item);
  }

  /** Las variedades no pueden ocupar más superficie que el cultivo. */
  onVariedadInput(index: number, event: Event): void {
    if (index < 0 || index >= this.variedadesDetalle.length) return;
    const superficie = superficieLimitada(event, this.limiteVariedadM2(index), 0);
    this.onVariedadChange(index, superficie);
  }

  /** Si disminuye el área del cultivo, ajusta el detalle sin superar el nuevo total. */
  private ajustarVariedadesAlCultivo(): void {
    let restante = Math.max(0, Number(this.superficieExactaM2 ?? 0));
    this.variedadesDetalle = this.variedadesDetalle.map(item => {
      const actual = Math.max(0, Number(item.superficieM2 ?? 0));
      const superficie = Math.round(Math.min(actual, restante) * 100) / 100;
      restante = Math.max(0, Math.round((restante - superficie) * 100) / 100);
      return superficie === actual ? item : { ...item, superficieM2: superficie };
    });
  }

  totalRazas():number {return this.razasDetalle.reduce((total,r)=>total+Number(r.cantidadExacta??0),0);}
  totalVariedades():number {return Math.round(this.variedadesDetalle.reduce((total,v)=>total+Number(v.superficieM2??0),0)*100)/100;}
  restantesRazas():number {return Math.max(0,Number(this.cantidadExacta??0)-this.totalRazas());}
  addBreed():void{this.razasDetalle=[...this.razasDetalle,{razaId:0,cantidadAproximada:null,cantidadExacta:0}];this.razaExcedida.set(false);}
  removeBreed(index:number):void{this.razasDetalle=this.razasDetalle.filter((_,i)=>i!==index);this.razaExcedida.set(false);}

  /** Máximo disponible para una raza, descontando las demás. */
  limiteRaza(index:number):number {
    const total=this.cantidadExacta;
    if(total===null || !Number.isInteger(total) || total<0)return 0;
    const asignadas=this.razasDetalle.reduce((suma,raza,i)=>{
      if(i===index)return suma;
      const actual=Number(raza.cantidadExacta??0);
      return suma+(Number.isInteger(actual)&&actual>0?actual:0);
    },0);
    return Math.max(0,total-asignadas);
  }

  /** Restringe una raza al total disponible, también al pegar cantidades. */
  onRazaChange(index:number,value:number|null):void {
    if(index<0||index>=this.razasDetalle.length)return;
    const numero=value===null?0:Number(value);
    const maximo=this.limiteRaza(index);
    const cantidad=Number.isFinite(numero)?Math.min(Math.max(0,Math.trunc(numero)),maximo):0;
    this.razaExcedida.set(Number.isFinite(numero)&&(numero>maximo||numero<0||!Number.isInteger(numero)));
    this.razasDetalle=this.razasDetalle.map((raza,i)=>i===index?{...raza,cantidadExacta:cantidad}:raza);
  }

  onRazaInput(index:number,event:Event):void {
    const input=event.target as HTMLInputElement;
    const numero=input.valueAsNumber;
    this.onRazaChange(index,Number.isFinite(numero)?numero:null);
    if(Number.isFinite(numero)){
      const actual=this.razasDetalle[index]?.cantidadExacta??0;
      if(numero!==actual)input.value=String(actual);
    }
  }

  /** Al reducir el total, ajusta las razas en su orden sin superar la cantidad. */
  private ajustarRazasAlTotal():void {
    let restantes=Math.max(0,Number(this.cantidadExacta??0));
    this.razasDetalle=this.razasDetalle.map(raza=>{
      const valor=Number(raza.cantidadExacta??0);
      const anterior=Number.isFinite(valor)?Math.max(0,Math.trunc(valor)):0;
      const cantidad=Math.min(anterior,restantes);
      restantes-=cantidad;
      return cantidad===raza.cantidadExacta?raza:{...raza,cantidadExacta:cantidad};
    });
  }

  onCantidadAnimalesChange(value:number|null):void {
    const numero=value===null?null:Number(value);
    this.cantidadExacta=numero===null||!Number.isFinite(numero)?null:Math.max(0,Math.trunc(numero));
    const totalAnterior=this.totalRazas();
    this.ajustarRazasAlTotal();
    this.razaExcedida.set(this.totalRazas()<totalAnterior);
  }

  onCantidadAnimalesInput(event:Event):void {
    const input=event.target as HTMLInputElement;
    const numero=input.valueAsNumber;
    if(numero!==this.cantidadExacta && !(Number.isNaN(numero)&&this.cantidadExacta===null))
      this.onCantidadAnimalesChange(Number.isFinite(numero)?numero:null);
    if(Number.isFinite(numero)&&numero!==this.cantidadExacta)input.value=String(this.cantidadExacta??'');
  }
  /** Limita la superficie de cultivo o crianza según la parcela disponible. */
  onSuperficieInput(event: Event): void {
    this.superficieExactaM2 = superficieLimitada(event, this.maxCropAreaM2);
    this.ajustarVariedadesAlCultivo();
    if (this.error() === 'La superficie supera el espacio disponible de la parcela.') {
      this.error.set(null);
    }
  }

  private checkMeasurements():boolean {
    if(this.isAnimal()){
      if(!Number.isInteger(this.cantidadExacta)||this.cantidadExacta===null||this.cantidadExacta<0||(this.mode()==='actividad'&&this.cantidadExacta===0)){
        this.error.set('Ingrese la cantidad exacta de animales.');return false;
      }
      const area=this.superficieExactaM2;
      if(area===null||!Number.isFinite(area)||area<=0||Math.abs(area*100-Math.round(area*100))>0.0001){
        this.error.set('Indique la superficie exacta de crianza en m².');return false;
      }
      if(this.maxCropAreaM2!==null && area>this.maxCropAreaM2+0.0001){
        this.error.set('La superficie supera el espacio disponible de la parcela.');return false;
      }
      const ids=new Set<number>();let subtotal=0;
      for(const r of this.razasDetalle){
        if(!this.breedOptions().some(o=>o.id===r.razaId)||ids.has(r.razaId)||
          r.cantidadExacta==null||!Number.isInteger(r.cantidadExacta)||r.cantidadExacta<0){
          this.error.set('Seleccione razas distintas e indique sus cantidades.');return false;
        }
        ids.add(r.razaId);subtotal+=r.cantidadExacta;
      }
      if(subtotal>this.cantidadExacta){this.error.set('La suma por razas supera el censo.');return false;}
    }else{
      const total=this.superficieExactaM2;
      if(total===null||!Number.isFinite(total)||total<=0||Math.abs(total*100-Math.round(total*100))>0.0001){
        this.error.set('Ingrese una superficie exacta válida en m².');return false;
      }
      if(this.maxCropAreaM2!==null&&total>this.maxCropAreaM2+0.0001){
        this.error.set('La superficie supera el espacio disponible de la parcela.');return false;
      }
      const ids=new Set<number>();let subtotal=0;
      for(const v of this.variedadesDetalle){
        if(!this.varietyOptions().some(o=>o.id===v.variedadId)||ids.has(v.variedadId)||
          !Number.isFinite(v.superficieM2)||v.superficieM2<=0||
          Math.abs(v.superficieM2*100-Math.round(v.superficieM2*100))>0.0001){
          this.error.set('Seleccione variedades distintas con superficies válidas.');return false;
        }
        ids.add(v.variedadId);subtotal+=v.superficieM2;
      }
      if(subtotal>total+0.0001){this.error.set('La suma por variedades supera la superficie sembrada.');return false;}
    }
    return true;
  }
  private measurementBody(){return {
    cantidadAproximada:null,
    cantidadExacta:this.isAnimal()?this.cantidadExacta:null,
    superficieAproximadaM2:null,
    superficieExactaM2:this.superficieExactaM2,
    razas:this.isAnimal()?this.razasDetalle.map(r=>({...r,cantidadAproximada:null})):[],
    variedades:this.isAnimal()?[]:this.variedadesDetalle.map(v=>({variedadId:v.variedadId,superficieM2:v.superficieM2})),
  };}
  setPhotos(files:File[]):void{this.fotos=files;this.error.set(null);}
  save():void{const uot=this.mode()==='catalogo'
    ?(this.uot.selectedId()??this.uot.memberships().find(x=>x.predeterminada)?.uotId??this.uot.memberships()[0]?.uotId??null)
    :this.uot.selectedId();if(!uot||this.saving())return;
    this.error.set(null);let request:Observable<number>|null=null;
    const a=this.selected();const obs=this.observacion.trim();
    if(this.mode()==='actividad'){
      const choice=this.rubro==='CULTIVO'?this.cultivoId:this.especieId;
      if(!choice){this.error.set('Selecciona un cultivo o especie.');return;}
      if(!this.checkMeasurements())return;
      if(this.rubro==='CULTIVO' && (this.tipoRiego.trim().length>30 || this.fuenteAgua.trim().length>150)) {
        this.error.set('Revise los datos de riego y fuente de agua.');return;
      }
      request=this.gp.crearActividad(uot,{parcelaId:this.parcelaId,rubro:this.rubro,
        cultivoId:this.rubro==='CULTIVO'?choice:null,especieId:this.rubro==='CRIANZA'?choice:null,
        variedadId:null,
        tipoRiego:this.rubro==='CULTIVO'?this.tipoRiego.trim()||null:null,
        fuenteAgua:this.rubro==='CULTIVO'?this.fuenteAgua.trim()||null:null,
        ...this.measurementBody()});
    }else if(this.mode()==='editar'){
      if(!a)return;
      if(obs.length<3){this.error.set('Indica el motivo de la modificación.');return;}
      request=this.gp.editarActividad(uot,a.actividadId,{nombre:this.nombre.trim()||null,estado:true,motivo:obs});
    }else if(this.mode()==='censo'){
      if(!a)return;
      if(!this.checkMeasurements())return;
      const motivos=this.isAnimal()?this.motivosCrianza:this.motivosCultivo;
      const motivo=motivos.find(m=>m.codigo===this.motivoCambio);
      if(!motivo){this.error.set('Selecciona el motivo del cambio.');return;}
      if(obs.length<3){this.error.set('Explica el cambio con al menos 3 caracteres.');return;}
      request=this.gp.crearCenso(uot,a.actividadId,{...this.measurementBody(),observacion:`${motivo.nombre}: ${obs}`,
        versionAnteriorId:a.versionActualId??null});
    }else if(this.mode()==='evento'){
      if(!a||obs.length<3){this.error.set('Describe la actuación con al menos 3 caracteres.');return;}
      if((this.tipo==='INCIDENCIA'||this.tipo==='TRATAMIENTO')&&!this.problemaId){this.error.set('Selecciona la enfermedad o problema.');return;}
      if(this.tipo==='TRATAMIENTO'&&!this.tratamientoId){this.error.set('Selecciona el tratamiento.');return;}
      if(this.tipo==='RESPUESTA'&&!this.respuestaAId){this.error.set('Selecciona el registro al que respondes.');return;}
      if(this.afectacion!=='SIN_DATO' && (this.cantidadAfectada===null || !Number.isInteger(this.cantidadAfectada) || this.cantidadAfectada<0)){
        this.error.set('Indica una cantidad afectada válida.');return;
      }
      request=this.gp.crearEvento(uot,a.actividadId,{tipo:this.tipo,observacion:obs,fechaHecho:this.fecha ? `${this.fecha}T12:00:00` : null,
        cantidadAfectada:this.afectacion==='SIN_DATO'?null:this.cantidadAfectada,
        afectadosAproximado:this.afectacion==='SIN_DATO'?null:this.afectacion==='APROXIMADO',
        problemaId: this.tipo==='INCIDENCIA'||this.tipo==='TRATAMIENTO'?this.problemaId:null,
        tratamientoId:this.tipo==='TRATAMIENTO'?this.tratamientoId:null,
        respuestaAId:this.tipo==='RESPUESTA'?this.respuestaAId:null});
    }else{
      if(this.nombreCatalogo.trim().length<2){this.error.set('Ingresa el nombre.');return;}
      if(this.editingCatalog()){const current=this.editingCatalog()!;
        request=this.gp.actualizarCatalogo(uot,current.tipo,current.id,{
          codigo:this.codigo.trim()||null,nombre:this.nombreCatalogo.trim(),padreId:this.padreId||null,
          descripcion:this.descripcion.trim()||null,estado:true});
      }else if(this.kind==='VARIEDAD'){
        if(!this.padreId){this.error.set('Selecciona el cultivo.');return;}
        request=this.gp.crearVariedad(uot,{cultivoId:this.padreId,codigo:'AUTO',nombre:this.nombreCatalogo.trim(),descripcion:this.descripcion.trim()||null});
      }else if(this.kind==='CULTIVO')request=this.gp.crearCultivo(uot,{codigo:'AUTO',nombre:this.nombreCatalogo.trim(),descripcion:this.descripcion.trim()||null});
      else if(this.kind==='CRIANZA')request=this.gp.crearEspecie(uot,{codigo:'AUTO',nombre:this.nombreCatalogo.trim(),descripcion:this.descripcion.trim()||null});
      else if(this.kind==='RAZA'){
        if(!this.padreId){this.error.set('Selecciona la especie animal.');return;}
        request=this.gp.crearRaza(uot,{especieId:this.padreId,nombre:this.nombreCatalogo.trim(),descripcion:this.descripcion.trim()||null});
      }else if(this.kind==='PROBLEMA'){
        if(!this.padreId){this.error.set('Selecciona la especie o cultivo.');return;}
        request=this.gp.crearProblema(uot,{cultivoId:this.rubro==='CULTIVO'?this.padreId:null,
          especieId:this.rubro==='CRIANZA'?this.padreId:null,nombre:this.nombreCatalogo.trim()});
      }else if(this.kind==='TRATAMIENTO'){
        if(!this.linkedProblemId){this.error.set('Abre el detalle de la enfermedad antes de crear el tratamiento.');return;}
        request=this.gp.crearTratamiento(uot,{
          nombre:this.nombreCatalogo.trim(),descripcion:this.descripcion.trim()||null,
          problemaId:this.linkedProblemId
        });
      }
    }
    if(request===null){
      this.error.set('No se encontró una operación válida para este formulario.');
      return;
    }
    this.saving.set(true);
    const esEvento=this.mode()==='evento';const fotos=[...this.fotos];
    request.pipe(finalize(()=>{if(!esEvento||!fotos.length)this.saving.set(false);})).subscribe({
      next:id=>{
        const terminar=(mensaje:string)=>{this.saving.set(false);this.toast.success(mensaje);this.dialog.nativeElement.close();this.onSaved?.();};
        if(esEvento && fotos.length){
          from(fotos).pipe(concatMap(f=>this.gp.subirFoto(uot,id,f).pipe(
             catchError(()=>of(null)))),toArray(),finalize(()=>this.saving.set(false))).subscribe({
            next:ids=>{
              const ok=ids.filter(v=>v!==null).length;
              if(ok<fotos.length)this.toast.error('Algunas fotografías no se adjuntaron',`${ok} de ${fotos.length} guardadas. La actuación sí se registró.`);
              terminar(ok===fotos.length?'Actuación y fotografías guardadas':'Actuación guardada');
            },
            error:()=>terminar('Actuación guardada')
          });
        }else terminar('Registro guardado');
      },
      error:e=>this.error.set(mapOpenApiError(e).message)
    });
  }
}
