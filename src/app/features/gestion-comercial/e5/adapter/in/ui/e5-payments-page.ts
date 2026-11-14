import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faMoneyBillTransfer } from '@fortawesome/free-solid-svg-icons';
import { EMPTY, expand, finalize, forkJoin, map, Observable, of, reduce, switchMap } from 'rxjs';
import { CommercialApiService, CommercialOption } from '../../../../shared/commercial-api.service';
import { DataTableComponent } from '../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../shared/data-display/data-table/data-table.types';
import { ListViewSwitchComponent } from '../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { RecordCardComponent } from '../../../../../../shared/data-display/record-card/record-card';
import { LoadingStateComponent } from '../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../shared/data-display/empty-state/empty-state';
import { EntityRegistrationModalComponent, EntityDraft, EntitySaveContext } from '../../../../../../shared/forms/person-registration/entity-registration-modal';
import { E5UseCase } from '../../../application/use-case/e5.use-case';
import { E5ExtrasApiService, E5Beneficiario, E5PagoBeneficiario } from './e5-extras-api.service';
import { E5TableroResponse, E5LiquidacionesResponse } from '../../../../../../infrastructure/openapi/generated';
import { PermissionService } from '../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { LocalDocumentApiService } from '../../../../../../shared/files/local-document-api.service';
import { E3FileDropzoneComponent } from '../../../../../../shared/files/file-dropzone/file-dropzone';

interface CampaniaPago extends CommercialOption { estado: string; }
interface SocioPago {
  participacionId: number; liquidacionId: number; version: number;
  socio: string; kg: number; neto: number; pagado: number; saldo: number;
  estado: string; estadoPago: 'POR_APROBAR'|'PENDIENTE'|'PARCIAL'|'PAGADO'|'ANULADA';
}
type MedioPago = 'YAPE'|'PLIN'|'EFECTIVO'|'DEPOSITO';
type FiltroEstado = 'TODOS'|'PENDIENTE'|'PARCIAL'|'PAGADO'|'POR_APROBAR';

