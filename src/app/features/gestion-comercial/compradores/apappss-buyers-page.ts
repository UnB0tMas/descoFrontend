import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuilding, faEye, faPen, faPlus, faRotate, faSearch, faUsers, faXmark } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom, finalize, map, throwError } from 'rxjs';
import { PersonDocumentOption } from '../../../shared/forms/person-registration/person-lookup';
import {
  EntityDraft, EntityLookupData, EntityModalOptions, EntityRegistrationModalComponent,
} from '../../../shared/forms/person-registration/entity-registration-modal';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../uot/state/uot-context.store';
import {
  ApappssBuyer, ApappssBuyerCreate, ApappssBuyerDetail, ApappssBuyerUpdate,
  ApappssBuyersApiService, ApappssLocalIdentity, BuyerType,
} from './apappss-buyers-api.service';

const DEFAULT_DOCUMENTS: readonly PersonDocumentOption[] = [
  {value:'DNI',label:'DNI'}, {value:'RUC',label:'RUC'},
  {value:'CE',label:'Carné de extranjería'}, {value:'PASAPORTE',label:'Pasaporte'},
];

@Component({
  selector:'app-apappss-buyers-page', standalone:true,
  imports:[FaIconComponent,EntityRegistrationModalComponent,PermissionDirective,PageHeaderComponent,
    LoadingStateComponent,ErrorStateComponent,EmptyStateComponent,PaginatorComponent,RecordCardComponent],
  templateUrl:'./apappss-buyers-page.html', styleUrl:'./apappss-buyers-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class ApappssBuyersPage implements OnInit {
  @ViewChild('detailDialog',{static:true}) private detailDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('entityModal',{static:true}) private entityModal!: EntityRegistrationModalComponent;
  private readonly api=inject(ApappssBuyersApiService);
  private readonly uot=inject(UotContextStore);
  private readonly toast=inject(ToastService);
  private readonly permission=inject(PermissionService);
  private listToken=0;
  private detailToken=0;

  readonly pageIcon=faUsers;
  readonly addIcon=faPlus;
  readonly reloadIcon=faRotate;
  readonly searchIcon=faSearch;
  readonly personIcon=faUsers;
  readonly companyIcon=faBuilding;
  readonly detailIcon=faEye;
  readonly editIcon=faPen;
  readonly closeIcon=faXmark;
  readonly loading=signal(false);
  readonly error=signal<string|null>(null);
  readonly search=signal('');
  readonly appliedSearch=signal('');
  readonly filter=signal('');
  readonly viewMode=signal<'tabla'|'tarjetas'>('tabla');
  readonly page=signal(1);
  readonly size=signal(20);
  readonly total=signal(0);
  readonly items=signal<ApappssBuyer[]>([]);
  readonly selected=signal<ApappssBuyer|null>(null);
  readonly detail=signal<ApappssBuyerDetail|null>(null);
  readonly detailLoading=signal(false);
  readonly totalPages=computed(()=>Math.ceil(this.total()/this.size()));
  readonly canEdit=computed(()=>this.permission.has('APAPPSS_COMPRADORES_EDITAR'));

  ngOnInit():void { this.load(1); }
  private currentUot():number { return this.uot.selectedId()??0; }
  load(pagina=this.page()):void {
    const uot=this.currentUot();
    if(!uot){ this.error.set('Seleccione una UOT para consultar compradores.');return; }
    const token=++this.listToken;
    this.loading.set(true);this.error.set(null);
    this.api.list(uot,pagina,this.size(),this.appliedSearch(),this.filter())
      .pipe(finalize(()=>{if(token===this.listToken)this.loading.set(false);})).subscribe({
        next:r=>{
          if(token!==this.listToken)return;
          const total=Math.max(0,r.totalRecords??0);
          const pages=Math.ceil(total/this.size());
          if(pages>0&&pagina>pages){this.load(pages);return;}
          this.items.set(r.items??[]);this.page.set(pagina);this.total.set(total);
        },
        error:e=>{if(token===this.listToken)this.error.set(mapOpenApiError(e).message);},
      });
  }
  applySearch():void { this.appliedSearch.set(this.search().trim());this.load(1); }
  setType(tipo:string):void {this.filter.set(tipo);this.appliedSearch.set(this.search().trim());this.load(1);}
  changePageSize(value:number):void {
    if(![10,20,50,100].includes(value)||value===this.size())return;
    this.size.set(value);this.load(1);
  }
  private async documentTypes(uotId:number):Promise<readonly PersonDocumentOption[]> {
    try {
      const types=await firstValueFrom(this.api.documentTypes(uotId));
      return types.length ? types.map(x=>({value:x.codigo,label:x.nombre})) : DEFAULT_DOCUMENTS;
    } catch {return DEFAULT_DOCUMENTS;}
  }
  private initialFromBuyer(buyer:ApappssBuyerDetail):Partial<EntityDraft> {
    return {
      tipoDocumento:buyer.tipoDocumento,numeroDocumento:buyer.documento,
      nombres:buyer.nombres??'',apellidoPaterno:buyer.apellidoPaterno??'',
      apellidoMaterno:buyer.apellidoMaterno??'',fechaNacimiento:buyer.fechaNacimiento??'',
      sexo:buyer.sexo??'',razonSocial:buyer.razonSocial??'',
      nombreComercial:buyer.nombreComercial??'',telefono:buyer.telefono??'',
      correo:buyer.correo??'',distritoCodigo:buyer.distritoCodigo??'',
      centroPobladoId:buyer.centroPobladoId??0,referencia:buyer.referencia??'',
    };
  }
  private localData(local:ApappssLocalIdentity):EntityLookupData|null {
    if(!local.encontrado||!local.entidadId)return null;
    return {
      roleId:local.compradorId,entityId:local.entidadId,
      data:{
        nombres:local.nombres??'',apellidoPaterno:local.apellidoPaterno??'',
        apellidoMaterno:local.apellidoMaterno??'',fechaNacimiento:local.fechaNacimiento??'',
        sexo:local.sexo??'',razonSocial:local.razonSocial??'',
        nombreComercial:local.nombreComercial??'',telefono:local.telefono??'',
        correo:local.correo??'',distritoCodigo:local.distritoCodigo??'',
        centroPobladoId:local.centroPobladoId??0,referencia:local.referencia??'',
      },
    };
  }
  private options(uotId:number,docs:readonly PersonDocumentOption[],edit=false,initial?:ApappssBuyerDetail):EntityModalOptions {
    return {
      eyebrow:'Compradores', title:edit?'Editar comprador':'Nuevo comprador',
      saveLabel:edit?'Guardar cambios':'Registrar comprador',
      documents:docs,rucKind:'EMPRESA',roleId:initial?.compradorId,
      initial:initial?this.initialFromBuyer(initial):undefined,
      allowOverwrite:edit&&this.permission.has('VALIDACIONIDENTIDAD_EDITAR'),
      lookupLocal:(type,document)=>this.api.localIdentity(uotId,type,document).pipe(map(x=>this.localData(x))),
      save:(data,context)=>{
        const tipo:BuyerType=data.tipoDocumento==='RUC'?'EMPRESA':'PERSONA';
        const optional=(s:string):string|undefined=>s.trim()||undefined;
        const body:ApappssBuyerCreate={
          tipo,tipoDocumento:data.tipoDocumento,documento:data.numeroDocumento,
          nombres:tipo==='PERSONA'?optional(data.nombres):undefined,
          apellidoPaterno:tipo==='PERSONA'?optional(data.apellidoPaterno):undefined,
          apellidoMaterno:tipo==='PERSONA'?optional(data.apellidoMaterno):undefined,
          fechaNacimiento:tipo==='PERSONA'?optional(data.fechaNacimiento):undefined,
          sexo:tipo==='PERSONA'?optional(data.sexo):undefined,
          razonSocial:tipo==='EMPRESA'?optional(data.razonSocial):undefined,
          nombreComercial:tipo==='EMPRESA'?optional(data.nombreComercial):undefined,
          telefono:optional(data.telefono),correo:optional(data.correo),
          distritoCodigo:optional(data.distritoCodigo),
          centroPobladoId:data.centroPobladoId||undefined,referencia:optional(data.referencia),
        };
        if(context.roleId){
          if(!this.canEdit())return throwError(()=>new Error('No tiene permiso para modificar compradores.'));
          const update:ApappssBuyerUpdate={
            nombres:body.nombres,apellidoPaterno:body.apellidoPaterno,
            apellidoMaterno:body.apellidoMaterno,fechaNacimiento:body.fechaNacimiento,
            sexo:body.sexo,razonSocial:body.razonSocial,nombreComercial:body.nombreComercial,
            telefono:body.telefono,correo:body.correo,distritoCodigo:body.distritoCodigo,
            centroPobladoId:body.centroPobladoId,referencia:body.referencia,
            completarDatos:!edit,
          };
          return this.api.update(uotId,context.roleId,update).pipe(map(r=>r.compradorId));
        }
        return this.api.create(uotId,body).pipe(map(r=>r.compradorId));
      },
    };
  }
  async openCreate():Promise<void> {
    const uot=this.currentUot();
    if(!uot){this.toast.warning('Seleccione una UOT.');return;}
    const docs=await this.documentTypes(uot);
    const result=await this.entityModal.open(this.options(uot,docs));
    if(result){ if(!result.unchanged)this.toast.success('Comprador registrado');this.load(1); }
  }
  openDetail(row:ApappssBuyer):void {
    this.selected.set(row);this.detail.set(null);this.detailLoading.set(true);
    const token=++this.detailToken;
    this.detailDialog.nativeElement.showModal();
    this.api.detail(this.currentUot(),row.compradorId)
      .pipe(finalize(()=>{if(token===this.detailToken)this.detailLoading.set(false);})).subscribe({
        next:d=>{if(token===this.detailToken)this.detail.set(d);},
        error:e=>{if(token===this.detailToken)this.toast.error('No se pudo cargar al comprador',mapOpenApiError(e).message);},
      });
  }
  closeDetail():void {
    ++this.detailToken;
    if(this.detailDialog.nativeElement.open)this.detailDialog.nativeElement.close();
    this.selected.set(null);this.detail.set(null);this.detailLoading.set(false);
  }
  beginEdit():void {
    const row=this.selected();
    if(!row||!this.canEdit())return;
    this.closeDetail();
    void this.openEdit(row);
  }
  async openEdit(row:ApappssBuyer):Promise<void> {
    if(!this.canEdit())return;
    const uot=this.currentUot();
    if(!uot)return;
    try {
      const [detail,docs]=await Promise.all([
        firstValueFrom(this.api.detail(uot,row.compradorId)),this.documentTypes(uot),
      ]);
      const result=await this.entityModal.open(this.options(uot,docs,true,detail));
      if(result){if(!result.unchanged)this.toast.success('Comprador actualizado');this.load();}
    } catch(e) {this.toast.error('No se pudo editar al comprador',mapOpenApiError(e).message);}
  }
}
