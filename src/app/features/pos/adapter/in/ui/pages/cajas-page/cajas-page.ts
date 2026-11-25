import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize, forkJoin, switchMap, of, map } from 'rxjs';
import { faCashRegister, faEye, faPen, faTrashCan, faLockOpen, faArrowRightArrowLeft, faMoneyBillTransfer, faLock, faPrint, faFilePdf, faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AppButtonComponent } from '../../../../../../../shared/actions/app-button/app-button';
import { AppToggleComponent } from '../../../../../../../shared/forms/app-toggle/app-toggle';
import { DataTableComponent } from '../../../../../../../shared/data-display/data-table/data-table';
import { PaginatorComponent } from '../../../../../../../shared/data-display/paginator/paginator';
import { DataTableColumn } from '../../../../../../../shared/data-display/data-table/data-table.types';
import { StatusBadgeComponent } from '../../../../../../../shared/data-display/status-badge/status-badge';
import { E3FileDropzoneComponent } from '../../../../../../../shared/files/file-dropzone/file-dropzone';
import { CajaEvidenciaService } from '../../../../../shared/caja-evidencia.service';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { AccessStore } from '../../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ActionConfirmDialogComponent } from '../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { CajaPos, CajaSesion, CajaOperador, CajaPosApiService } from '../../../../../shared/caja-pos-api.service';

import { CajaArqueoPanelComponent } from '../../../../../shared/ui/caja-arqueo-panel/caja-arqueo-panel';
import { CajaArqueo } from '../../../../../shared/caja-pos-api.service';