@Component({ selector: 'app-e5-payments', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FaIconComponent, PageHeaderComponent, DataTableComponent, ListViewSwitchComponent,
    RecordCardComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent,
    EntityRegistrationModalComponent, E3FileDropzoneComponent],
  templateUrl: './e5-payments-page.html', styleUrl: './e5-payments-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush })
export class E5PaymentsPage implements OnInit, OnDestroy {
  @ViewChild('payDialog', {static:true}) private payDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('entityModal', {static:true}) private entityModal!: EntityRegistrationModalComponent;
  private readonly campaigns=inject(CommercialApiService);
  private readonly route=inject(ActivatedRoute);
  private readonly api=inject(E5UseCase);
  private readonly extras=inject(E5ExtrasApiService);
  private readonly permission=inject(PermissionService);
  private readonly toast=inject(ToastService);
  private readonly documents=inject(LocalDocumentApiService);
  private request=0;
  readonly options=signal<readonly CampaniaPago[]>([]);
  readonly loadingCampaigns=signal(false);
  readonly board=signal<E5TableroResponse|null>(null);
  readonly liquidaciones=signal<E5LiquidacionesResponse|null>(null);
  readonly beneficiary=signal<E5Beneficiario|null>(null);
  readonly receptor=signal<{id:number; nombre:string; documento:string}|null>(null);
  readonly loading=signal(false);
  readonly busy=signal(false);
  readonly error=signal<string|null>(null);
  readonly view=signal<'table'|'cards'>('table');
  readonly detailIcon=faEye;
  readonly payIcon=faMoneyBillTransfer;
  readonly proof=signal<File|null>(null);
  readonly proofFiles=computed(()=>this.proof()?[this.proof()!]:[]);
  readonly proofAccept='image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf';
  private uploadedProof:{file:File;archivoId:number}|null=null;
  readonly search=signal('');
  readonly status=signal<FiltroEstado>('TODOS');
  readonly campaign=computed(()=>this.options().find(c=>c.value===this.campaignId));
  readonly campaignState=computed(()=>this.board()?.estado??this.campaign()?.estado??'');
  readonly readOnly=computed(()=>this.campaignState()!=='ACTIVA'||!!this.board()?.cerrada);
  readonly canList=computed(()=>this.permission.hasAll(['APAPPSS_PAGOS_LISTAR','PAGOS_LISTAR','LIQUIDACIONES_LISTAR']));
  readonly canView=computed(()=>this.permission.hasAll(['APAPPSS_PAGOS_VER','PAGOS_VER','LIQUIDACIONES_VER','PAGOS_LISTAR']));
  readonly canPay=computed(()=>this.permission.hasAll(['APAPPSS_PAGOS_PAGAR','PAGOS_CONFIRMAR']));
  readonly canRegisterReceiver=computed(()=>this.canPay());
  readonly columns:readonly DataTableColumn<SocioPago>[]=[
    {key:'socio',label:'Socio'},
    {key:'version',label:'Versión'},
    {key:'kg',label:'Kg aceptados',format:v=>Number(v??0).toFixed(3)},
    {key:'neto',label:'Neto',format:v=>this.money(v)},
    {key:'pagado',label:'Pagado',format:v=>this.money(v)},
    {key:'saldo',label:'Saldo',format:v=>this.money(v)},
    {key:'estadoPago',label:'Situación',format:v=>this.estadoTexto(String(v??''))},
    {key:'acciones',label:'Acciones',align:'right'},
  ];
  estadoTexto(value:string):string {
    const labels:Record<string,string>={POR_APROBAR:'Por aprobar',PENDIENTE:'Pendiente',PARCIAL:'Pago parcial',PAGADO:'Pagado',ANULADA:'Anulada'};
    return labels[value]??value;
  }
  private money(value:unknown):string {
    return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(value??0));
  }
  private cents(value:number):number { return Math.round(Number(value??0)*100); }
  private situation(l:{estado?:string|null;neto?:number|null;pagado?:number|null}):SocioPago['estadoPago'] {
    if(l.estado==='ANULADA')return 'ANULADA';
    const paid=this.cents(l.pagado??0),net=this.cents(l.neto??0);
    if(paid>0)return paid>=net?'PAGADO':'PARCIAL';
    return l.estado==='APROBADA'||l.estado==='PAGADA_PARCIAL'||l.estado==='PAGADA'?'PENDIENTE':'POR_APROBAR';
  }
  readonly allRows=computed<SocioPago[]>(()=>{
    const source=this.liquidaciones()?.liquidaciones??[];
    const socios=new Map((this.board()?.socios??[]).map(s=>[s.participacionId??0,s]));
    const latest=new Map<number,typeof source[number]>();
    for(const l of source){
      if(!l.liquidacionId||!l.participacionId||l.estado==='ANULADA')continue;
      const old=latest.get(l.participacionId);
      if(!old||(l.version??0)>(old.version??0))latest.set(l.participacionId,l);
    }
    // Activa: una fila por socio liquidado. Histórico: conservar todas las versiones.
    const list=this.readOnly()?source:[...latest.values()];
    return list.filter(l=>!!l.liquidacionId&&!!l.participacionId).map(l=>{
      const socio=socios.get(l.participacionId??0);
      const net=l.neto??0,paid=l.pagado??0;
      return {participacionId:l.participacionId??0,liquidacionId:l.liquidacionId??0,
        version:l.version??0,socio:socio?.socio??`Participación #${l.participacionId}`,
        kg:socio?.kilogramos??0,neto:net,pagado:paid,
        saldo:Math.max(0,(this.cents(net)-this.cents(paid))/100),
        estado:l.estado??'',estadoPago:this.situation(l)};
    }).sort((a,b)=>a.socio.localeCompare(b.socio)||b.version-a.version);
  });
  readonly rows=computed(()=>{
    const query=this.search().trim().toLocaleLowerCase('es-PE');
    return this.allRows().filter(s=>(!query||s.socio.toLocaleLowerCase('es-PE').includes(query)
      ||String(s.liquidacionId).includes(query))
      &&(this.status()==='TODOS'||this.status()===s.estadoPago));
  });
  readonly summary=computed(()=>{
    // Mostrar todas las versiones en el historial, pero sumar solo la última válida de cada socio.
    const ultimas=new Map<number,SocioPago>();
    for(const r of this.allRows()){
      if(r.estadoPago==='ANULADA')continue;
      const anterior=ultimas.get(r.participacionId);
      if(!anterior||r.version>anterior.version)ultimas.set(r.participacionId,r);
    }
    const data=[...ultimas.values()];
    return {socios:data.length,
      total:data.reduce((sum,x)=>sum+x.neto,0),
      pagado:data.reduce((sum,x)=>sum+x.pagado,0),
      saldo:data.reduce((sum,x)=>sum+x.saldo,0),
      completados:data.filter(x=>x.estadoPago==='PAGADO').length,
      pendientes:data.filter(x=>x.estadoPago!=='PAGADO').length};
  });
  readonly canPaySelected=computed(()=>!this.readOnly()&&this.canPay());
  showPayAction(s:SocioPago):boolean {
    return this.canPaySelected()&&s.estadoPago!=='ANULADA'&&s.pagado===0&&s.saldo>0;
  }
  payHint(s:SocioPago):string {
    return s.estado==='APROBADA'?'Pagar a socio':'La liquidación requiere aprobación';
  }
  campaignId=0;
  selected:SocioPago|null=null;
  medio:MedioPago='EFECTIVO';
  referencia='';
  motivoEntrega='';
  ngOnDestroy():void {this.clearProof();}
  private clearProof():void {
    this.proof.set(null);this.uploadedProof=null;
  }
  changeProof(files:File[]):void {
    if(this.busy())return;
    const file=files[0]??null;
    if(!file){this.clearProof();return;}
    const valid=['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)
      && /\.(pdf|jpe?g|png|webp)$/i.test(file.name)
      && file.size>0&&file.size<=10*1024*1024;
    if(!valid){this.toast.error('Comprobante no válido','PDF, JPG, PNG o WebP; máximo 10 MB.');return;}
    if(this.proof()!==file)this.uploadedProof=null;
    this.proof.set(file);
  }
  notifyInvalidProof(message:string):void {this.toast.error('Comprobante no válido',message);}

  ngOnInit():void {
    const selected=Number(this.route.snapshot.queryParamMap.get('campaniaId'));
    if(Number.isSafeInteger(selected)&&selected>0){this.campaignId=selected;this.load();}
    this.loadingCampaigns.set(true);
    // No limitar campañas a los primeros cien registros ni filtrar las finalizadas.
    this.campaigns.list('campaigns',1,100).pipe(
      expand(page=>page.page<page.totalPages?this.campaigns.list('campaigns',page.page+1,100):EMPTY),
      reduce((acc,page)=>acc.concat(page.items),[] as Record<string,unknown>[]),
      finalize(()=>this.loadingCampaigns.set(false)),
    ).subscribe({next:data=>this.options.set(data.map(c=>({
      value:Number(c['campaniaVentaId']??0),label:String(c['nombre']??''),
      description:String(c['codigo']??''),estado:String(c['estadoProceso']??''),
    })).filter(c=>c.value>0)),error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  load():void {
    const token=++this.request;
    this.error.set(null);this.board.set(null);this.liquidaciones.set(null);
    if(!this.canList()){this.loading.set(false);this.error.set('Sin permiso para consultar pagos.');return;}
    if(!this.campaignId){this.loading.set(false);return;}
    this.loading.set(true);
    forkJoin({b:this.api.tablero(this.campaignId),l:this.api.liquidaciones(this.campaignId)})
      .pipe(finalize(()=>{if(token===this.request)this.loading.set(false)}))
      .subscribe({next:x=>{if(token===this.request){this.board.set(x.b);this.liquidaciones.set(x.l);}},
        error:e=>{if(token===this.request)this.error.set(mapOpenApiError(e).message)}});
  }
  canPayRow(s:SocioPago):boolean {
    // Un pago confirmado, aunque sea antiguo/parcial, congela la liquidación.
    return this.canPaySelected()&&s.estado==='APROBADA'&&s.neto>0&&s.pagado===0&&s.saldo>0;
  }
  abrirPago(row:SocioPago):void {
    if(!this.canPayRow(row)||this.busy())return;
    this.selected=row;this.beneficiary.set(null);this.receptor.set(null);
    this.medio='EFECTIVO';this.referencia='';this.motivoEntrega='';this.clearProof();
    this.busy.set(true);
    this.extras.beneficiario(row.liquidacionId).pipe(finalize(()=>this.busy.set(false)))
      .subscribe({next:b=>{this.beneficiary.set(b);
        if(b.beneficiarioPersonaId)this.receptor.set({id:b.beneficiarioPersonaId,nombre:b.nombre,documento:b.documento});
        this.payDialog.nativeElement.showModal();},
        error:e=>this.toast.error('No se pudo obtener al socio',mapOpenApiError(e).message)});
  }
  closePay():void {if(!this.busy()){this.payDialog.nativeElement.close();this.clearProof();}}
  onPayCancel(event:Event):void {
    if(this.busy())event.preventDefault();
    else this.clearProof();
  }
  async elegirReceptor():Promise<void> {
    const row=this.selected;
    if(!row||!this.canRegisterReceiver()||this.busy())return;
    try {
      const result=await this.entityModal.open({
        eyebrow:'Tesorería APAPPSS',title:'Persona que recibe el dinero',saveLabel:'Seleccionar receptor',
        rucKind:'PERSONA',documents:[{value:'DNI',label:'DNI'},{value:'RUC',label:'RUC persona natural'},
          {value:'CE',label:'Carné de extranjería'},{value:'PASAPORTE',label:'Pasaporte'}],
        requireDistrictForManual:false,
        save:(data:EntityDraft,context:EntitySaveContext)=>this.extras.asegurarReceptor(row.liquidacionId,{
          ...data,identityId:context.identityId??undefined,
        }),
      });
      if(!result?.id)return;
      const p=result.data;
      this.receptor.set({id:result.id,nombre:[p?.nombres,p?.apellidoPaterno,p?.apellidoMaterno].filter(Boolean).join(' '),
        documento:`${p?.tipoDocumento??''}: ${p?.numeroDocumento??''}`});
    } catch(e){this.toast.error('No se pudo seleccionar al receptor',mapOpenApiError(e).message);}
  }
  usarTitular():void {
    const b=this.beneficiary();
    if(b?.beneficiarioPersonaId)this.receptor.set({id:b.beneficiarioPersonaId,nombre:b.nombre,documento:b.documento});
    this.motivoEntrega='';
  }
  readonly esTercero=computed(()=>!!this.receptor()?.id&&this.receptor()?.id!==this.beneficiary()?.beneficiarioPersonaId);
  validPayment():boolean {
    const s=this.selected,r=this.receptor();
    return !!s&&this.canPayRow(s)&&!!r&&r.id>0&&!this.busy()
      &&(this.medio==='YAPE'?/^\d{3}$/.test(this.referencia.trim()):
        this.medio==='DEPOSITO'?this.referencia.trim().length>0:
        this.medio==='PLIN'?this.referencia.trim().length<=60:!this.referencia.trim())
      &&(!this.esTercero()||this.motivoEntrega.trim().length>=10);
  }
  pay():void {
    const s=this.selected,r=this.receptor();
    if(!s||!r||!this.validPayment())return;
    const body:E5PagoBeneficiario={importe:s.saldo,medioPago:this.medio,
      referencia:this.referencia.trim()||undefined,beneficiarioPersonaId:r.id,
      motivoEntrega:this.esTercero()?this.motivoEntrega.trim():undefined};
    this.busy.set(true);
    // El archivo es opcional; se carga primero y se vincula al pago en la misma
    // transacción SQL que registra al receptor. Los reintentos reutilizan su ID.
    const file=this.proof();
    const upload$:Observable<number|undefined>=file
      ? this.uploadedProof?.file===file
        ? of(this.uploadedProof.archivoId)
        : this.documents.upload({uotId:this.beneficiary()?.uotId??0,file,category:'COMPROBANTE',
            linkType:'NINGUNO',description:`Comprobante de pago de liquidación ${s.liquidacionId}`}).pipe(
              map(result=>{
                const id=result.archivoId??0;
                if(id<1)throw new Error('No se obtuvo el identificador del comprobante.');
                this.uploadedProof={file,archivoId:id};return id;
              }))
      : of(undefined);
    upload$.pipe(
      switchMap(archivoId=>this.extras.pagar(s.liquidacionId,{...body,
        comprobanteArchivoId:archivoId})),
      finalize(()=>this.busy.set(false)),
    ).subscribe({next:()=>{this.toast.success('Pago confirmado');
        this.payDialog.nativeElement.close();this.clearProof();this.load();},
        error:e=>this.toast.error('No se confirmó el pago',mapOpenApiError(e).message)});
  }
}
