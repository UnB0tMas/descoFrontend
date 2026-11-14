import {CommonModule} from '@angular/common';
import {ChangeDetectionStrategy,Component,Input} from '@angular/core';
import {EstadisticasE3,ProduccionPeriodoE3} from '../../../../domain/planta-paltera.model';

interface ActividadBarra {
 etiqueta:string;
 nuevos:number;
 controladas:number;
 bajas:number;
 altoNuevos:number;
 altoControladas:number;
 altoBajas:number;
}
interface ProduccionBarra {
 anio:number;
 estimado:number;
 real:number;
 tieneEstimacion:boolean;
 tieneReal:boolean;
 altoEstimado:number;
 altoReal:number;
}

/** Gráficas propias CSS: reflejan solo cifras reales; sin ApexCharts ni series ficticias. */
@Component({selector:'app-e3-expediente-graficos',standalone:true,imports:[CommonModule],
 templateUrl:'./e3-expediente-graficos.html',styleUrl:'./e3-expediente-graficos.css',
 changeDetection:ChangeDetectionStrategy.OnPush})
export class E3ExpedienteGraficosComponent {
 @Input() estadisticas:EstadisticasE3|null=null;
 @Input() produccion:ProduccionPeriodoE3[]=[];
 @Input() desde='';
 @Input() hasta='';
 @Input() soloProduccion=false;
 get actividad():ActividadBarra[]{
  const original=this.estadisticas?.serie??[];
  // Agrupar intervalos consecutivos: evita barras ilegibles en periodos extensos.
  const salto=Math.max(1,Math.ceil(original.length/12));
  const grupos:{fecha:string;nuevos:number;controladas:number;bajas:number}[]=[];
  for(let i=0;i<original.length;i+=salto){
   const tramo=original.slice(i,i+salto);
   grupos.push({fecha:tramo[0].fecha,
    nuevos:tramo.reduce((s,x)=>s+Math.max(0,x.nuevosCasos??0),0),
    controladas:tramo.reduce((s,x)=>s+Math.max(0,x.recuperadas??0),0),
    bajas:tramo.reduce((s,x)=>s+Math.max(0,x.bajas??0),0)});
  }
  const max=Math.max(1,...grupos.map(x=>x.nuevos+x.controladas+x.bajas));
  return grupos.map(x=>({etiqueta:x.fecha.slice(5),nuevos:x.nuevos,controladas:x.controladas,bajas:x.bajas,
   altoNuevos:100*x.nuevos/max,altoControladas:100*x.controladas/max,altoBajas:100*x.bajas/max}));
 }
 get hayActividad():boolean{return this.actividad.some(x=>x.nuevos+x.controladas+x.bajas>0);}
 get actividadTotal():number{return (this.estadisticas?.casosPeriodo??0)+(this.estadisticas?.tratamientosPeriodo??0);}
 get porAnio():ProduccionBarra[]{
  const original=[...(this.produccion??[])].sort((a,b)=>a.anio-b.anio).slice(-10);
  const max=Math.max(1,...original.map(x=>Math.max(x.tieneEstimacion?(x.estimadoKg??0):0,x.tieneReal?x.realKg:0)));
  return original.map(x=>({anio:x.anio,estimado:x.estimadoKg??0,real:x.realKg??0,
   tieneEstimacion:x.tieneEstimacion,tieneReal:x.tieneReal,
   altoEstimado:x.tieneEstimacion?100*(x.estimadoKg??0)/max:0,
   altoReal:x.tieneReal?100*x.realKg/max:0}));
 }
 get totalReal():number{return (this.produccion??[]).reduce((s,x)=>s+(x.tieneReal?x.realKg:0),0);}
 get promedioReal():number{
  const anios=(this.produccion??[]).filter(x=>x.tieneReal);
  return anios.length?anios.reduce((s,x)=>s+x.realKg,0)/anios.length:0;
 }
 get periodosConCosecha():number{return (this.produccion??[]).filter(x=>x.tieneReal).length;}
}
