import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy,Component,ElementRef,EventEmitter,Input,OnChanges,Output,SimpleChanges,ViewChild,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEye,faArrowRight,faPen,faCheck,faTrash} from '@fortawesome/free-solid-svg-icons';
import {finalize,forkJoin,of,switchMap} from 'rxjs';
import {PermissionService} from '../../../../../../../core/access/permission.service';
import {ToastService} from '../../../../../../../shared/feedback/toast-center/toast.service';
import {LocalDocumentApiService} from '../../../../../../../shared/files/local-document-api.service';
import {mapOpenApiError} from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {AmbitoE3,CatalogosE3,EstadoPlantaE3} from '../../../../domain/planta-paltera.model';
import {E3ClinicalService,AnalisisE3,ComentarioE3,EnfermedadDetalleE3,EnfermedadItemE3,TratamientoItemE3} from './e3-clinical.service';
import {E3ExpedienteE4Service,NotaEnfermedadE4} from './e3-expediente-e4.service';
import {E3EnfermedadDetalleComponent} from './e3-enfermedad-detalle';
import {ListViewSwitchComponent} from '../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import {RecordCardComponent} from '../../../../../../../shared/data-display/record-card/record-card';
import {E3FileDropzoneComponent} from './e3-file-dropzone';

@Component({selector:'app-e3-planta-salud',standalone:true,imports:[CommonModule,FormsModule,FaIconComponent,E3EnfermedadDetalleComponent,ListViewSwitchComponent,RecordCardComponent,E3FileDropzoneComponent],
 templateUrl:'./e3-planta-salud.html',styleUrl:'./e3-planta-salud.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class E3PlantaSaludComponent implements OnChanges {
 readonly viewIcon=faEye;readonly treatmentIcon=faArrowRight;readonly editIcon=faPen;readonly controlIcon=faCheck;readonly removeIcon=faTrash;
 @Input({required:true}) ambito!:AmbitoE3;
 @Input({required:true}) plantaId!:number;
 @Input({required:true}) estadoPlanta!:EstadoPlantaE3;
 @Input({required:true}) catalogos!:CatalogosE3;
 @Input() editable=false;
 @Input() modo:'enfermedades'|'tratamientos'|'comentarios'='enfermedades';
 @Input() enfermedadInicial=0;
 @Output() changed=new EventEmitter<void>();
 @Output() verTratamientos=new EventEmitter<number>();
 @ViewChild('diagnosticoDialog') private diagnosticoDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('tratamientoDialog') private tratamientoDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('editarTratamientoDialog') private editarTratamientoDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('notaDialog') private notaDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('comentarioDialog') private comentarioDialog?:ElementRef<HTMLDialogElement>;
 private readonly api=inject(E3ClinicalService);
 private readonly ampliacion=inject(E3ExpedienteE4Service);
 private readonly archivosApi=inject(LocalDocumentApiService);
 private readonly permissions=inject(PermissionService);
 private readonly toast=inject(ToastService);
 readonly cargando=signal(false);readonly guardando=signal(false);readonly error=signal<string|null>(null);
 readonly enfermedades=signal<EnfermedadItemE3[]>([]);readonly comentarios=signal<ComentarioE3[]>([]);
 readonly analisis=signal<AnalisisE3|null>(null);
 readonly vista=signal<'table'|'cards'>('table');
 readonly enfermedadSeleccionada=signal(0);
 readonly detalleTratamientos=signal<EnfermedadDetalleE3|null>(null);
 readonly notasEnfermedad=signal<NotaEnfermedadE4[]>([]);
 readonly cargandoTratamientos=signal(false);readonly guardandoTratamiento=signal(false);readonly guardandoNota=signal(false);
 readonly subiendoAdjuntos=signal(false);
 readonly seleccionTratamientos=signal<number[]>([]);
 readonly episodioAbierto=signal<number|null>(null);
 readonly accionAbrir=signal<'editar'|'recuperar'|'eliminar'|null>(null);
 diagnosticoId=0;observacionDiagnostico='';busquedaDiagnostico='';busquedaTratamiento='';
 fechaAplicacion=this.hoy();comentarioTratamiento='';resultadoTratamiento='';
 adjuntosTratamiento:File[]=[];descripcionAdjunto='';
 tratamientoEditar:TratamientoItemE3|null=null;tratamientoEditarCatalogoId=0;tratamientoEditarFecha='';
 tratamientoEditarResultado='';tratamientoEditarComentario='';readonly guardandoEdicion=signal(false);
 comentarioGeneral='';comentarioEnfermedad='';
 readonly hoyLocal=this.hoy();
 private hoy(){const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
 puedeModificar(){return this.editable&&this.estadoPlanta!=='MUERTA'&&this.estadoPlanta!=='ELIMINADA';}
 puedeAnotar(){return this.puedeModificar()&&this.permissions.has('APAPPSS_PLANTAS_SALUD_COMENTAR');}
 puedeTratar(){return this.puedeModificar()&&this.permissions.has('APAPPSS_PLANTAS_TRATAMIENTO_LOTE');}
 diagnosticosFiltrados(){const q=this.busquedaDiagnostico.trim().toLocaleLowerCase();return [...(this.catalogos?.diagnosticos??[])]
  .filter(d=>d.nombre.toLocaleLowerCase().includes(q)).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));}
 tratamientosPermitidos(){const q=this.busquedaTratamiento.trim().toLocaleLowerCase();return (this.catalogos?.tratamientos??[])
  .filter(t=>t.problemaId===this.detalleTratamientos()?.diagnosticoId&&t.nombre.toLocaleLowerCase().includes(q));}
 ngOnChanges(changes:SimpleChanges):void{
  if(changes['plantaId']||changes['ambito'])this.actualizar();
  else if(changes['enfermedadInicial']&&this.modo==='tratamientos'&&this.enfermedadInicial>0)
   this.seleccionarEnfermedad(this.enfermedadInicial);
 }
 actualizar():void{
  if(!this.plantaId||!this.ambito)return;
  this.cargando.set(true);this.error.set(null);
  forkJoin({enfermedades:this.api.listarEnfermedades(this.ambito,this.plantaId),
   comentarios:this.api.listarComentarios(this.ambito,this.plantaId),analisis:this.api.analisis(this.ambito,this.plantaId)})
   .pipe(finalize(()=>this.cargando.set(false))).subscribe({
    next:v=>{
     this.enfermedades.set([...(v.enfermedades.items??[])].sort((a,b)=>
      (a.estado==='VIGENTE'?0:1)-(b.estado==='VIGENTE'?0:1)||Date.parse(b.fechaDiagnostico)-Date.parse(a.fechaDiagnostico)));
     this.comentarios.set([...(v.comentarios.items??[])].sort((a,b)=>Date.parse(b.fechaHora)-Date.parse(a.fechaHora)));
     this.analisis.set(v.analisis);
     if(this.modo==='tratamientos'){
      const elegido=this.enfermedadInicial||this.enfermedadSeleccionada();
      if(elegido&&this.enfermedades().some(e=>e.episodioId===elegido))this.seleccionarEnfermedad(elegido);
      else{this.enfermedadSeleccionada.set(0);this.detalleTratamientos.set(null);this.notasEnfermedad.set([]);}
     }
    },error:e=>this.error.set(mapOpenApiError(e).message)
   });
 }
 abrirDiagnostico():void{if(!this.puedeModificar())return;this.error.set(null);this.diagnosticoDialog?.nativeElement.showModal();}
 cerrarDiagnostico():void{if(!this.guardando())this.diagnosticoDialog?.nativeElement.close();}
 registrarDiagnostico():void{
  if(!this.puedeModificar()||!this.diagnosticoId||this.guardando()||
    !this.catalogos.diagnosticos.some(d=>d.id===this.diagnosticoId))return;
  this.guardando.set(true);this.error.set(null);
  this.api.crearEnfermedad(this.ambito,this.plantaId,this.diagnosticoId,this.observacionDiagnostico.trim()||undefined)
   .pipe(finalize(()=>this.guardando.set(false))).subscribe({
    next:()=>{this.toast.success('Enfermedad registrada como vigente');this.diagnosticoDialog?.nativeElement.close();
      this.diagnosticoId=0;this.busquedaDiagnostico='';this.observacionDiagnostico='';this.cambioGuardado();},
    error:e=>this.error.set(mapOpenApiError(e).message)
   });
 }
 registrarComentarioGeneral():void{
  if(!this.puedeModificar()||!this.comentarioGeneral.trim()||this.guardando())return;
  this.guardando.set(true);this.error.set(null);
  this.api.registrarComentario(this.ambito,this.plantaId,this.comentarioGeneral.trim())
   .pipe(finalize(()=>this.guardando.set(false))).subscribe({
    next:()=>{this.toast.success('Comentario general registrado');this.cerrarComentario();this.comentarioGeneral='';this.cambioGuardado();},
    error:e=>this.error.set(mapOpenApiError(e).message)
   });
 }
 abrirComentario():void{if(!this.puedeModificar()||this.guardando())return;this.error.set(null);this.comentarioDialog?.nativeElement.showModal();}
 cerrarComentario():void{if(!this.guardando()&&this.comentarioDialog?.nativeElement.open)this.comentarioDialog.nativeElement.close();}
 abrirNota():void{if(!this.puedeAnotar()||this.guardandoNota()||this.detalleTratamientos()?.estado!=='VIGENTE')return;
  this.error.set(null);this.notaDialog?.nativeElement.showModal();}
 cerrarNota():void{if(!this.guardandoNota()&&this.notaDialog?.nativeElement.open)this.notaDialog.nativeElement.close();}
 seleccionarEnfermedad(id:number):void{
  if(!id||!this.enfermedades().some(e=>e.episodioId===id)){
   this.enfermedadSeleccionada.set(0);this.detalleTratamientos.set(null);this.notasEnfermedad.set([]);return;
  }
  this.enfermedadSeleccionada.set(id);this.detalleTratamientos.set(null);this.notasEnfermedad.set([]);
  this.cargandoTratamientos.set(true);this.error.set(null);
  forkJoin({detalle:this.api.detalleEnfermedad(this.ambito,this.plantaId,id),
   notas:this.ampliacion.notas(this.ambito,this.plantaId,id)})
   .pipe(finalize(()=>this.cargandoTratamientos.set(false))).subscribe({
    next:v=>{if(this.enfermedadSeleccionada()!==id)return;
     this.detalleTratamientos.set({...v.detalle,tratamientos:[...(v.detalle.tratamientos??[])]
      .sort((a,b)=>Date.parse(b.fechaAplicacion)-Date.parse(a.fechaAplicacion)||b.tratamientoId-a.tratamientoId)});
     this.notasEnfermedad.set(v.notas.items??[]);
    },error:e=>this.error.set(mapOpenApiError(e).message)
   });
 }
 mostrarTratamientos(episodioId:number):void{this.verTratamientos.emit(episodioId);}
 abrirTratamiento():void{if(!this.puedeTratar()||this.detalleTratamientos()?.estado!=='VIGENTE')return;
  this.seleccionTratamientos.set([]);this.busquedaTratamiento='';this.adjuntosTratamiento=[];this.descripcionAdjunto='';
  this.fechaAplicacion=this.hoy();this.error.set(null);
  this.tratamientoDialog?.nativeElement.showModal();}
 cerrarTratamiento():void{if(!this.guardandoTratamiento())this.tratamientoDialog?.nativeElement.close();}
 seleccionarArchivoTratamiento(archivos:File[]):void{
  this.adjuntosTratamiento=archivos;
  this.error.set(null);
 }
 marcarTratamiento(id:number,valor:boolean):void{const actual=this.seleccionTratamientos();
  this.seleccionTratamientos.set(valor?[...new Set([...actual,id])]:actual.filter(x=>x!==id));}
 registrarTratamientos():void{
  const d=this.detalleTratamientos();const ids=this.seleccionTratamientos();
  if(!d||d.estado!=='VIGENTE'||!this.puedeTratar()||this.guardandoTratamiento()||
   !ids.length||ids.length>20||this.fechaAplicacion!==this.hoy()||
   !ids.every(id=>this.catalogos.tratamientos.some(t=>t.id===id&&t.problemaId===d.diagnosticoId)))return;
  const adjuntos=this.adjuntosTratamiento;
  let registrado=false;
  this.guardandoTratamiento.set(true);this.error.set(null);
  this.ampliacion.registrarTratamientos(this.ambito,this.plantaId,d.episodioId,ids,this.fechaAplicacion,
   this.comentarioTratamiento.trim()||undefined,this.resultadoTratamiento.trim()||undefined).pipe(
    switchMap(resultado=>{
     registrado=true;
     if(!adjuntos.length)return of(resultado);
     this.subiendoAdjuntos.set(true);
     return forkJoin(adjuntos.map(adjunto=>this.archivosApi.upload({uotId:this.ambito.uotId,file:adjunto,
      category:adjunto.type.startsWith('image/')?'FOTOGRAFIA':'DOCUMENTO',
      description:this.descripcionAdjunto.trim()||`Aplicación de tratamientos de ${d.enfermedad}`,
      linkType:'PREDIO',linkId:this.ambito.predioId}).pipe(
       switchMap(archivo=>{
        const archivoId=archivo.archivoId;
        if(archivoId==null||!Number.isSafeInteger(archivoId)||archivoId<=0){
         throw new Error('El servidor no devolvió un identificador de archivo válido.');
        }
        return this.api.vincularArchivoTratamiento(this.ambito,this.plantaId,d.episodioId,
         resultado.aplicacionId,archivoId);
       }))));
    }),finalize(()=>{this.guardandoTratamiento.set(false);this.subiendoAdjuntos.set(false);})).subscribe({
    next:()=>{this.toast.success(`${ids.length} tratamiento(s) registrado(s)`);this.tratamientoDialog?.nativeElement.close();
     this.seleccionTratamientos.set([]);this.comentarioTratamiento='';this.resultadoTratamiento='';
     this.adjuntosTratamiento=[];this.descripcionAdjunto='';
     this.cambioGuardado();this.seleccionarEnfermedad(d.episodioId);},
    error:e=>{
     const mensaje=mapOpenApiError(e).message;
     if(registrado){
      this.toast.error('Tratamientos guardados; archivo pendiente',mensaje);
      this.tratamientoDialog?.nativeElement.close();this.adjuntosTratamiento=[];
      this.cambioGuardado();this.seleccionarEnfermedad(d.episodioId);
     }else this.error.set(mensaje);
    }
   });
 }
 abrirEditarTratamiento(t:TratamientoItemE3):void{
  const d=this.detalleTratamientos();
  if(!d||d.estado!=='VIGENTE'||!this.puedeTratar()||this.guardandoEdicion())return;
  this.tratamientoEditar=t;this.tratamientoEditarCatalogoId=t.catalogoTratamientoId;
  this.tratamientoEditarFecha=t.fechaAplicacion.slice(0,10);
  this.tratamientoEditarResultado=t.resultado||'';this.tratamientoEditarComentario=t.comentario||'';
  this.error.set(null);this.editarTratamientoDialog?.nativeElement.showModal();
 }
 cerrarEditarTratamiento():void{
  if(this.guardandoEdicion())return;
  this.editarTratamientoDialog?.nativeElement.close();this.tratamientoEditar=null;
 }
 guardarEditarTratamiento():void{
  const d=this.detalleTratamientos(),t=this.tratamientoEditar;
  if(!d||!t||d.estado!=='VIGENTE'||!this.puedeTratar()||this.guardandoEdicion()||
   !this.tratamientoEditarCatalogoId||!this.tratamientoEditarFecha||
   this.tratamientoEditarFecha>this.hoy()||this.tratamientoEditarFecha<d.fechaDiagnostico.slice(0,10)||
   !this.catalogos.tratamientos.some(x=>x.id===this.tratamientoEditarCatalogoId&&x.problemaId===d.diagnosticoId))return;
  this.guardandoEdicion.set(true);this.error.set(null);
  this.api.editarTratamiento(this.ambito,this.plantaId,d.episodioId,t.tratamientoId,{
   catalogoTratamientoId:this.tratamientoEditarCatalogoId,fechaAplicacion:this.tratamientoEditarFecha,
   resultado:this.tratamientoEditarResultado.trim()||null,comentario:this.tratamientoEditarComentario.trim()||null
  }).pipe(finalize(()=>this.guardandoEdicion.set(false))).subscribe({
   next:()=>{this.guardandoEdicion.set(false);this.toast.success('Tratamiento actualizado');this.cerrarEditarTratamiento();
    this.cambioGuardado();this.seleccionarEnfermedad(d.episodioId);},
   error:e=>this.error.set(mapOpenApiError(e).message)
  });
 }
 registrarNota():void{
  const d=this.detalleTratamientos();if(!d||d.estado!=='VIGENTE'||!this.puedeAnotar()||
    !this.comentarioEnfermedad.trim()||this.guardandoNota())return;
  this.guardandoNota.set(true);this.error.set(null);
  this.ampliacion.registrarNota(this.ambito,this.plantaId,d.episodioId,this.comentarioEnfermedad.trim())
   .pipe(finalize(()=>this.guardandoNota.set(false))).subscribe({
    next:()=>{this.toast.success('Comentario de enfermedad registrado');this.cerrarNota();this.comentarioEnfermedad='';
     this.cambioGuardado();this.seleccionarEnfermedad(d.episodioId);},
    error:e=>this.error.set(mapOpenApiError(e).message)
   });
 }
 abrirEnfermedad(episodioId:number,accion:'editar'|'recuperar'|'eliminar'|null=null):void{
  this.accionAbrir.set(accion);this.episodioAbierto.set(episodioId);
 }
 cerrarEnfermedad():void{this.episodioAbierto.set(null);this.accionAbrir.set(null);}
 cambioGuardado():void{this.actualizar();this.changed.emit();}
}
