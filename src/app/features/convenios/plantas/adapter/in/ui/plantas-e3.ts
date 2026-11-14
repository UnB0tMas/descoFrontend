import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy,Component,Input,OnChanges,OnInit,SimpleChanges,ViewChild,ElementRef,computed,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChartArea,faChartPie,faCommentDots,faEye,faPen,faPlus,faSpinner,faTableCellsLarge,faTableList,faTrash,faXmark,faRotate} from '@fortawesome/free-solid-svg-icons';
import {ChartCardComponent} from '../../../../../../shared/charts/chart-card/chart-card';
import {ChartPresetsService} from '../../../../../../shared/charts/chart-presets.service';
import {ThemeService} from '../../../../../../core/ui/theme.service';
import type {ChartCardData} from '../../../../../../shared/charts/chart-card/chart-card.types';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {catchError,concatMap,finalize,forkJoin,from,map,Observable,of,switchMap,toArray} from 'rxjs';
import {PermissionService} from '../../../../../../core/access/permission.service';
import {UotContextStore} from '../../../../../uot/state/uot-context.store';
import {PaginatorComponent} from '../../../../../../shared/data-display/paginator/paginator';
import {RecordCardComponent} from '../../../../../../shared/data-display/record-card/record-card';
import {LoadingStateComponent} from '../../../../../../shared/data-display/loading-state/loading-state';
import {EmptyStateComponent} from '../../../../../../shared/data-display/empty-state/empty-state';
import {ActionConfirmDialogComponent} from '../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import {ToastService} from '../../../../../../shared/feedback/toast-center/toast.service';
import {mapOpenApiError} from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {ExpedienteE1UseCase} from '../../../../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import type {PredioE1} from '../../../../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import {LocalDocumentApiService} from '../../../../../../shared/files/local-document-api.service';
import {PlantasE3UseCase} from '../../../application/use-case/plantas-e3.use-case';
import {ArchivoPlantaE3,E3ClinicalService} from './clinical/e3-clinical.service';
import {E3ExpedienteGraficosComponent} from './charts/e3-expediente-graficos';
import {E3PlantaSaludComponent} from './clinical/e3-planta-salud';
import {E3FileDropzoneComponent} from './clinical/e3-file-dropzone';
import {AmbitoE3,CatalogosE3,DetalleE3,EstadoE3,EstadisticasE3,FilaE3,PaginaE3,PlantaE3,TipoActuacionE3,TipoProduccionE3} from '../../../domain/planta-paltera.model';

