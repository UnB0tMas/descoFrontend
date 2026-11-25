import {Component,Input,Output,EventEmitter,OnChanges,SimpleChanges,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient,HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';

export interface UsoProducto {
  programacionProductoId?:number;
  cantidadUtilizada?:number;
  salidaCampoId?:number;
  solicitudRecursoId?:number;
  unidadUtilizada?:string;
}
interface Entregado {
  programacionProductoId?:number;
  solicitudRecursoId?:number;
  salidaCampoId?:number;
  producto:string;
  unidadMedida:string;
  almacen?:string;
  cantidadEntregada:number;
  cantidadUtilizada:number;
  cantidadPendiente:number;
  lote?:string;
  fechaVencimiento?:string;
  fuente?:string;
}

/** Campo: únicamente recursos de la salida/visita; histórico: programaciones previas. */
@Component({selector:'app-consumo-producto-entregado',standalone:true,imports:[FormsModule],template:`
  @if(modoCampo && (!salidaCampoId || !visitaTecnicaId || !predioId)) {
    <p class="admin-inline-error" role="status">Seleccione una salida y una visita activa.</p>
  } @else {
    <label class="admin-field">Insumo entregado
      <select class="admin-select" [ngModel]="valorSeleccionado()" [ngModelOptions]="{standalone:true}"
        (ngModelChange)="select($event)">
        <option [ngValue]="0">{{modoCampo?'Seleccione un insumo de esta salida':'Sin producto de almacén / aporte externo'}}</option>
        @for(p of items();track p.solicitudRecursoId ?? p.programacionProductoId){
          <option [ngValue]="p.solicitudRecursoId ?? p.programacionProductoId">
            {{p.producto}} · Pendiente: {{p.cantidadPendiente}} {{p.unidadMedida}}
            @if(p.lote){· Lote: {{p.lote}}}
            @if(p.fechaVencimiento){· Vence: {{p.fechaVencimiento}}}
          </option>
        }
      </select>
    </label>
    @if(modoCampo && !items().length){<small>No hay insumos entregados disponibles para esta visita.</small>}
    @if(selected();as insumo){
      <div class="admin-field"><label for="consumo-entregado-unidad">Unidad utilizada</label>
        <select id="consumo-entregado-unidad" class="admin-select" [ngModel]="unidadSeleccionada()"
          [ngModelOptions]="{standalone:true}" (ngModelChange)="cambiarUnidad($event)">
          @for(unidad of unidadesCompatibles(insumo.unidadMedida);track unidad){<option [value]="unidad">{{unidad}}</option>}
        </select></div>
      <label class="admin-field">Cantidad utilizada ({{unidadSeleccionada()}})
        <input class="admin-input" type="number" min="0.001" step="any" [max]="maximo()"
          [ngModel]="value.cantidadUtilizada" [ngModelOptions]="{standalone:true}" (ngModelChange)="quantity($event)" />
      </label>
      <small>Entregado: {{insumo.cantidadEntregada}} · Usado: {{insumo.cantidadUtilizada}} · Pendiente: {{insumo.cantidadPendiente}} {{insumo.unidadMedida}}</small>
    }
  }
  @if(error()){<p class="admin-inline-error" role="alert">{{error()}}</p>}
`,styles:[`:host{display:grid;gap:.75rem;grid-column:1/-1;min-width:0}`]})
export class ConsumoProductoEntregado implements OnChanges {
  private readonly http=inject(HttpClient);
  @Input() responsableEmpleadoId:number|null=null;
  @Input() modoCampo=false;
  @Input() salidaCampoId:number|null=null;
  @Input() visitaTecnicaId:number|null=null;
  @Input() predioId:number|null=null;
  @Input() value:UsoProducto={};
  @Output() valueChange=new EventEmitter<UsoProducto>();
  readonly items=signal<Entregado[]>([]);
  readonly error=signal<string|null>(null);
  ngOnChanges(changes:SimpleChanges):void {
    const entradas=['responsableEmpleadoId','modoCampo','salidaCampoId','visitaTecnicaId','predioId'];
    if(!entradas.some(key=>changes[key]))return;
    if(changes['salidaCampoId'] || changes['visitaTecnicaId'] || changes['predioId'] || changes['modoCampo']
      || (changes['responsableEmpleadoId'] && !changes['responsableEmpleadoId'].firstChange)){
      this.value={};this.valueChange.emit(this.value);
    }
    if(this.modoCampo&&(!this.salidaCampoId||!this.visitaTecnicaId||!this.predioId)){
      this.items.set([]);this.error.set(null);return;
    }
    let params=new HttpParams();
    if(this.modoCampo){
      params=params.set('salidaCampoId',this.salidaCampoId!).set('visitaTecnicaId',this.visitaTecnicaId!)
        .set('predioId',this.predioId!);
    }else if(this.responsableEmpleadoId){params=params.set('responsableEmpleadoId',this.responsableEmpleadoId);}
    const currentSalida=this.salidaCampoId,currentVisita=this.visitaTecnicaId;
    this.http.get<{datos:Entregado[]}>(environment.apiBaseUrl+'/api/v1/sanidad/recursos-entregados',{params}).subscribe({
      next:r=>{if(currentSalida!==this.salidaCampoId||currentVisita!==this.visitaTecnicaId)return;
        this.items.set(r.datos??[]);this.error.set(null);},
      error:()=>{this.items.set([]);this.error.set('No se pudieron consultar los insumos entregados.');}
    });
  }
  valorSeleccionado():number{return this.modoCampo?this.value.solicitudRecursoId??0:this.value.programacionProductoId??0;}
  selected():Entregado|undefined{
    const id=this.valorSeleccionado();
    return this.items().find(x=>(this.modoCampo?x.solicitudRecursoId:x.programacionProductoId)===id);
  }
  select(id:number):void{
    const recurso=this.items().find(x=>(this.modoCampo?x.solicitudRecursoId:x.programacionProductoId)===Number(id));
    this.value=recurso?(this.modoCampo
      ?{salidaCampoId:this.salidaCampoId??undefined,solicitudRecursoId:recurso.solicitudRecursoId,
        unidadUtilizada:recurso.unidadMedida}
      :{programacionProductoId:recurso.programacionProductoId,unidadUtilizada:recurso.unidadMedida}):{};
    this.valueChange.emit(this.value);
  }
  unidadesCompatibles(unidad:string):string[]{
    const actual=unidad.toUpperCase();
    return actual==='L'?['L','ML']:actual==='ML'?['ML','L']:
      actual==='KG'?['KG','G']:actual==='G'?['G','KG']:[actual];
  }
  unidadSeleccionada():string{return this.value.unidadUtilizada||this.selected()?.unidadMedida||'';}
  cambiarUnidad(unidad:string):void{this.value={...this.value,unidadUtilizada:unidad,cantidadUtilizada:undefined};this.valueChange.emit(this.value);}
  private cantidadNormalizada(cantidad:number):number{
    const original=this.selected()?.unidadMedida.toUpperCase(),usada=this.unidadSeleccionada().toUpperCase();
    if(!original)return Number.NaN;
    if(original===usada)return cantidad;
    if((original==='L'&&usada==='ML')||(original==='KG'&&usada==='G'))return cantidad/1000;
    if((original==='ML'&&usada==='L')||(original==='G'&&usada==='KG'))return cantidad*1000;
    return Number.NaN;
  }
  maximo():number{
    const pendiente=this.selected()?.cantidadPendiente??0;
    const unidad=this.unidadSeleccionada().toUpperCase(),base=this.selected()?.unidadMedida.toUpperCase();
    return base!==unidad && (base==='L'&&unidad==='ML'||base==='KG'&&unidad==='G')?pendiente*1000:
      base!==unidad && (base==='ML'&&unidad==='L'||base==='G'&&unidad==='KG')?pendiente/1000:pendiente;
  }
  quantity(q:number):void{this.value={...this.value,cantidadUtilizada:Number(q)};this.valueChange.emit(this.value);}
  valid():boolean{
    if(!this.modoCampo&&!this.value.programacionProductoId)return true;
    const p=this.selected(),n=this.value.cantidadUtilizada;
    if(!p||n==null||!Number.isFinite(n)||n<=0||this.modoCampo&&!this.value.solicitudRecursoId)return false;
    const base=this.cantidadNormalizada(n);
    return Number.isFinite(base) && base>0 && base<=p.cantidadPendiente+1e-9
      && Math.abs(base*1000-Math.round(base*1000))<1e-7;
  }
}