type AccionTurno='ASIGNAR'|'MOVIMIENTO'|'CERRAR';
@Component({
  selector:'app-cajas-page',standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,PageHeaderComponent,ActionConfirmDialogComponent,FaIconComponent,E3FileDropzoneComponent,CajaArqueoPanelComponent,AppButtonComponent,AppToggleComponent,DataTableComponent,PaginatorComponent,StatusBadgeComponent],
  templateUrl:'./cajas-page.html',styleUrl:'./cajas-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class CajasPage {
  @ViewChild(CajaArqueoPanelComponent) private arqueoPanel?:CajaArqueoPanelComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirm?:ActionConfirmDialogComponent;
  @ViewChild('editorDialog') private editorDialog?:ElementRef<HTMLDialogElement>;
  @ViewChild('aperturaDialog') private aperturaDialog?:ElementRef<HTMLDialogElement>;
  @ViewChild('turnoDialog') private turnoDialog?:ElementRef<HTMLDialogElement>;
  readonly uot=inject(UotContextStore);
  readonly permissions=inject(PermissionService);
  private readonly access=inject(AccessStore);
  private readonly api=inject(CajaPosApiService);
  private readonly evidencias=inject(CajaEvidenciaService);
  private readonly toast=inject(ToastService);
  readonly icon=faCashRegister;
  readonly verIcon=faEye;readonly editarIcon=faPen;readonly borrarIcon=faTrashCan;readonly abrirIcon=faLockOpen;readonly transferIcon=faArrowRightArrowLeft;readonly moverIcon=faMoneyBillTransfer;readonly cerrarIcon=faLock;readonly ticketIcon=faPrint;readonly pdfIcon=faFilePdf;readonly arqueoIcon=faScaleBalanced;
  readonly columnasTurno: readonly DataTableColumn<CajaSesion>[] = [
    {key:'sesionId',label:'Turno',width:'5rem',format:value=>`#${value}`},
    {key:'caja',label:'Caja'},
    {key:'operadorId',label:'Operador',value:row=>this.nombreOperador(row.operadorId)},
    {key:'fechaApertura',label:'Apertura',format:value=>this.formatoFecha(String(value))},
    {key:'fechaCierre',label:'Cierre',format:value=>value?this.formatoFecha(String(value)):'—'},
    {key:'estado',label:'Estado'},
    {key:'acciones',label:'Acciones',width:'15rem'},
  ];
  private formatoFecha(fecha:string):string {
    const [dia,hora=''] = fecha.split('T');
    const [anio,mes,fechaDia] = dia.split('-');
    return `${fechaDia}/${mes}/${anio?.slice(-2)} ${hora.slice(0,5)}`;
  }
  readonly cajas=signal<CajaPos[]>([]);
  readonly incluirInactivas=signal(false);
  readonly visibles=computed(()=>this.cajas().filter(c=>c.activa||this.incluirInactivas()));
  readonly sesiones=signal<CajaSesion[]>([]);
  readonly pagina=signal(1);
  readonly tamanoPagina=signal(10);
  readonly paginas=computed(()=>Math.ceil(this.sesiones().length/this.tamanoPagina()));
  readonly paginaVisible=computed(()=>Math.min(this.pagina(),Math.max(1,this.paginas())));
  readonly sesionesPaginadas=computed(()=>{
    const inicio=(this.paginaVisible()-1)*this.tamanoPagina();
    return this.sesiones().slice(inicio,inicio+this.tamanoPagina());
  });
  cambiarPagina(pagina:number):void {this.pagina.set(pagina);}
  cambiarTamano(tamano:number):void {this.tamanoPagina.set(tamano);this.pagina.set(1);}

  readonly operadores=signal<CajaOperador[]>([]);
  readonly asignados=signal<CajaOperador[]>([]);
  readonly busy=signal(false);
  readonly error=signal<string|null>(null);
  readonly modalError=signal<string|null>(null);
  readonly edited=signal<CajaPos|null>(null);
  readonly selected=signal<CajaSesion|null>(null);
  readonly accion=signal<AccionTurno>('MOVIMIENTO');
  readonly saldoCierre=signal<CajaArqueo|null>(null);
  nombre='';cajaId=0;operadorId=0;montoInicial=0;observacionApertura='';fotosAbrir:File[]=[];fotosCerrar:File[]=[];
  nuevoOperador=0;montoCierre=0;observacion='';
  tipoMovimiento:'INGRESO'|'EGRESO'='INGRESO';montoMovimiento=0;motivoMovimiento='';
  private previous='';

  constructor(){
    effect(()=>{
      const uotId=this.uot.isGeneral()?null:this.uot.selectedId();
      const usuario=this.access.user()?.usuarioId??0;
      untracked(()=>{
        const key=`${uotId??0}:${usuario}`;
        if(this.previous===key)return;
        this.previous=key;this.closeDialogs();this.cajas.set([]);this.sesiones.set([]);this.operadores.set([]);
        this.selected.set(null);this.pagina.set(1);this.operadorId=usuario;this.nuevoOperador=usuario;
        if(uotId && usuario)this.reload();
      });
    });
  }
  get uotId():number{return this.uot.isGeneral()?0:(this.uot.selectedId()??0);}
  nombreOperador(id:number|null):string{
    const op=this.operadores().find(o=>o.usuarioId===id);
    return op?op.nombreCompleto:'No identificado';
  }
  get abiertas():number{return this.cajas().filter(c=>c.activa&&c.estado==='ABIERTA').length;}
  get libres():number{return this.cajas().filter(c=>c.activa&&c.estado!=='ABIERTA').length;}
  reload():void{
    if(!this.uotId || this.busy())return;
    const id=this.uotId;this.busy.set(true);this.error.set(null);
    const supervisa=this.permissions.has('CAJAS_LISTAR');
    const cajas$=supervisa ? this.api.cajas(id,this.incluirInactivas() && this.permissions.has('CAJAS_SUPERVISAR'))
      : this.api.disponibles(id).pipe(map(disponibles=>disponibles.map(c=>({
          cajaId:c.cajaId,uotId:id,codigo:c.codigo,nombre:c.nombre,sesionId:null,operadorId:null,
          estado:'DISPONIBLE',saldoInicial:null,activa:true
        } as CajaPos))));
    const activa$=supervisa ? of(null) : this.api.activa(id);
    forkJoin({cajas:cajas$,sesiones:supervisa?this.api.sesiones(id):of([] as CajaSesion[]),
      operadores:supervisa?this.api.operadores(id):of([] as CajaOperador[]),activa:activa$})
      .pipe(finalize(()=>this.busy.set(false))).subscribe({
        next:data=>{if(id!==this.uotId)return;this.cajas.set(data.activa&&!supervisa?[
          ...data.cajas.filter(c=>c.cajaId!==data.activa!.cajaId),{
            cajaId:data.activa.cajaId,uotId:id,codigo:`CAJA-${data.activa.cajaId}`,
            nombre:data.activa.caja,sesionId:data.activa.sesionId,operadorId:data.activa.operadorId,
            estado:'ABIERTA',saldoInicial:data.activa.saldoInicial,activa:true,
          }]:data.cajas);
          this.sesiones.set(data.activa&&!supervisa?[data.activa]:data.sesiones);
          this.operadores.set(data.operadores);},
        error:e=>this.error.set(mapOpenApiError(e).message),
      });
  }
  private closeDialogs():void{
    this.editorDialog?.nativeElement.close();this.aperturaDialog?.nativeElement.close();
    this.turnoDialog?.nativeElement.close();this.modalError.set(null);
  }
  openCreate():void{
    this.edited.set(null);this.nombre='';this.modalError.set(null);
    this.editorDialog?.nativeElement.showModal();
  }
  openEdit(row:CajaPos):void{
    if(!row.activa||row.estado==='ABIERTA')return;
    this.edited.set(row);this.nombre=row.nombre;this.modalError.set(null);
    this.editorDialog?.nativeElement.showModal();
  }
  openApertura(row?:CajaPos):void{
    this.cajaId=row?.cajaId??this.cajas().find(c=>c.activa&&c.estado!=='ABIERTA')?.cajaId??0;
    this.operadorId=this.permissions.has('CAJAS_ASIGNAR')
      ? (this.operadores().find(o=>o.usuarioId===this.access.user()?.usuarioId)?.usuarioId??this.operadores()[0]?.usuarioId??0)
      : (this.access.user()?.usuarioId??0);
    this.montoInicial=0;this.observacionApertura='';this.fotosAbrir=[];this.modalError.set(null);this.aperturaDialog?.nativeElement.showModal();
  }
  openTurno(row:CajaSesion,accion:AccionTurno):void{
    if(row.estado!=='ABIERTA')return;
    this.selected.set(row);this.accion.set(accion);this.modalError.set(null);
    this.asignados.set([]);
    if(accion==='ASIGNAR')this.api.asignados(row.sesionId,this.uotId).subscribe({
      next:items=>this.asignados.set(items),error:e=>this.modalError.set(mapOpenApiError(e).message)});
    this.nuevoOperador=row.operadorId;this.tipoMovimiento='INGRESO';this.montoMovimiento=0;
    this.motivoMovimiento='';this.montoCierre=0;this.observacion='';this.fotosCerrar=[];
    this.saldoCierre.set(null);
    if (accion === 'CERRAR') {
      const uotId = this.uotId;
      this.api.arqueo(row.sesionId, uotId).subscribe({
        next: balance => {if(uotId === this.uotId && balance?.estado === 'ABIERTA') {
          this.saldoCierre.set(balance); this.montoCierre = balance.saldoEsperado;
          this.turnoDialog?.nativeElement.showModal();
        }},
        error: e => this.error.set(mapOpenApiError(e).message),
      });
    } else this.turnoDialog?.nativeElement.showModal();
  }
  simular(s:CajaSesion):void {this.arqueoPanel?.simular(s.sesionId,this.uotId);}
  imprimir(s:CajaSesion):void {this.arqueoPanel?.imprimirCierre(s.sesionId,this.uotId);}
  reportePdf(s:CajaSesion):void {this.arqueoPanel?.descargarPdf(s.sesionId,this.uotId);}
  get diferenciaCierre():number {
    return Math.round((this.montoCierre-(this.saldoCierre()?.saldoEsperado??this.montoCierre))*100)/100;
  }
  private write<T>(operation:Observable<T>,message:string,after?:()=>void):void{
    if(this.busy())return;
    const id=this.uotId;this.busy.set(true);this.modalError.set(null);
    operation.subscribe({
      next:()=>{this.busy.set(false);this.closeDialogs();this.toast.success(message);if(id===this.uotId){this.reload();after?.();}},
      error:e=>{this.busy.set(false);this.modalError.set(mapOpenApiError(e).message);},
    });
  }
  save():void{
    if(this.busy()||!this.uotId||this.nombre.trim().length<3)return;
    const row=this.edited(),input={uotId:this.uotId,nombre:this.nombre.trim()};
    if(row){if(!this.permissions.has('CAJAS_EDITAR'))return;
      this.write(this.api.editar(row.cajaId,input),'Caja actualizada');}
    else {if(!this.permissions.has('CAJAS_CREAR'))return;
      this.write(this.api.crear(input),'Caja registrada');}
  }
  abrir():void{
    if(this.busy()||!this.permissions.has('CAJAS_ABRIR')||!this.cajaId||this.montoInicial<0)return;
    this.write(this.evidencias.cargar(this.uotId,this.fotosAbrir).pipe(switchMap(archivos=>
      this.api.abrir({uotId:this.uotId,cajaId:this.cajaId,saldoInicial:this.montoInicial,
        observacion:this.observacionApertura.trim()||undefined,archivos}))),'Caja abierta');
  }
  quitarAsignado(operadorId:number):void {
    const sesion=this.selected();if(!sesion||this.busy()||!this.permissions.has('CAJAS_ASIGNAR')||
      operadorId===sesion.usuarioAperturaId)return;
    this.busy.set(true);this.modalError.set(null);
    this.api.quitar(sesion.sesionId,operadorId,this.uotId).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.toast.success('Empleado retirado');this.api.asignados(sesion.sesionId,this.uotId)
        .subscribe({next:items=>this.asignados.set(items)});},
      error:e=>this.modalError.set(mapOpenApiError(e).message),
    });
  }
  saveTurno():void{
    const row=this.selected();if(!row||row.estado!=='ABIERTA'||this.busy())return;
    if(this.accion()==='ASIGNAR'&&this.permissions.has('CAJAS_ASIGNAR')&&this.nuevoOperador>0)
      this.write(this.api.asignar(row.sesionId,{uotId:this.uotId,operadorId:this.nuevoOperador}),'Empleado agregado');
    if(this.accion()==='MOVIMIENTO'&&this.permissions.has('CAJAS_MOVIMIENTOS')&&
       this.montoMovimiento>0&&this.motivoMovimiento.trim().length>=5)
      this.write(this.api.movimiento(row.sesionId,{uotId:this.uotId,tipo:this.tipoMovimiento,
        importe:this.montoMovimiento,motivo:this.motivoMovimiento.trim()}),'Movimiento registrado');
    if(this.accion()==='CERRAR'&&this.permissions.has('CAJAS_CERRAR')&&this.montoCierre>=0&&
       !!this.saldoCierre() && (this.diferenciaCierre===0||!!this.observacion.trim()))
      this.write(this.evidencias.cargar(this.uotId,this.fotosCerrar).pipe(switchMap(archivos=>
        this.api.cerrar(row.sesionId,{uotId:this.uotId,saldoDeclarado:this.montoCierre,
        observacion:this.observacion.trim()||undefined,archivos}))),'Caja cerrada',
        ()=>this.arqueoPanel?.imprimirCierre(row.sesionId,this.uotId));
  }
  async retirar(row:CajaPos):Promise<void>{
    if(this.busy()||row.estado==='ABIERTA'||!this.permissions.has('CAJAS_RETIRAR'))return;
    const answer=await this.confirm?.show({title:'Deshabilitar caja',
      message:`¿Deseas deshabilitar ${row.nombre}?`,
      confirmLabel:'Deshabilitar',cancelLabel:'Cancelar',tone:'warning'});
    if(answer?.confirmed)this.write(this.api.retirar(row.cajaId,this.uotId),'Caja deshabilitada');
  }
}