type Pestaña='general'|'enfermedades'|'tratamientos'|'comentarios'|'produccion'|'evidencias';
@Component({selector:'app-plantas-e3-page',standalone:true,
 imports:[CommonModule,FormsModule,RouterLink,FaIconComponent,ChartCardComponent,PaginatorComponent,RecordCardComponent,LoadingStateComponent,EmptyStateComponent,ActionConfirmDialogComponent,E3ExpedienteGraficosComponent,E3PlantaSaludComponent,E3FileDropzoneComponent],
 templateUrl:'./plantas-e3.html',styleUrl:'./plantas-e3.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class PlantasE3Page implements OnInit,OnChanges {
 @Input() convenioId=0;
 @Input() predioInicial=0;
 @Input() plantaInicial=0;
 @Input() socioInicial=0;
 @Input() predioFijo=false;
 @Input() parcelaCultivoId=0;
 @Input() vistaIntegrada=false;
 @Input() vistaFundo:'general'|'plantas'|'completa'|'expediente'='completa';
 @ViewChild(ActionConfirmDialogComponent) private confirmation?:ActionConfirmDialogComponent;
 @ViewChild('loteDialog') private loteDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('eliminarDialog') private eliminarDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('individualDialog') private individualDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('editarDialog') private editarDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('estadoDialog') private estadoDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('produccionDialog') private produccionDialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('archivoPredioDialog') private archivoPredioDialog?:ElementRef<HTMLDialogElement>;
 abrirLote():void{if(!this.saving()&&this.puedeCrear()&&this.mostrarAltaInicial())this.loteDialog?.nativeElement.showModal();}
 cerrarLote():void{if(!this.saving()&&this.loteDialog?.nativeElement.open)this.loteDialog.nativeElement.close();}
 abrirEvaluacion():void{const d=this.detail();if(!d||!this.puedeEditar()||d.estado==='MUERTA'||d.estado==='ELIMINADA')return;
  this.estadoNuevo=d.estado==='SIN_EVALUAR'?'SANA':d.estado;this.diagnosticoId=0;this.observacionEstado='';this.error.set(null);
  this.estadoDialog?.nativeElement.showModal();}
 cerrarEvaluacion():void{if(!this.saving()&&this.estadoDialog?.nativeElement.open)this.estadoDialog.nativeElement.close();}
 abrirProduccion():void{const d=this.detail();if(!d||!this.puedeEditar()||d.estado==='MUERTA'||d.estado==='ELIMINADA')return;
  this.produccionKg=null;this.observacionProduccion='';this.error.set(null);this.produccionDialog?.nativeElement.showModal();}
 cerrarProduccion():void{if(!this.saving()&&this.produccionDialog?.nativeElement.open)this.produccionDialog.nativeElement.close();}
 abrirArchivoPredio():void{const d=this.detail();if(!d||!this.puedeEditar()||d.estado==='MUERTA'||d.estado==='ELIMINADA')return;
  this.archivoNuevo=null;this.archivosParaSubir.set([]);this.descripcionArchivo='';this.error.set(null);this.archivoPredioDialog?.nativeElement.showModal();}
 cerrarArchivoPredio():void{if(!this.saving()&&this.archivoPredioDialog?.nativeElement.open)this.archivoPredioDialog.nativeElement.close();}
 cerrarExpediente():void{this.router.navigate(['/convenios/apappss/predios',this.predioId],{queryParams:{convenioId:this.convenioId,socioId:this.socioInicial}});}
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly uot=inject(UotContextStore);
 private readonly service=inject(PlantasE3UseCase);
 private readonly clinical=inject(E3ClinicalService);
 private readonly localFiles=inject(LocalDocumentApiService);
 private readonly prediosApi=inject(ExpedienteE1UseCase);
 private readonly permissions=inject(PermissionService);
 private readonly toast=inject(ToastService);
 private readonly chartPresets=inject(ChartPresetsService);
 private readonly theme=inject(ThemeService);
 readonly chartIcon=faChartArea;readonly donutIcon=faChartPie;
 readonly addIcon=faPlus;readonly closeIcon=faXmark;readonly tableIcon=faTableList;readonly spinnerIcon=faSpinner;readonly refreshIcon=faRotate;
 readonly commentIcon=faCommentDots;readonly cardIcon=faTableCellsLarge;readonly viewIcon=faEye;readonly editIcon=faPen;readonly deleteIcon=faTrash;
 readonly parcelaSeleccionada=signal(0);
 readonly predios=signal<{predioId:number;nombre:string}[]>([]);
 readonly loading=signal(false);
 readonly saving=signal(false);
 readonly generando=signal(false);
 readonly error=signal<string|null>(null);
 readonly catalogs=signal<CatalogosE3>({variedades:[],diagnosticos:[],tratamientos:[],parcelas:[],socios:[]});
 readonly altaInicialDisponible=signal(false);
 readonly altaInicialConsultada=signal(false);
 readonly cargandoAltaInicial=signal(false);
 readonly totalHistoricoVerificado=signal<number|null>(null);
 readonly listadoConsultado=signal(false);
 readonly cargandoDetalle=signal(false);
 private detalleSecuencia=0;
 readonly errorDetalle=signal<string|null>(null);
 // El alta masiva exige confirmación del servidor y una consulta inicial sin filtros.
 readonly mostrarAltaInicial=computed(()=>this.vistaFundo==='plantas'&&this.listadoConsultado()&&
  !this.loading()&&this.altaInicialConsultada()&&this.altaInicialDisponible()&&
  this.totalHistoricoVerificado()===0&&this.page().total===0&&
  !this.buscar.trim()&&!this.variedadFiltro&&!this.estadoFiltro);
 readonly mostrarAltaIndividual=computed(()=>this.vistaFundo==='plantas'&&this.listadoConsultado()&&
  !this.loading()&&this.totalHistoricoVerificado()!==null&&(this.totalHistoricoVerificado()??0)>0);
 readonly plantaEliminar=signal<PlantaE3|null>(null);
 motivoEliminar='';
 variedadNueva=0;fechaNueva='';edadNueva:number|null=null;observacionNueva='';
 readonly page=signal<PaginaE3>({total:0,items:[],resumen:[],anioResumen:new Date().getFullYear(),resumenParcelas:[]});
 readonly detail=signal<DetalleE3|null>(null);
 readonly ambitoDetalle=signal<AmbitoE3|null>(null);
 readonly archivos=signal<ArchivoPlantaE3[]>([]);
 readonly cargandoArchivos=signal(false);
 readonly errorArchivos=signal<string|null>(null);
 readonly archivoTab=signal<'general'|'tratamientos'>('general');
 readonly archivosParaSubir=signal<File[]>([]);
 readonly archivosGenerales=computed(()=>this.archivos().filter(x=>x.tipo==='GENERAL'));
 readonly archivosTratamientos=computed(()=>this.archivos().filter(x=>x.tipo==='TRATAMIENTO'));
 archivoNuevo:File|null=null;descripcionArchivo='';
 readonly produccionRealTotal=computed(()=>(this.detail()?.produccionResumen??[])
  .reduce((s,x)=>s+(x.tieneReal?x.realKg:0),0));
 readonly produccionRealMedia=computed(()=>{const p=(this.detail()?.produccionResumen??[]).filter(x=>x.tieneReal);
  return p.length?p.reduce((s,x)=>s+x.realKg,0)/p.length:0;});
 readonly aniosProduccion=computed(()=>(this.detail()?.produccionResumen??[]).filter(x=>x.tieneReal).length);

 readonly seleccionadas=signal<readonly number[]>([]);
 readonly tab=signal<Pestaña>('general');
 readonly enfermedadEnFoco=signal(0);
 readonly estadisticas=signal<EstadisticasE3|null>(null);
 readonly resumenPlanta=signal<EstadisticasE3|null>(null);
 readonly errorResumenPlanta=signal<string|null>(null);
 readonly errorEstadisticas=signal<string|null>(null);
 readonly cargandoEstadisticas=signal(false);
 readonly tieneMovimientos=computed(()=>(this.estadisticas()?.serie??[]).some(x=>(x.nuevosCasos??0)+(x.recuperadas??0)+(x.bajas??0)>0));
 readonly totalEstados=computed(()=>(this.estadisticas()?.sanas??0)+(this.estadisticas()?.enfermas??0)+(this.estadisticas()?.muertas??0));
 readonly tieneMovimientoPlanta=computed(()=>(this.resumenPlanta()?.serie??[]).some(x=>(x.nuevosCasos??0)+(x.recuperadas??0)+(x.bajas??0)>0));
 readonly graficoSanitario=computed<ChartCardData>(()=>this.crearGrafico(this.estadisticas(),'Evolución sanitaria'));
 readonly graficoPlanta=computed<ChartCardData>(()=>this.crearGrafico(this.resumenPlanta(),'Evolución de la planta'));
 readonly graficoActividadPlanta=computed<ChartCardData>(()=>{
  const datos=this.resumenPlanta();
  const serie=[Math.max(0,datos?.casosPeriodo??0),Math.max(0,datos?.tratamientosPeriodo??0)];
  const oscuro=this.theme.isDark();
  const options=this.chartPresets.donut(serie,['Diagnósticos','Tratamientos']);
  return {title:'Actividad fitosanitaria individual',icon:faChartPie,options:{...options,
   chart:{...options.chart,type:'donut',height:304,background:'transparent'},
   colors:['#fb923c','#38bdf8'],stroke:{width:3,colors:[oscuro?'#0b1220':'#ffffff']},
   plotOptions:{pie:{donut:{size:'74%',labels:{show:true,total:{show:true,label:'Actuaciones',fontSize:'12px',color:oscuro?'#94a3b8':'#64748b'}}}}},
   legend:{position:'bottom',fontSize:'12px',labels:{colors:oscuro?'#94a3b8':'#64748b'}},
   tooltip:{theme:oscuro?'dark':'light'},dataLabels:{enabled:false}},empty:serie.every(v=>v===0)};
 });
 readonly graficoEstados=computed<ChartCardData>(()=>{
  const s=this.estadisticas();
  const reales=[Math.max(0,s?.sanas??0),Math.max(0,s?.enfermas??0),Math.max(0,s?.muertas??0)];
  const sinDatos=reales.every(v=>v===0);
  // El segmento gris solo mantiene visible el anillo cuando no hay plantas;
  // el total, la etiqueta y los indicadores reales continúan en cero.
  const visuales=sinDatos?[1]:reales;
  const options=this.chartPresets.donut(visuales,sinDatos?['Sin datos']:['Sanas','Enfermas','Bajas']);
  const oscuro=this.theme.isDark();
  return {title:'Estado de las plantas',subtitle:sinDatos?'Sin plantas evaluadas en este predio':undefined,
   icon:faChartPie,options:{...options,
   chart:{...options.chart,type:'donut',height:304,background:'transparent'},
   colors:sinDatos?[oscuro?'#334155':'#cbd5e1']:['#34d399','#fb923c','#94a3b8'],
   stroke:{width:3,colors:[oscuro?'#0b1220':'#ffffff']},
   legend:{position:'bottom',show:!sinDatos,fontSize:'12px',labels:{colors:oscuro?'#94a3b8':'#64748b'}},
   plotOptions:{pie:{donut:{size:'73%',labels:{show:true,
    name:{show:!sinDatos},value:{show:!sinDatos,fontSize:'23px',fontWeight:750,color:oscuro?'#e2e8f0':'#0f172a'},
    total:{show:true,showAlways:true,label:'Plantas',fontSize:'12px',color:oscuro?'#94a3b8':'#64748b',
     formatter:()=>String(reales.reduce((total,valor)=>total+valor,0))}}}}},
   dataLabels:{enabled:false},tooltip:{enabled:!sinDatos,theme:oscuro?'dark':'light'}},empty:false};
 });
 private crearGrafico(info:EstadisticasE3|null,titulo:string):ChartCardData{
  const serie=info?.serie??[];
  const conMovimientos=serie.some(x=>(x.nuevosCasos??0)+(x.recuperadas??0)+(x.bajas??0)>0);
  // Si el PA no devuelve puntos, se dibuja un eje cronológico con valores cero.
  // No son eventos simulados: son únicamente la referencia visual del periodo.
  const fechaInicial=Date.parse(`${this.fechaDesde}T12:00:00Z`);
  const fechaFinal=Date.parse(`${this.fechaHasta}T12:00:00Z`);
  const dias=Number.isFinite(fechaInicial)&&Number.isFinite(fechaFinal)&&fechaFinal>=fechaInicial
   ?Math.round((fechaFinal-fechaInicial)/86400000):6;
  const inicio=Number.isFinite(fechaInicial)?fechaInicial:Date.now()-6*86400000;
  const puntos=Math.max(2,Math.min(7,dias+1));
  const etiquetasBase=Array.from({length:puntos},(_,i)=>{
   const fecha=new Date(inicio+Math.round(i*dias/(puntos-1))*86400000);
   return fecha.toISOString().slice(5,10);
  });
  const etiquetas=serie.length?serie.map(x=>x.fecha.slice(5)):etiquetasBase;
  const datos=[
   {name:'Nuevos casos',data:serie.length?serie.map(x=>x.nuevosCasos??0):etiquetas.map(()=>0)},
   {name:'Recuperaciones',data:serie.length?serie.map(x=>x.recuperadas??0):etiquetas.map(()=>0)},
   {name:'Bajas',data:serie.length?serie.map(x=>x.bajas??0):etiquetas.map(()=>0)}];
  const options=this.chartPresets.area(datos,etiquetas);
  const oscuro=this.theme.isDark();
  const eje=oscuro?'#94a3b8':'#64748b';
  return {title:titulo,subtitle:conMovimientos?undefined:'Sin movimientos registrados',icon:faChartArea,options:{...options,
   chart:{...options.chart,type:'area',height:304,background:'transparent',toolbar:{show:false}},
   colors:['#fbbf24','#34d399','#f87171'],
   fill:{type:'gradient',gradient:{shadeIntensity:0.2,opacityFrom:0.38,opacityTo:0.02,stops:[0,95,100]}},
   stroke:{curve:'smooth',width:3},
   markers:{size:0,hover:{sizeOffset:5}},
   grid:{borderColor:oscuro?'rgba(148,163,184,.16)':'rgba(100,116,139,.17)',strokeDashArray:4},
   xaxis:{...options.xaxis,labels:{style:{colors:eje,fontSize:'11px'}}},
   yaxis:{min:0,labels:{style:{colors:eje,fontSize:'11px'}}},
   legend:{position:'bottom',fontSize:'12px',labels:{colors:eje}},
   tooltip:{theme:oscuro?'dark':'light'},dataLabels:{enabled:false}},empty:false};
 }
 readonly tratamientosDisponibles=computed(()=>{
  const activo=this.detail()?.episodios?.find(x=>!x.fin);
  return (this.catalogs().tratamientos??[]).filter(x=>x.problemaId===activo?.diagnosticoId);
 });
 readonly puedeEditar=computed(()=>this.permissions.has('APAPPSS_PREDIOS_EDITAR'));
 readonly puedeCrear=computed(()=>this.permissions.has('APAPPSS_PREDIOS_CREAR'));
 readonly puedeActuar=computed(()=>this.puedeEditar()&&!!this.visitaId);
 readonly totalPaginas=computed(()=>Math.max(1,Math.ceil(this.page().total/this.tamano)));
 readonly totalFundo=computed(()=>(this.page().resumen??[]).reduce((sum,r)=>sum+(r.cantidad??0)-(r.muertas??0),0));
 readonly totalHistorico=computed(()=>(this.page().resumen??[]).reduce((sum,r)=>sum+(r.cantidad??0),0));
 readonly plantasSinEvaluar=computed(()=>(this.page().resumen??[]).reduce((sum,r)=>sum+(r.sinEvaluar??0),0));
 readonly variedadesRegistradas=computed(()=>(this.page().resumen??[]).filter(r=>(r.cantidad??0)>0).length);
 readonly tratamientosTotales=computed(()=>(this.estadisticas()?.tratamientosPeriodo??0));
 readonly comentarios=signal<import('./clinical/e3-clinical.service').ComentarioE3[]>([]);
 readonly comentariosCargando=signal(false);
 comentarioNuevo='';
 @ViewChild('comentariosDialog') private comentariosDialog?:ElementRef<HTMLDialogElement>;
 abrirComentarios(plantaId:number):void{
  const a=this.context();if(!a)return;
  this.service.ver(a,plantaId).subscribe({next:d=>{
   this.detail.set(d);this.comentariosDialog?.nativeElement.showModal();this.cargarComentarios(plantaId);
  },error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 cerrarComentarios():void{if(!this.saving()&&this.comentariosDialog?.nativeElement.open)this.comentariosDialog.nativeElement.close();}
 cargarComentarios(plantaId:number):void{
  const a=this.context();if(!a)return;this.comentariosCargando.set(true);
  this.clinical.listarComentarios(a,plantaId).pipe(finalize(()=>this.comentariosCargando.set(false))).subscribe({
   next:r=>this.comentarios.set([...(r.items??[])].sort((x,y)=>Date.parse(y.fechaHora)-Date.parse(x.fechaHora))),
   error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 guardarComentario():void{
  const a=this.context(),d=this.detail();if(!a||!d||d.estado==='MUERTA'||d.estado==='ELIMINADA'||!this.comentarioNuevo.trim()||this.saving())return;
  this.mutate(this.clinical.registrarComentario(a,d.plantaId,this.comentarioNuevo.trim()),()=>{
   this.comentarioNuevo='';this.cargarComentarios(d.plantaId);this.toast.success('Comentario registrado');
  });
 }
 predioId=0;socioId=0;buscar='';estadoFiltro='';variedadFiltro=0;pagina=1;tamano=10;vista:'tabla'|'tarjetas'='tabla';vistaTratamientos:'tabla'|'tarjetas'='tabla';
 filas:FilaE3[]=[{variedadId:0,cantidad:0}];
 masivoTipo:TipoActuacionE3='PREVENTIVO';masivoObservacion='';masivoResultado='';
 estadoNuevo:EstadoE3['estado']='SANA';diagnosticoId=0;observacionEstado='';correccionMotivo='';
 catalogoTratamientoId=0;resultadoTratamiento='';seguimiento='';seguimientoResultado='';seguimientoTipo:TipoActuacionE3='PREVENTIVO';
 fechaPlantacion='';edadReferencia:number|null=null;variedadEditar=0;
 fechaDesde='';fechaHasta='';estadoPeriodo='';
 anio=new Date().getFullYear();tipoProduccion:TipoProduccionE3='ESTIMACION';produccionKg:number|null=null;
 fechaProduccion=new Date().toISOString().slice(0,10);observacionProduccion='';
 readonly visitaId=Number(this.route.snapshot.queryParamMap.get('visitaId'))||undefined;
 ngOnInit():void{
  if(!this.convenioId)this.convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'))||0;
  if(!this.predioInicial)this.predioInicial=Number(this.route.snapshot.paramMap.get('predioId'))||0;
  const hoy=new Date();this.fechaHasta=this.isoLocal(hoy);
  const inicio=new Date(hoy);inicio.setDate(inicio.getDate()-29);this.fechaDesde=this.isoLocal(inicio);
  this.loadPredios();
 }
 ngOnChanges(changes:SimpleChanges):void{
  if((changes['convenioId']&&!changes['convenioId'].firstChange)||(changes['predioInicial']&&!changes['predioInicial'].firstChange))this.loadPredios();
  else if(changes['plantaInicial']&&!changes['plantaInicial'].firstChange&&this.vistaFundo==='expediente'&&this.plantaInicial>0)this.abrir(this.plantaInicial);
  else if(changes['parcelaCultivoId']&&!changes['parcelaCultivoId'].firstChange)this.loadCatalogos();
 }
 nombreEnfermedad(d:DetalleE3,episodioId:number):string{return d.episodios.find(e=>e.episodioId===episodioId)?.diagnostico??'Enfermedad registrada';}
 nombreSocio(id?:number):string{return (this.catalogs().socios??[]).find(x=>x.id===id)?.nombre??'Sin asignar';}
 nombreParcela(id?:number):string{return (this.catalogs().parcelas??[]).find(x=>x.id===id)?.nombre??'Sin asignar';}
 private isoLocal(date:Date):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
 seleccionarParcela(parcelaId:number):void{
  if(!(this.catalogs().parcelas??[]).some(p=>p.id===parcelaId))return;
  this.parcelaSeleccionada.set(parcelaId);this.pagina=1;this.buscar='';this.estadoFiltro='';this.variedadFiltro=0;
  this.seleccionadas.set([]);this.listar();this.cargarEstadisticas();
 }
 volverAParcelas():void{
  this.parcelaSeleccionada.set(0);this.page.set({total:0,items:[],resumen:[],anioResumen:this.anio,resumenParcelas:[]});
  this.seleccionadas.set([]);this.estadisticas.set(null);this.detail.set(null);
 }
 private context():AmbitoE3|null{
  const uotId=this.uot.selectedId();
  if(this.predioFijo&&this.predioId!==this.predioInicial)return null;
  return uotId&&this.convenioId>0&&this.predioId>0?{uotId,convenioId:this.convenioId,predioId:this.predioId,
   parcelaCultivoId:this.parcelaSeleccionada()||undefined}:null;
 }
 // El predio ya está definido por la ruta. No depende de una búsqueda de predios
 // ni de la carga de catálogos para recuperar sus plantas o su expediente.
 private iniciarConsultas():void{
  if(this.vistaFundo==='expediente'){
   this.loading.set(false);
   if(this.plantaInicial>0&&Number.isSafeInteger(this.plantaInicial))this.abrir(this.plantaInicial);
   else this.errorDetalle.set('No fue posible abrir esta planta.');
   return;
  }
  this.listar();
  if(this.vistaFundo!=='plantas')this.cargarEstadisticas();
  if(this.vistaFundo==='plantas')this.cargarAltaInicial();
 }
 loadPredios():void{
  const uotId=this.uot.selectedId();
  ++this.listadoSecuencia; ++this.detalleSecuencia; // descarta respuestas de un predio anterior
  this.parcelaSeleccionada.set(0);
  this.detail.set(null);this.ambitoDetalle.set(null);this.resumenPlanta.set(null);
  this.estadisticas.set(null);this.errorDetalle.set(null);this.archivos.set([]);
  this.listadoConsultado.set(false);this.totalHistoricoVerificado.set(null);
  this.altaInicialConsultada.set(false);this.altaInicialDisponible.set(false);
  this.page.set({total:0,items:[],resumen:[],anioResumen:this.anio,resumenParcelas:[]});
  this.pagina=1;this.buscar='';this.estadoFiltro='';this.variedadFiltro=0;
  this.seleccionadas.set([]);this.error.set(null);
  if(!uotId||!this.convenioId){this.loading.set(false);this.error.set('No se pudo cargar la información.');return;}
  if(this.predioFijo){
   this.predioId=Number.isSafeInteger(this.predioInicial)&&this.predioInicial>0?this.predioInicial:0;
   if(!this.predioId){this.loading.set(false);this.error.set('No se pudo abrir este predio.');return;}
   this.loadCatalogos();
   this.iniciarConsultas();
   return;
  }
  this.loading.set(true);
  this.prediosApi.buscarPredios(uotId,'',this.convenioId).pipe(finalize(()=>{
   if(!this.predioId)this.loading.set(false);
  })).subscribe({
   next:(items:PredioE1[])=>{
    this.predios.set(items.map(p=>({predioId:p.predioId,nombre:p.nombre})));
    const encontrado=items.some(p=>p.predioId===this.predioInicial);
    this.predioId=encontrado?this.predioInicial:items[0]?.predioId??0;
    if(this.predioId){this.loadCatalogos();this.iniciarConsultas();}
    else this.error.set('No hay predios disponibles.');
   },error:()=>{this.loading.set(false);this.error.set('No se pudo cargar la información.');}
  });
 }
 cambiarPredio():void{
  ++this.listadoSecuencia;
  this.pagina=1;this.socioId=0;this.detail.set(null);
  this.seleccionadas.set([]);this.archivos.set([]);
  this.estadisticas.set(null);this.resumenPlanta.set(null);
  this.listadoConsultado.set(false);this.totalHistoricoVerificado.set(null);
  this.altaInicialConsultada.set(false);this.altaInicialDisponible.set(false);
  if(this.predioId){this.loadCatalogos();this.iniciarConsultas();}
 }
 loadCatalogos():void{
  const a=this.context();if(!a)return;
  this.service.catalogos(a).subscribe({next:c=>{
   // No permitir que un catálogo atrasado reemplace el del predio actual.
   if(this.predioId!==a.predioId||this.convenioId!==a.convenioId)return;
   const seguros:CatalogosE3={variedades:c?.variedades??[],diagnosticos:c?.diagnosticos??[],
    tratamientos:c?.tratamientos??[],parcelas:c?.parcelas??[],socios:c?.socios??[]};
   this.catalogs.set(seguros);
   this.socioId=seguros.socios.some(s=>s.id===this.socioInicial)?this.socioInicial:
    seguros.socios.length===1?seguros.socios[0].id:0;
   const sugerida=this.predioFijo&&this.vistaIntegrada?0:(this.parcelaCultivoId||this.parcelaSeleccionada());
   this.parcelaSeleccionada.set(seguros.parcelas.some(p=>p.id===sugerida)?sugerida:0);
  },error:()=>{
   if(this.predioId===a.predioId)this.toast.error('No se pudieron cargar las opciones.');
  }});
 }
 cargarEstadisticas():void{
  const a=this.context();if(!a)return;
  if(!this.fechaDesde||!this.fechaHasta||this.fechaDesde>this.fechaHasta){this.errorEstadisticas.set('Seleccione un periodo válido.');return;}
  const diferencia=(Date.parse(this.fechaHasta)-Date.parse(this.fechaDesde))/86400000;
  if(!Number.isFinite(diferencia)||diferencia>366){this.errorEstadisticas.set('Seleccione un periodo máximo de un año.');return;}
  this.errorEstadisticas.set(null);this.cargandoEstadisticas.set(true);
  (this.predioFijo&&this.parcelaSeleccionada()>0
   ?this.clinical.resumenParcela(a,this.parcelaSeleccionada(),this.fechaDesde,this.fechaHasta,this.estadoPeriodo||undefined)
   :this.service.resumen(a,this.fechaDesde,this.fechaHasta,this.estadoPeriodo||undefined)).pipe(finalize(()=>this.cargandoEstadisticas.set(false))).subscribe({
   next:v=>{this.estadisticas.set({...v,serie:v.serie??[]});const d=this.detail();if(d)this.cargarResumenPlanta(d.plantaId);},
   error:e=>this.errorEstadisticas.set(mapOpenApiError(e).message)
  });
 }
 cargarResumenPlanta(id:number):void{
  const a=this.context();if(!a||!this.fechaDesde||!this.fechaHasta||this.fechaDesde>this.fechaHasta)return;
  this.errorResumenPlanta.set(null);
  this.service.resumen(a,this.fechaDesde,this.fechaHasta,undefined,id).subscribe({
    next:v=>{if(this.detail()?.plantaId===id)this.resumenPlanta.set({...v,serie:v.serie??[]});},
    error:e=>this.errorResumenPlanta.set(mapOpenApiError(e).message),
  });
 }
 cargarAltaInicial():void{
  const a=this.context();if(!a||this.vistaFundo!=='plantas')return;
  this.cargandoAltaInicial.set(true);this.altaInicialConsultada.set(false);this.altaInicialDisponible.set(false);
  this.clinical.altaInicial(a).pipe(finalize(()=>{
   if(this.predioId===a.predioId){this.cargandoAltaInicial.set(false);this.altaInicialConsultada.set(true);}
  })).subscribe({
   next:v=>{
    if(this.predioId!==a.predioId)return;
    const total=Number(v?.totalHistorico);
    if(!Number.isSafeInteger(total)||total<0){this.totalHistoricoVerificado.set(null);return;}
    // Una respuesta del listado con plantas prevalece sobre cero de una consulta antigua.
    const verificado=Math.max(total,this.totalHistoricoVerificado()??0);
    this.totalHistoricoVerificado.set(verificado);
    this.altaInicialDisponible.set(v.puedeCargaInicial===true&&verificado===0);
   },
   error:()=>{if(this.predioId===a.predioId){this.altaInicialDisponible.set(false);
    if(this.totalHistoricoVerificado()===null)this.toast.error('No se pudo cargar la información.');}}
  });
 }
 abrirIndividual():void{if(!this.saving()&&this.puedeCrear()&&this.mostrarAltaIndividual())this.individualDialog?.nativeElement.showModal();}
 cerrarIndividual():void{if(!this.saving()&&this.individualDialog?.nativeElement.open)this.individualDialog.nativeElement.close();}
 guardarIndividual():void{
  const a=this.context();if(!a||this.saving()||this.variedadNueva<1)return;
  const socioId=this.catalogs().socios.length===1?undefined:this.socioId;
  if(this.catalogs().socios.length>1&&!socioId){this.error.set('Seleccione el socio titular.');return;}
  if(this.fechaNueva&&this.edadNueva!==null){this.error.set('Indique fecha o edad, no ambas.');return;}
  this.mutate(this.clinical.crearIndividual(a,{variedadId:this.variedadNueva,socioId,
    fechaPlantacion:this.fechaNueva||undefined,edadReferenciaAnios:this.fechaNueva?undefined:this.edadNueva??undefined,
    observacion:this.observacionNueva.trim()||undefined}),r=>{
   this.cerrarIndividual();this.variedadNueva=0;this.fechaNueva='';this.edadNueva=null;this.observacionNueva='';
   this.totalHistoricoVerificado.set(Math.max(1,this.totalHistoricoVerificado()??0));
   this.toast.success(`Planta ${r.codigo} registrada`);this.pagina=1;this.listar();this.cargarEstadisticas();this.cargarAltaInicial();
  });
 }
 private listadoSecuencia=0;
 private recibirPagina(p:PaginaE3|null|undefined):boolean{
  const items=Array.isArray(p?.items)?p.items:[];
  // No presentar filas/tarjetas vacías si el servidor devolvió datos incompletos.
  const validos=!!p&&Number.isFinite(p.total)&&p.total>=0&&items.every(item=>
   !!item&&Number.isSafeInteger(item.plantaId)&&item.plantaId>0&&
   typeof item.codigo==='string'&&!!item.codigo.trim()&&
   typeof item.variedad==='string'&&!!item.variedad.trim()&&
   (item.estado==='SANA'||item.estado==='ENFERMA'||item.estado==='MUERTA'||item.estado==='SIN_EVALUAR'||item.estado==='ELIMINADA'));
  if(!validos){this.error.set('El listado no se pudo actualizar. Use Actualizar para volver a consultar.');return false;}
  this.page.set({total:p.total,items,resumen:p.resumen??[],
   anioResumen:p.anioResumen??this.anio,resumenParcelas:p.resumenParcelas??[]});
  this.listadoConsultado.set(true);
  if(!this.buscar.trim()&&!this.variedadFiltro&&!this.estadoFiltro&&p.total>0){
   this.totalHistoricoVerificado.set(Math.max(p.total,this.totalHistoricoVerificado()??0));
   this.altaInicialDisponible.set(false);
  }
  return true;
 }
 listar():void{
  const a=this.context();if(!a||this.generando())return;
  const secuencia=++this.listadoSecuencia;
  this.loading.set(true);this.error.set(null);
  (this.predioFijo&&this.parcelaSeleccionada()>0?this.clinical.listarParcela(a,{buscar:this.buscar.trim()||undefined,estado:this.estadoFiltro||undefined,
   variedadId:this.variedadFiltro||undefined,pagina:this.pagina,tamano:this.tamano},this.parcelaSeleccionada())
   :this.service.listar(a,{buscar:this.buscar.trim()||undefined,estado:this.estadoFiltro||undefined,
   variedadId:this.variedadFiltro||undefined,pagina:this.pagina,tamano:this.tamano}))
   .pipe(finalize(()=>{if(secuencia===this.listadoSecuencia)this.loading.set(false);})).subscribe({
    next:p=>{if(secuencia===this.listadoSecuencia)this.recibirPagina(p);},
    error:e=>{if(secuencia===this.listadoSecuencia){this.error.set('No se pudo cargar la lista de plantas.');
     console.error('[APAPPSS] Error al listar plantas',e);}}
   });
 }
 filtrar():void{if(this.generando())return;this.pagina=1;this.seleccionadas.set([]);this.listar();}
 pageChanged(value:number):void{if(this.generando()||value<1||value>this.totalPaginas())return;this.pagina=value;this.seleccionadas.set([]);this.listar();}
 sizeChanged(value:number):void{if(this.generando()||![10,20,50,100].includes(value))return;this.tamano=value;this.pagina=1;this.seleccionadas.set([]);this.listar();}
 agregarFila():void{if(!this.generando())this.filas.push({variedadId:0,cantidad:0});}
 quitarFila(index:number):void{if(!this.generando()&&this.filas.length>1)this.filas.splice(index,1);}
 validLote():boolean{
  const keys=this.filas.map(f=>f.variedadId);
  return this.filas.length>0&&new Set(keys).size===keys.length&&
   (this.catalogs().socios.length===1||this.socioId>0)&&
   this.filas.every(f=>f.variedadId>0&&Number.isInteger(f.cantidad)&&f.cantidad>0&&f.cantidad<=1000)&&
   this.filas.reduce((s,f)=>s+f.cantidad,0)<=2000;
 }
 crearLote():void{
  const a=this.context();if(!a||!this.mostrarAltaInicial()||!this.validLote()||this.saving())return;
  const socioId=this.catalogs().socios.length===1?undefined:this.socioId;
  // En el detalle del predio no se exige parcela: no enviar 0, porque el DTO @Positive lo rechaza.
  // La asociación al predio seleccionado viaja en a.predioId y el backend valida la pertenencia.
  const filas:FilaE3[]=this.filas.map(({variedadId,cantidad,parcelaCultivoId})=>{
   const parcela=this.predioFijo?this.parcelaSeleccionada():parcelaCultivoId;
   return parcela&&parcela>0?{variedadId,cantidad,parcelaCultivoId:parcela}:{variedadId,cantidad};
  });
  // Evitar que una respuesta antigua reemplace el listado que se va a recargar.
  ++this.listadoSecuencia;
  this.generando.set(true);this.saving.set(true);this.loading.set(true);
  this.cargandoEstadisticas.set(true);this.error.set(null);this.errorEstadisticas.set(null);
  this.service.lote(a,filas,socioId).pipe(
   switchMap(resultado=>forkJoin({
    pagina:(this.predioFijo&&this.parcelaSeleccionada()>0?this.clinical.listarParcela(a,{pagina:1,tamano:this.tamano},this.parcelaSeleccionada()):this.service.listar(a,{pagina:1,tamano:this.tamano})).pipe(catchError(()=>of(null))),
    resumen:(this.predioFijo&&this.parcelaSeleccionada()>0?this.clinical.resumenParcela(a,this.parcelaSeleccionada(),this.fechaDesde,this.fechaHasta):this.service.resumen(a,this.fechaDesde,this.fechaHasta)).pipe(catchError(()=>of(null)))
   }).pipe(map(({pagina,resumen})=>({resultado,pagina,resumen})))),
   finalize(()=>{this.generando.set(false);this.saving.set(false);this.loading.set(false);this.cargandoEstadisticas.set(false);})
  ).subscribe({
   next:({resultado,pagina,resumen})=>{
    this.pagina=1;this.buscar='';this.estadoFiltro='';this.variedadFiltro=0;
    this.seleccionadas.set([]);this.filas=[{variedadId:0,cantidad:0}];
    this.loteDialog?.nativeElement.close();
    if(pagina&&this.recibirPagina(pagina)){
     this.error.set(null);
     this.toast.success(`Se registraron ${resultado.total} plantas`);
    }else{
     this.error.set(`Se registraron ${resultado.total} plantas, pero no se pudo actualizar la lista. Pulse Actualizar; no vuelva a generarlas.`);
     this.toast.error('Plantas registradas','Actualice la lista para ver los nuevos registros.');
    }
    this.totalHistoricoVerificado.set(Math.max(resultado.total,this.totalHistoricoVerificado()??0));
    this.altaInicialDisponible.set(false);this.cargarAltaInicial();
    if(resumen)this.estadisticas.set({...resumen,serie:resumen.serie??[]});
    else this.errorEstadisticas.set('No se pudo actualizar el resumen sanitario.');
   },
   error:e=>{
    const mensaje=mapOpenApiError(e).message;
    this.error.set(mensaje);this.toast.error('No se pudo completar el registro',mensaje);this.cargarAltaInicial();
   },
  });
 }
 seleccionar(id:number,checked:boolean):void{
  this.seleccionadas.update(current=>checked?[...new Set([...current,id])].slice(0,100):current.filter(x=>x!==id));
 }
 seguimientoSeleccion():void{
  const a=this.context(),ids=[...this.seleccionadas()];
  if(!a||!this.visitaId||!this.masivoObservacion.trim()||ids.length===0||this.saving())return;
  this.mutate(this.service.seguimientoMasivo(a,{plantasIds:ids,observacion:this.masivoObservacion.trim(),
   tipo:this.masivoTipo,resultado:this.masivoResultado.trim()||undefined,visitaId:this.visitaId}),r=>{
   this.toast.success(`Actuación registrada en ${r.procesadas} plantas`);
   this.seleccionadas.set([]);this.masivoObservacion='';this.masivoResultado='';this.listar();
   const d=this.detail();if(d)this.abrir(d.plantaId,false);
  });
 }
 abrir(plantaId:number,resetTab=true):void{
  const a=this.context();
  if(!a){this.cargandoDetalle.set(false);this.errorDetalle.set('No se pudo abrir esta planta.');return;}
  if(this.vistaFundo!=='expediente'){
   this.router.navigate(['/convenios/apappss/predios',a.predioId,'plantas',plantaId],
     {queryParams:{convenioId:a.convenioId,socioId:this.socioInicial||this.socioId||undefined}});return;
  }
  if(!Number.isSafeInteger(plantaId)||plantaId<=0){this.errorDetalle.set('No se pudo abrir esta planta.');return;}
  const secuencia=++this.detalleSecuencia;
  this.cargandoDetalle.set(true);this.errorDetalle.set(null);
  this.service.ver(a,plantaId).pipe(finalize(()=>{
   if(secuencia===this.detalleSecuencia)this.cargandoDetalle.set(false);
  })).subscribe({next:d=>{
   if(secuencia!==this.detalleSecuencia)return;
   if(this.predioId!==a.predioId||this.plantaInicial!==plantaId||d?.plantaId!==plantaId||d?.predioId!==a.predioId){
    this.errorDetalle.set('No se pudo abrir esta planta.');return;
   }
   this.detail.set(d);this.ambitoDetalle.set(a);this.resumenPlanta.set(null);this.cargarResumenPlanta(plantaId);if(resetTab)this.tab.set('general');
   if(this.tab()==='evidencias')this.loadArchivos();
   this.fechaPlantacion=d.fechaPlantacion??'';this.edadReferencia=d.edadReferenciaAnios??null;
   this.estadoNuevo=(d.estado==='MUERTA'||d.estado==='ELIMINADA')?'SANA':d.estado;this.catalogoTratamientoId=0;
  },error:e=>{if(secuencia!==this.detalleSecuencia)return;
   this.errorDetalle.set('No se pudo cargar la información de la planta.');
   console.error('[APAPPSS] Error en expediente de planta',e);}});
 }
 cerrarDetalle():void{if(this.saving())return;this.detail.set(null);this.ambitoDetalle.set(null);this.cerrarExpediente();}
 cambiarTab(tab:Pestaña):void{if(tab==='tratamientos')this.enfermedadEnFoco.set(0);this.tab.set(tab);if(tab==='evidencias')this.loadArchivos();}
 abrirTratamientos(episodioId:number):void{this.enfermedadEnFoco.set(episodioId);this.tab.set('tratamientos');}
 loadArchivos():void{
  const a=this.ambitoDetalle(),d=this.detail();if(!a||!d)return;
  this.cargandoArchivos.set(true);this.errorArchivos.set(null);
  this.clinical.listarArchivos(a,d.plantaId).pipe(finalize(()=>this.cargandoArchivos.set(false))).subscribe({
   next:r=>{if(this.detail()?.plantaId===d.plantaId)this.archivos.set(r.items??[]);},
   error:e=>this.errorArchivos.set(mapOpenApiError(e).message)
  });
 }
 seleccionarArchivoNuevo(archivos:File[]):void{
  this.archivosParaSubir.set([...archivos]);
  this.archivoNuevo=this.archivosParaSubir()[0]??null;this.error.set(null);
 }
 guardarArchivoNuevo():void{
  const a=this.ambitoDetalle(),d=this.detail(),archivos=this.archivosParaSubir();
  if(!a||!d||!archivos.length||!this.descripcionArchivo.trim()||this.saving()||
   !this.puedeEditar()||d.estado==='MUERTA'||d.estado==='ELIMINADA')return;
  this.mutate(from(archivos).pipe(concatMap(file=>this.localFiles.upload({
    uotId:a.uotId,file,category:file.type.startsWith('image/')?'FOTOGRAFIA':'DOCUMENTO',
    description:this.descripcionArchivo.trim(),linkType:'PREDIO',linkId:d.predioId
   }).pipe(switchMap(info=>{
    const archivoId=info.archivoId;
    if(archivoId==null||!Number.isSafeInteger(archivoId)||archivoId<=0)
     throw new Error('No se pudo guardar el archivo.');
    return this.service.evidencia(a,d.plantaId,archivoId);
   }),map(()=>({file,ok:true})),catchError(()=>of({file,ok:false})))),toArray()),resultados=>{
    const fallidos=resultados.filter(x=>!x.ok).map(x=>x.file);
    const guardados=resultados.length-fallidos.length;
    this.archivosParaSubir.set(fallidos);
    this.archivoNuevo=fallidos[0]??null;
    if(guardados)this.toast.success(`${guardados} archivo(s) guardado(s)`);
    if(fallidos.length){this.error.set(`${fallidos.length} archivo(s) no se pudieron guardar. Inténtalo nuevamente.`);}
    else {this.descripcionArchivo='';this.cerrarArchivoPredio();}
    this.loadArchivos();this.refreshDetail(d.plantaId);
   });
 }
 descargarArchivo(f:ArchivoPlantaE3):void{
  if(!f.local)return;
  this.localFiles.content(f.archivoId).subscribe({
   next:contenido=>{const url=URL.createObjectURL(contenido);
    const a=document.createElement('a');a.href=url;a.download=f.nombre;a.rel='noopener';a.click();
    globalThis.setTimeout(()=>URL.revokeObjectURL(url),30000);
   },error:e=>this.toast.error('Archivo no disponible',mapOpenApiError(e).message)
  });
 }

 private mutate<T>(request:Observable<T>,after:(r:T)=>void):void{
  if(this.saving())return;this.saving.set(true);this.error.set(null);
  request.pipe(finalize(()=>this.saving.set(false))).subscribe({next:r=>{this.saving.set(false);after(r);},error:e=>{
   const m=mapOpenApiError(e).message;this.error.set(m);this.toast.error('No se pudo registrar',m);
  }});
 }
 refreshDetail(id:number):void{this.abrir(id,false);this.listar();}
async cambiarEstado():Promise<void>{
 const a=this.context(),d=this.detail();if(!a||!d||this.saving()||(d.estado==='MUERTA'||d.estado==='ELIMINADA'))return;
 if(this.estadoNuevo==='ELIMINADA')return;
 if(this.estadoNuevo===d.estado){this.error.set('Seleccione un estado diferente.');return;}
 if(this.estadoNuevo==='ENFERMA'&&!this.diagnosticoId){this.error.set('Seleccione una enfermedad del catálogo.');return;}
 if(!this.estadoValido(d))return;
 const confirmed=await this.confirmation?.show({title:this.estadoNuevo==='MUERTA'?'Dar de baja la planta':'Confirmar evaluación',
  message:this.estadoNuevo==='MUERTA'?`¿Confirmar la baja definitiva de ${d.codigo}? No podrá modificarse posteriormente.`:
    `¿Cambiar el estado de ${d.codigo} a ${this.estadoNuevo}?`,
  tone:this.estadoNuevo==='MUERTA'?'danger':'warning',confirmLabel:this.estadoNuevo==='MUERTA'?'Confirmar baja':'Guardar evaluación'});
 if(!confirmed?.confirmed)return;
 const payload:EstadoE3={version:d.version,estado:this.estadoNuevo,
  diagnosticoId:this.estadoNuevo==='ENFERMA'?this.diagnosticoId:undefined,
  observacion:this.observacionEstado.trim()||undefined,visitaId:this.visitaId};
 this.mutate(this.service.estado(a,d.plantaId,payload),()=>{
  this.toast.success('Estado actualizado');this.cerrarEvaluacion();this.observacionEstado='';this.refreshDetail(d.plantaId);this.cargarEstadisticas();
 });
}
editar(plantaId:number):void{
 const a=this.context();if(!a||!this.puedeEditar())return;
 this.service.ver(a,plantaId).subscribe({next:d=>{
  if((d.estado==='MUERTA'||d.estado==='ELIMINADA')){this.toast.error('La planta está dada de baja.');return;}
  this.detail.set(d);this.fechaPlantacion=d.fechaPlantacion??'';this.edadReferencia=d.edadReferenciaAnios??null;
  this.variedadEditar=d.variedadId;this.estadoNuevo=d.estado;this.diagnosticoId=0;this.observacionEstado='';
  this.editarDialog?.nativeElement.showModal();
 },error:e=>this.error.set(mapOpenApiError(e).message)});
}
cerrarEditar():void{if(!this.saving()&&this.editarDialog?.nativeElement.open)this.editarDialog.nativeElement.close();}
guardarFicha():void{
 const a=this.context(),d=this.detail();if(!a||!d||(d.estado==='MUERTA'||d.estado==='ELIMINADA')||this.saving())return;
 const variedadId=this.variedadEditar!==d.variedadId?this.variedadEditar:undefined;
 const fechaPlantacion=this.fechaPlantacion&&this.fechaPlantacion!==d.fechaPlantacion?this.fechaPlantacion:undefined;
 const edadReferenciaAnios=!fechaPlantacion&&this.edadReferencia!==d.edadReferenciaAnios?this.edadReferencia??undefined:undefined;
 if(!variedadId&&!fechaPlantacion&&edadReferenciaAnios===undefined){this.cerrarEditar();return;}
 this.mutate(this.service.ficha(a,d.plantaId,{version:d.version,fechaPlantacion,edadReferenciaAnios,variedadId}),()=>{
  this.toast.success('Ficha actualizada');this.cerrarEditar();this.refreshDetail(d.plantaId);
 });
}
puedeDeclararMuerta(d:DetalleE3):boolean{
 return d.estado==='ENFERMA'&&d.episodios.some(e=>!e.fin);
}
enfermedadesVigentes(d:DetalleE3):number{return d.episodios.filter(e=>!e.fin).length;}
private estadoValido(d:DetalleE3):boolean{
 if(this.estadoNuevo==='SIN_EVALUAR'||this.estadoNuevo==='ELIMINADA'||this.estadoNuevo===d.estado)return false;
 if(this.estadoNuevo==='ENFERMA'&&!this.diagnosticoId){this.error.set('Seleccione la enfermedad confirmada.');return false;}
 if(this.estadoNuevo==='MUERTA'&&!this.puedeDeclararMuerta(d)){
  this.error.set('Para declarar una planta muerta debe tener una enfermedad vigente.');return false;
 }
 if(this.estadoNuevo==='SANA'&&d.estado==='ENFERMA'){
  const abiertos=d.episodios.filter(e=>!e.fin);
  if(!abiertos.length||abiertos.some(e=>!d.tratamientos.some(t=>t.episodioId===e.episodioId))){
   this.error.set('Para declarar una planta sana registre primero un tratamiento para cada enfermedad vigente.');return false;
  }
  if(!this.observacionEstado.trim()){
   this.error.set('Describa por qué la planta se considera recuperada.');return false;
  }
 }
 if(this.estadoNuevo==='MUERTA'&&this.observacionEstado.trim().length<5){this.error.set('Indique el motivo de la muerte.');return false;}
 return true;
}
darDeBaja(planta:PlantaE3):void{
 if(planta.estado==='ELIMINADA'||this.saving()||!this.puedeEditar())return;
 this.plantaEliminar.set(planta);this.motivoEliminar='';this.eliminarDialog?.nativeElement.showModal();
}
cerrarEliminar():void{if(!this.saving()&&this.eliminarDialog?.nativeElement.open)this.eliminarDialog.nativeElement.close();}
confirmarEliminar():void{
 const a=this.context(),p=this.plantaEliminar();
 if(!a||!p||this.motivoEliminar.trim().length<5||this.saving())return;
 this.service.ver(a,p.plantaId).subscribe({next:d=>{
  this.mutate(this.clinical.eliminarPlanta(a,d.plantaId,d.version,this.motivoEliminar.trim()),()=>{
   this.toast.success('Planta eliminada del registro activo');this.cerrarEliminar();this.plantaEliminar.set(null);
   this.listar();this.cargarEstadisticas();this.cargarAltaInicial();
  });
 },error:e=>this.error.set(mapOpenApiError(e).message)});
}
tratar():void{
 const a=this.context(),d=this.detail();if(!a||!d||d.estado!=='ENFERMA'||!this.catalogoTratamientoId||this.saving())return;
 if(!this.tratamientosDisponibles().some(x=>x.id===this.catalogoTratamientoId)){
  this.error.set('Seleccione un tratamiento válido para la enfermedad.');return;
 }
 this.mutate(this.service.tratar(a,d.plantaId,{catalogoTratamientoId:this.catalogoTratamientoId,
  resultado:this.resultadoTratamiento.trim()||undefined,visitaId:this.visitaId}),()=>{
  this.toast.success('Tratamiento registrado');this.catalogoTratamientoId=0;this.resultadoTratamiento='';this.refreshDetail(d.plantaId);this.cargarEstadisticas();
 });
}

 seguir():void{
  const a=this.context(),d=this.detail();if(!a||!d||(d.estado==='MUERTA'||d.estado==='ELIMINADA')||!this.seguimiento.trim())return;
  this.mutate(this.service.seguir(a,d.plantaId,{observacion:this.seguimiento.trim(),
   tipo:this.seguimientoTipo,resultado:this.seguimientoResultado.trim()||undefined,visitaId:this.visitaId}),()=>{
    this.toast.success('Actuación registrada');this.seguimiento='';this.seguimientoResultado='';this.refreshDetail(d.plantaId);
  });
 }
 guardarProduccion():void{
  const a=this.context(),d=this.detail();
  if(!a||!d||(d.estado==='MUERTA'||d.estado==='ELIMINADA')||this.produccionKg===null||!Number.isFinite(this.produccionKg)||this.produccionKg<0||
     this.anio<2000||this.anio>2200||!this.fechaProduccion||Number(this.fechaProduccion.slice(0,4))!==this.anio)return;
  const data={anio:this.anio,tipo:this.tipoProduccion,
   estimadoKg:this.tipoProduccion==='ESTIMACION'?this.produccionKg:undefined,
   realKg:this.tipoProduccion==='COSECHA'?this.produccionKg:undefined,
   fechaEvento:this.fechaProduccion,visitaId:this.visitaId,observacion:this.observacionProduccion.trim()||undefined};
  this.mutate(this.service.produccion(a,d.plantaId,data),()=>{
   this.toast.success(this.tipoProduccion==='COSECHA'?'Cosecha agregada':'Estimación actualizada');this.cerrarProduccion();
   this.produccionKg=null;this.observacionProduccion='';this.refreshDetail(d.plantaId);
  });
 }
}
