import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarPlus, faCircleCheck, faBan, faUsers, faPen, faTrashCan, faEye, faRotateLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
import { finalize, firstValueFrom } from 'rxjs';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { ListViewSwitchComponent, type ListViewMode } from '../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { DataTableComponent } from '../../../../../../../shared/data-display/data-table/data-table';
import type { DataTableColumn } from '../../../../../../../shared/data-display/data-table/data-table.types';
import { RecordCardComponent } from '../../../../../../../shared/data-display/record-card/record-card';
import { ModalShellComponent } from '../../../../../../../shared/feedback/modal-shell/modal-shell';
import { FormFieldComponent } from '../../../../../../../shared/forms/form-field/form-field';
import { AppButtonComponent } from '../../../../../../../shared/actions/app-button/app-button';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { ComercialPlanilla, ComercialPlantilla, ComercialAfectado, ComercialCambioAtencion, ComercialCambioAtencionLote, HorarioComercialApiService } from '../../../../../shared/horario-comercial-api.service';

const DIAS=[{dia:1,nombre:'Lunes'},{dia:2,nombre:'Martes'},{dia:3,nombre:'Miércoles'},
  {dia:4,nombre:'Jueves'},{dia:5,nombre:'Viernes'},{dia:6,nombre:'Sábado'},{dia:7,nombre:'Domingo'}] as const;
