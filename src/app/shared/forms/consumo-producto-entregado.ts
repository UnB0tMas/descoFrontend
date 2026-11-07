import {Component,Input,Output,EventEmitter,OnChanges,SimpleChanges,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient,HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
export interface UsoProducto {programacionProductoId?:number;cantidadUtilizada?:number;}
interface Entregado {programacionProductoId:number;producto:string;unidadMedida:string;almacen:string;cantidadPendiente:number;}
@Component({selector:'app-consumo-producto-entregado',standalone:true,imports:[FormsModule],template:`
 <label class="admin-field">Producto entregado
  <select class="admin-select" [ngModel]="value.programacionProductoId || 0" [ngModelOptions]="{standalone:true}" (ngModelChange)="select($event)">
   <option [ngValue]="0">Sin producto de almacén / aporte externo</option>
   @for(p of items();track p.programacionProductoId){<option [ngValue]="p.programacionProductoId">{{p.producto}} · {{p.almacen}} · Disponible: {{p.cantidadPendiente}} {{p.unidadMedida}}</option>}
  </select>
 </label>
 @if(value.programacionProductoId){
  <label class="admin-field">Cantidad total utilizada ({{selected()?.unidadMedida}})
   <input class="admin-input" type="number" min="0.001" step="0.001" [max]="selected()?.cantidadPendiente ?? 0"
    [ngModel]="value.cantidadUtilizada" [ngModelOptions]="{standalone:true}" (ngModelChange)="quantity($event)" />
  </label>
  <small>Se registra el uso de lo entregado, sin descontarlo otra vez.</small>
 }
 @if(error()){<p class="admin-inline-error" role="alert">{{error()}}</p>}
 `,styles:[`:host{display:grid;gap:.75rem;grid-column:1/-1;min-width:0}`]})
export class ConsumoProductoEntregado implements OnChanges {
 private readonly http=inject(HttpClient);
 @Input() responsableEmpleadoId:number|null=null;
 @Input() value:UsoProducto={};
 @Output() valueChange=new EventEmitter<UsoProducto>();
 readonly items=signal<Entregado[]>([]);readonly error=signal<string|null>(null);
 ngOnChanges(changes:SimpleChanges):void {
  if(!changes['responsableEmpleadoId'] && changes['value']?.currentValue?.programacionProductoId)return;
  if(changes['responsableEmpleadoId'] && !changes['responsableEmpleadoId'].firstChange){this.value={};this.valueChange.emit(this.value);}
  let params=new HttpParams();if(this.responsableEmpleadoId)params=params.set('responsableEmpleadoId',this.responsableEmpleadoId);
  this.http.get<{datos:Entregado[]}>(environment.apiBaseUrl+'/api/v1/sanidad/recursos-entregados',{params}).subscribe({
   next:r=>{this.items.set(r.datos??[]);this.error.set(null);},error:()=>{this.items.set([]);this.error.set('No se pudieron consultar los productos entregados.');}});
 }
 selected(){return this.items().find(x=>x.programacionProductoId===Number(this.value.programacionProductoId));}
 select(id:number){this.value={programacionProductoId:Number(id)||undefined,cantidadUtilizada:undefined};this.valueChange.emit(this.value);}
 quantity(q:number){this.value={...this.value,cantidadUtilizada:Number(q)};this.valueChange.emit(this.value);}
 valid():boolean {if(!this.value.programacionProductoId)return true;const q=this.value.cantidadUtilizada;return !!this.selected()&&!!q&&Number.isFinite(q)&&q>0&&q<=this.selected()!.cantidadPendiente&&Math.abs(q*1000-Math.round(q*1000))<1e-7;}
}
