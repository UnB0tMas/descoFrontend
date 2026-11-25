import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuilding, faPen, faPlus, faRotate, faSearch, faTrashCan, faTruckFast, faUser } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ListViewSwitchComponent, ListViewMode } from '../../../shared/data-display/list-view-switch/list-view-switch';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { InlineConfirmDialogComponent } from '../../../shared/feedback/inline-confirm-dialog/inline-confirm-dialog';
import { EntityRegistrationModalComponent } from '../../../shared/forms/person-registration/entity-registration-modal';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { Proveedor, ProveedoresApiService } from './proveedores-api.service';

@Component({selector:'app-proveedores-page',standalone:true,
  imports:[FaIconComponent,PermissionDirective,EmptyStateComponent,ErrorStateComponent,LoadingStateComponent,
    ListViewSwitchComponent,PaginatorComponent,RecordCardComponent,PageHeaderComponent,EntityRegistrationModalComponent,InlineConfirmDialogComponent],
  templateUrl:'./proveedores-page.html',styleUrl:'./proveedores-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush})
export class ProveedoresPage implements OnInit {
  @ViewChild(EntityRegistrationModalComponent) private modal!:EntityRegistrationModalComponent;
  private readonly api=inject(ProveedoresApiService);
  private readonly permission=inject(PermissionService);
  private readonly toast=inject(ToastService);
  readonly uot=inject(UotContextStore);
  readonly loading=signal(false);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly search=signal('');
  readonly applied=signal('');
  readonly type=signal('');
  readonly page=signal(1);
  readonly size=signal(20);
  readonly total=signal(0);
  readonly rows=signal<Proveedor[]>([]);
  readonly mode=signal<ListViewMode>('cards');
  readonly pendingRemoval=signal<Proveedor|null>(null);
  readonly icon=faTruckFast;
  readonly addIcon=faPlus;
  readonly refreshIcon=faRotate;
  readonly searchIcon=faSearch;
  readonly companyIcon=faBuilding;
  readonly personIcon=faUser;
  readonly editIcon=faPen;
  readonly removeIcon=faTrashCan;
  readonly restoreIcon=faRotate;
  readonly pages=computed(()=>Math.ceil(this.total()/this.size()));
  readonly canEdit=computed(()=>this.permission.has('ORGANIZACIONES_EDITAR'));
  private token=0;

  ngOnInit():void {this.load(1);}
  load(page=this.page()):void {
    const uot=this.uot.selectedId()??0;
    if(!uot){this.error.set('Seleccione una UOT.');return;}
    const token=++this.token;
    this.loading.set(true);this.error.set(null);
    this.api.list(uot,page,this.size(),this.applied(),this.type()).pipe(finalize(()=>{
      if(token===this.token)this.loading.set(false);
    })).subscribe({next:r=>{
      if(token!==this.token)return;
      const max=Math.ceil((r.total??0)/this.size());
      if(max>0&&page>max){this.load(max);return;}
      this.rows.set(r.items??[]);this.total.set(r.total??0);this.page.set(page);
    },error:e=>{if(token===this.token)this.error.set(mapOpenApiError(e).message);}});
  }
  find():void{this.applied.set(this.search().trim());this.load(1);}
  filter(type:string):void{this.type.set(type);this.load(1);}
  changeSize(size:number):void{this.size.set(size);this.load(1);}
  async add():Promise<void>{
    const uot=this.uot.selectedId()??0;
    if(!uot){this.toast.warning('Seleccione una UOT.');return;}
    const result=await this.modal.open({
      eyebrow:'Administración',title:'Registrar proveedor',saveLabel:'Guardar proveedor',
      rucKind:'EMPRESA',documents:[{value:'DNI',label:'DNI'},{value:'RUC',label:'RUC'},
        {value:'CE',label:'Carné de extranjería'},{value:'PASAPORTE',label:'Pasaporte'}],
      requireDistrictForManual:false,
      hiddenFields:['geography','populationCenter','reference'],
      save:(draft)=>this.api.register(uot,draft),
    });
    if(result){this.toast.success('Proveedor registrado');this.load(1);}
  }
  async edit(row:Proveedor):Promise<void>{
    const uot=this.uot.selectedId()??0;
    if(!uot||!this.canEdit()||this.saving()||!row.estado)return;
    const result=await this.modal.open({
      eyebrow:'Administración',title:'Editar proveedor',saveLabel:'Guardar cambios',updateLabel:'Guardar cambios',
      rucKind:'EMPRESA',documents:[{value:'DNI',label:'DNI'},{value:'RUC',label:'RUC'},
        {value:'CE',label:'Carné de extranjería'},{value:'PASAPORTE',label:'Pasaporte'}],
      requireDistrictForManual:false,
      hiddenFields:['geography','populationCenter','reference'],
      allowOverwrite:true,roleId:row.id,
      initial:{tipoDocumento:row.tipoDocumento,numeroDocumento:row.documento,
        nombres:row.nombres??'',apellidoPaterno:row.apellidoPaterno??'',
        apellidoMaterno:row.apellidoMaterno??'',razonSocial:row.razonSocial??'',
        nombreComercial:row.nombreComercial??'',fechaNacimiento:row.fechaNacimiento??'',
        sexo:row.sexo??'',telefono:row.telefono??'',correo:row.correo??''},
      save:(draft)=>this.api.update(uot,row.id,draft),
    });
    if(result&&!result.unchanged){this.toast.success('Proveedor actualizado');this.load();}
  }
  requestRemoval(row:Proveedor):void{
    if(!this.canEdit()||this.saving()||!row.estado)return;
    this.pendingRemoval.set(row);
  }
  confirmRemoval():void{
    const row=this.pendingRemoval();
    this.pendingRemoval.set(null);
    if(row)this.toggle(row);
  }
  toggle(row:Proveedor):void{
    const uot=this.uot.selectedId()??0;
    if(!uot||!this.canEdit()||this.saving())return;
    this.saving.set(true);
    this.api.setState(uot,row.id,!row.estado).pipe(finalize(()=>this.saving.set(false)))
      .subscribe({next:()=>{this.toast.success('Proveedor actualizado');this.load();},
        error:e=>this.toast.error('No se pudo actualizar',mapOpenApiError(e).message)});
  }
}