function minutos(hora:string):number {const [h,m]=hora.split(':').map(Number);return h*60+m;}
function formato(value:number):string {return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
@Component({selector:'app-personal-comercial-page',standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,FaIconComponent,PageHeaderComponent,
    ListViewSwitchComponent,DataTableComponent,RecordCardComponent,ActionConfirmDialogComponent,ModalShellComponent,FormFieldComponent,AppButtonComponent],
  templateUrl:'./personal-comercial-page.html',styleUrl:'./personal-comercial-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush})
export class PersonalComercialPage {
  @ViewChild('atencionModal') private atencionModal?:ModalShellComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog?:ActionConfirmDialogComponent;
  readonly icon=faUsers;
  readonly iconHorario=faCalendarPlus;
  readonly iconHabilitar=faCircleCheck;
  readonly iconSuspender=faBan;
  readonly iconEditar=faPen;
  readonly iconQuitar=faTrashCan;
  readonly iconDetalles=faEye;
  readonly iconRestaurar=faRotateLeft;
  readonly iconSeleccionado=faCheck;
  readonly uot=inject(UotContextStore);
  readonly permissions=inject(PermissionService);
  private readonly api=inject(HorarioComercialApiService);
  private readonly toast=inject(ToastService);
  readonly tab=signal<'general'|'atencion'|'turnos'|'personal'>('general');
  readonly loading=signal(false);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly modalError=signal<string|null>(null);
  readonly data=signal<ComercialPlanilla|null>(null);
  readonly plantillas=signal<ComercialPlantilla[]>([]);
  readonly plantillasError=signal<string|null>(null);
  readonly editandoPlantilla=signal<number|null>(null);
  nombrePlantilla='';
  desdePlantilla='07:00';
  hastaPlantilla='14:00';
  readonly turnoDetalle=signal<ComercialPlantilla|null>(null);
  readonly personalTurnoDetalle=computed(()=>{
    const t=this.turnoDetalle(),plan=this.data();
    if(!t||!plan)return [];
    return plan.turnos.filter(b=>b.horaInicio===t.horaInicio&&b.horaFin===t.horaFin)
      .map(b=>({empleadoId:b.empleadoId,dia:b.diaSemana,
        empleado:plan.empleados.find(e=>e.empleadoId===b.empleadoId)?.nombre??'Empleado'}))
      .sort((a,b)=>a.dia-b.dia||a.empleado.localeCompare(b.empleado));
  });
  readonly buscar=signal('');
  readonly vista=signal<ListViewMode>('table');
  readonly vistaTurnos=signal<ListViewMode>('table');
  readonly columnasTurnos:DataTableColumn<ComercialPlantilla>[]=[
    {key:'nombre',label:'Turno'},
    {key:'horario',label:'Horario'},
    {key:'acciones',label:'Acciones'},
  ];
  readonly columnasEmpleados:DataTableColumn<ComercialPlanilla['empleados'][number]>[]=[
    {key:'nombre',label:'Empleado'},
    {key:'turnos',label:'Turnos'},
    {key:'habilitadoPos',label:'Acceso'},
    {key:'acciones',label:'Acciones'},
  ];
  readonly estado=signal<'TODOS'|'HABILITADOS'|'SUSPENDIDOS'>('TODOS');
  @ViewChild('accesoDialog') private accesoDialog?:ElementRef<HTMLDialogElement>;
  @ViewChild('plantillaDialog') private plantillaDialog?:ElementRef<HTMLDialogElement>;
  readonly seleccionado=signal<ComercialPlanilla['empleados'][number]|null>(null);
  readonly habilitar=signal(false);
  motivoAcceso='';
  readonly dias=DIAS;
  inicio='07:00';fin='20:00';
  readonly seleccionDias=signal<number[]>([1,2,3,4,5,6,7]);
  readonly seleccionCompleta=computed(()=>this.seleccionDias().length===7);
  readonly previsualizados=signal<ComercialAfectado[]>([]);
  readonly diasAtencion=computed(()=>this.data()?.diasAtencion??[]);
  obtenerAtencion(dia:number){return this.diasAtencion().find(d=>d.diaSemana===dia);}
  detallesTurno(t:ComercialPlantilla):void {this.turnoDetalle.set(t);this.detallesModal?.open();}
  @ViewChild('detallesModal') private detallesModal?:ModalShellComponent;
  private last=0;
  constructor(){effect(()=>{const uot=this.uot.isGeneral()?0:(this.uot.selectedId()??0);
    untracked(()=>{if(this.last===uot)return;this.last=uot;this.confirmDialog?.cancel();this.atencionModal?.close();
      this.data.set(null);this.plantillas.set([]);this.accesoDialog?.nativeElement.close();
      this.plantillaDialog?.nativeElement.close();this.detallesModal?.close();if(uot)this.reload();});});}
  get uotId():number{return this.uot.isGeneral()?0:(this.uot.selectedId()??0);}
  readonly filtrados=computed(()=>{const q=this.buscar().trim().toLocaleLowerCase('es-PE');
    return (this.data()?.empleados??[]).filter(e=>
      (this.estado()==='TODOS'||(this.estado()==='HABILITADOS'?e.habilitadoPos:!e.habilitadoPos))&&
      (!q||e.nombre.toLocaleLowerCase('es-PE').includes(q)));});
  turnosEmpleado(id:number):number {return (this.data()?.turnos??[]).filter(t=>t.empleadoId===id).length;}
  readonly franjasTotal=computed(()=>{const d=this.data();if(!d)return 0;
    const ids=new Set(d.empleados.filter(e=>e.habilitadoPos).map(e=>e.empleadoId));return d.turnos.filter(t=>ids.has(t.empleadoId)).length;});
  readonly habilitados=computed(()=>(this.data()?.empleados??[]).filter(e=>e.habilitadoPos).length);
  readonly diasCubiertos=computed(()=>this.cobertura().filter(d=>d.libres.length===0).length);
  readonly cobertura=computed(()=>{
    const sheet=this.data();if(!sheet)return [];
    const validIds=new Set(sheet.empleados.filter(e=>e.habilitadoPos).map(e=>e.empleadoId));
    return DIAS.map(day=>{
      const config=sheet.diasAtencion?.find(d=>d.diaSemana===day.dia)??sheet.atencion;
      const start=minutos(config.horaInicio),end=minutos(config.horaFin),total=Math.max(1,end-start);
      const slots=sheet.turnos.filter(t=>t.diaSemana===day.dia && validIds.has(t.empleadoId));
      const sorted=slots.map(t=>[Math.max(start,minutos(t.horaInicio)),Math.min(end,minutos(t.horaFin))] as [number,number])
        .filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);
      const vacios:string[]=[];let cursor=start,covered=0;
      for(const [from,to] of sorted){if(from>cursor)vacios.push(`${formato(cursor)}–${formato(from)}`);
        if(to>cursor){covered+=to-Math.max(from,cursor);cursor=to;}}
      if(cursor<end)vacios.push(`${formato(cursor)}–${formato(end)}`);
      const names=[...new Set(slots.map(t=>sheet.empleados.find(e=>e.empleadoId===t.empleadoId)?.nombre).filter((v):v is string=>!!v))];
      return {dia:day.dia,nombre:day.nombre,porcentaje:Math.min(100,Math.round(100*covered/total)),
        libres:vacios,nombres:names,personas:names.length,turnos:slots.length,horaInicio:config.horaInicio,horaFin:config.horaFin};
    });
  });
  openAcceso(e:ComercialPlanilla['empleados'][number],habilitar:boolean):void {
    if(!this.permissions.has('PERSONAL_COMERCIAL_HABILITAR'))return;
    this.seleccionado.set(e);this.habilitar.set(habilitar);this.motivoAcceso='';this.modalError.set(null);
    this.accesoDialog?.nativeElement.showModal();
  }
  confirmarAcceso():void {
    const e=this.seleccionado();
    if(!e||this.saving()||!this.uotId||this.motivoAcceso.trim().length<5||
       !this.permissions.has('PERSONAL_COMERCIAL_HABILITAR'))return;
    this.saving.set(true);this.modalError.set(null);
    this.api.cambiarAcceso(this.uotId,e.empleadoId,this.habilitar(),this.motivoAcceso.trim())
      .pipe(finalize(()=>this.saving.set(false))).subscribe({
        next:()=>{this.accesoDialog?.nativeElement.close();this.toast.success('Acceso comercial actualizado');this.reload();},
        error:err=>this.modalError.set(mapOpenApiError(err).message),
      });
  }
  reload():void {const id=this.uotId;if(!id||this.loading())return;
    this.cargarPlantillas(id);
    this.loading.set(true);this.error.set(null);
    this.api.planilla(id).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:d=>{if(id===this.uotId)this.data.set(d??null);},
      error:e=>this.error.set(mapOpenApiError(e).message),
    });
  }
  private cargarPlantillas(uotId:number):void {
    this.api.plantillas(uotId).subscribe({
      next:items=>{if(uotId===this.uotId){this.plantillas.set([...(items??[])].sort((a,b)=>
          a.horaInicio.localeCompare(b.horaInicio)||a.nombre.localeCompare(b.nombre)));
          this.plantillasError.set(null);}},
      error:()=>{if(uotId===this.uotId)this.plantillasError.set('No se pudieron cargar los turnos guardados.');},
    });
  }
  nuevoTurno():void {
    if(!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
    this.editandoPlantilla.set(null);
    this.nombrePlantilla='';
    this.desdePlantilla=this.data()?.atencion.horaInicio??'07:00';
    this.hastaPlantilla=this.data()?.atencion.horaFin??'20:00';
    this.modalError.set(null);
    this.plantillaDialog?.nativeElement.showModal();
  }
  editarTurno(t:ComercialPlantilla):void {
    if(!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
    this.editandoPlantilla.set(t.plantillaId);
    this.nombrePlantilla=t.nombre;this.desdePlantilla=t.horaInicio;this.hastaPlantilla=t.horaFin;
    this.modalError.set(null);this.plantillaDialog?.nativeElement.showModal();
  }
  rangoTurnoValido():boolean {
    return this.nombrePlantilla.trim().length>=2&&this.nombrePlantilla.trim().length<=80&&
      !!this.desdePlantilla&&!!this.hastaPlantilla&&this.desdePlantilla<this.hastaPlantilla;
  }
  guardarTurno():void {
    if(!this.uotId||this.saving()||!this.rangoTurnoValido()||
      !this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
    const uot=this.uotId;
    this.saving.set(true);this.modalError.set(null);
    this.api.guardarPlantilla(uot,this.nombrePlantilla.trim(),this.desdePlantilla,this.hastaPlantilla,
      this.editandoPlantilla()).pipe(finalize(()=>this.saving.set(false))).subscribe({
        next:()=>{this.plantillaDialog?.nativeElement.close();this.toast.success('Turno guardado');this.cargarPlantillas(uot);},
        error:e=>this.modalError.set(mapOpenApiError(e).message),
      });
  }
  async eliminarTurno(t:ComercialPlantilla):Promise<void> {
    if(this.saving()||!this.uotId||!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
    const uot=this.uotId;
    const respuesta=await this.confirmDialog?.show({
      title:'Quitar turno guardado',
      message:`${t.nombre}. Los horarios asignados se conservarán.`,
      confirmLabel:'Quitar',tone:'danger',
    });
    if(!respuesta?.confirmed||this.saving()||uot!==this.uotId||
      !this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR')||
      !this.plantillas().some(p=>p.plantillaId===t.plantillaId))return;
    this.saving.set(true);
    this.api.eliminarPlantilla(uot,t.plantillaId).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success('Turno eliminado');this.cargarPlantillas(uot);},
      error:e=>this.error.set(mapOpenApiError(e).message),
    });
  }
  openAtencion(dia:number|null=null):void {
    if(!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR')||this.saving())return;
    const plan=this.data();if(!plan)return;
    this.seleccionDias.set(dia===null?DIAS.map(d=>d.dia):[dia]);
    const config=dia===null?plan.atencion:this.obtenerAtencion(dia)??plan.atencion;
    this.inicio=config.horaInicio;this.fin=config.horaFin;
    this.modalError.set(null);this.previsualizados.set([]);
    this.atencionModal?.open();
  }
  seleccionarTodos():void {
    if(this.saving())return;
    const plan=this.data();if(!plan)return;
    const todos=this.seleccionCompleta();
    this.seleccionDias.set(todos?[]:DIAS.map(d=>d.dia));
    this.inicio=plan.atencion.horaInicio;this.fin=plan.atencion.horaFin;
    this.modalError.set(null);this.previsualizados.set([]);
  }
  seleccionarDia(dia:number):void {
    if(this.saving())return;
    const actual=this.seleccionDias();
    const siguiente=actual.includes(dia)?actual.filter(d=>d!==dia):[...actual,dia].sort((a,b)=>a-b);
    this.seleccionDias.set(siguiente);
    // La selección parcial crea excepciones; el general permanece intacto.
    if(siguiente.length===1){
      const config=this.obtenerAtencion(siguiente[0])??this.data()?.atencion;
      if(config){this.inicio=config.horaInicio;this.fin=config.horaFin;}
    }else if(siguiente.length===7){
      const config=this.data()?.atencion;
      if(config){this.inicio=config.horaInicio;this.fin=config.horaFin;}
    }
    this.modalError.set(null);this.previsualizados.set([]);
  }
  private solicitudIndividual(modo:'GENERAL'|'PERSONALIZAR'|'HEREDAR',dia:number|null,
                              ajustar=false,vista:string|null=null):ComercialCambioAtencion {
    return {uotId:this.uotId,modo,diaSemana:dia,
      horaInicio:modo==='HEREDAR'?null:this.inicio,
      horaFin:modo==='HEREDAR'?null:this.fin,ajustarEmpleados:ajustar,vistaConfirmada:vista};
  }
  private solicitudLote(ajustar=false,vista:string|null=null):ComercialCambioAtencionLote {
    return {uotId:this.uotId,diasSemana:[...this.seleccionDias()],horaInicio:this.inicio,horaFin:this.fin,
      ajustarEmpleados:ajustar,vistaConfirmada:vista};
  }
  private vistaActual():string {
    return JSON.stringify(this.previsualizados().map(a=>({
      horarioId:a.horarioId,diaSemana:a.diaSemana,horaInicio:a.horaInicio,horaFin:a.horaFin
    })));
  }
  private async confirmarAjustes(afectados:ComercialAfectado[]):Promise<boolean> {
    if(!afectados.length)return true;
    const nombres=[...new Set(afectados.map(a=>a.empleado))];
    const bajas=afectados.filter(a=>a.quitar).length;
    const mensaje=`${afectados.length} horarios de ${nombres.join(', ')} requieren ajuste.`+
      (bajas?` ${bajas} se quitarán.`:'');
    const respuesta=await this.confirmDialog?.show({title:'Ajustar horarios del personal',
      message:mensaje,confirmLabel:'Ajustar y guardar',tone:'warning'});
    return !!respuesta?.confirmed;
  }
  async guardarAtencion():Promise<void> {
    if(!this.uotId||this.saving()||!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
    const dias=[...this.seleccionDias()];this.modalError.set(null);
    if(!dias.length){this.modalError.set('Selecciona al menos un día.');return;}
    if(!this.inicio||!this.fin||this.inicio>=this.fin){
      this.modalError.set('Revisa las horas seleccionadas.');return;
    }
    const uot=this.uotId, esGeneral=dias.length===7;
    this.saving.set(true);
    try {
      const previa=esGeneral
        ?await firstValueFrom(this.api.previsualizarAtencion(this.solicitudIndividual('GENERAL',null)))
        :await firstValueFrom(this.api.previsualizarAtencionLote(this.solicitudLote()));
      if(uot!==this.uotId)return;
      const afectados=previa.afectados??[];
      this.previsualizados.set(afectados);
      if(!await this.confirmarAjustes(afectados))return;
      if(uot!==this.uotId||!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
      const vista=afectados.length?this.vistaActual():null;
      if(esGeneral){
        await firstValueFrom(this.api.guardarAtencionSemanal(this.solicitudIndividual('GENERAL',null,!!afectados,vista)));
      }else{
        await firstValueFrom(this.api.guardarAtencionLote(this.solicitudLote(!!afectados,vista)));
      }
      if(uot!==this.uotId)return;
      // El guardado ya terminó; cerrar incluso si el indicador busy aún no se actualiza.
      this.atencionModal?.close(true);this.toast.success('Horario actualizado');this.reload();
    }catch(e){if(uot===this.uotId)this.modalError.set(mapOpenApiError(e).message);}
    finally{this.saving.set(false);}
  }
  async restaurarDia(dia:number):Promise<void> {
    if(!this.uotId||this.saving()||!this.permissions.has('HORARIO_COMERCIAL_CONFIGURAR'))return;
    const atencion=this.obtenerAtencion(dia);
    if(!atencion?.personalizado)return;
    const uot=this.uotId;
    const input:ComercialCambioAtencion={uotId:uot,modo:'HEREDAR',diaSemana:dia,
      horaInicio:null,horaFin:null,ajustarEmpleados:false,vistaConfirmada:null};
    this.saving.set(true);
    try {
      const previa=await firstValueFrom(this.api.previsualizarAtencion(input));
      if(uot!==this.uotId)return;
      const afectados=previa.afectados??[];
      const respuesta=await this.confirmDialog?.show({
        title:'Restaurar horario general',
        message:afectados.length
          ?`${this.dias[dia-1].nombre}: ${afectados.map(a=>a.empleado).filter((v,i,arr)=>arr.indexOf(v)===i).join(', ')} tiene horarios que requieren ajuste.`
          :`${this.dias[dia-1].nombre} utilizará el horario general.`,
        confirmLabel:'Restaurar',tone:'warning',
      });
      if(!respuesta?.confirmed||uot!==this.uotId)return;
      input.ajustarEmpleados=afectados.length>0;
      input.vistaConfirmada=afectados.length?JSON.stringify(afectados.map(a=>({
        horarioId:a.horarioId,horaInicio:a.horaInicio,horaFin:a.horaFin
      }))):null;
      await firstValueFrom(this.api.guardarAtencionSemanal(input));
      if(uot===this.uotId){this.toast.success('Horario restaurado');this.reload();}
    }catch(e){if(uot===this.uotId)this.error.set(mapOpenApiError(e).message);}
    finally{this.saving.set(false);}
  }

}
