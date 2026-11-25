import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faEye, faLayerGroup, faPen, faPlus, faRotate, faSearch, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription, finalize, firstValueFrom, map, of, throwError } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { GpProductorResponse } from '../../../infrastructure/openapi/generated/model/gpProductorResponse';
import { GpParcelaResponse } from '../../../infrastructure/openapi/generated/model/gpParcelaResponse';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { InstitutionalRecordCardComponent } from '../../../shared/data-display/record-card/institutional-record-card';
import { ListViewMode } from '../../../shared/data-display/list-view-switch/list-view-switch';
import { ListToolbarComponent } from '../../../shared/listing/list-toolbar/list-toolbar';
import { ListContainerComponent } from '../../../shared/listing/list-container/list-container';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { PersonRegistrationModalComponent } from '../../../shared/forms/person-registration/person-registration-modal';
import { PersonEditData, PersonEditModalComponent } from '../../../shared/forms/person-registration/person-edit-modal';
import { PersonOwnerChoice, PersonOwnerInput } from '../../../shared/forms/person-registration/person-owner-picker';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ExpedienteE1UseCase } from '../predios/expediente/application/expediente-e1.use-case';
import { GpGeneralFacade } from './gp-general.facade';
import { GpParcelaForm } from './gp-parcela-form';

/** Una persona central puede ser productor y administrar varias parcelas. */
@Component({
  selector: 'app-gestion-productiva-personas',
  standalone: true,
  imports: [FormsModule, RouterLink, FaIconComponent, PermissionDirective,
    EmptyStateComponent, ErrorStateComponent, LoadingStateComponent,
    InstitutionalRecordCardComponent, ListToolbarComponent, ListContainerComponent,
    PageHeaderComponent, PersonRegistrationModalComponent, PersonEditModalComponent,
    GpParcelaForm, ActionConfirmDialogComponent],
  templateUrl: './gestion-productiva-personas.html',
  styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaPersonas implements OnInit, OnDestroy {
  @ViewChild(PersonRegistrationModalComponent) private personModal!: PersonRegistrationModalComponent;
  @ViewChild(PersonEditModalComponent) private editModal!: PersonEditModalComponent;
  @ViewChild(GpParcelaForm) private parcelaModal!: GpParcelaForm;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog!: ActionConfirmDialogComponent;
  private readonly expediente = inject(ExpedienteE1UseCase);
  private readonly gp = inject(GpGeneralFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly uot = inject(UotContextStore);
  private readonly permisos = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private peopleSubscription?: Subscription;
  private parcelasSubscription?: Subscription;
  private parcelasVersion = 0;

  readonly icon = faUsers;
  readonly parcelaIcon = faLayerGroup;
  readonly addIcon = faPlus;
  readonly eyeIcon = faEye;
  readonly editIcon = faPen;
  readonly deleteIcon = faTrash;
  readonly backIcon = faArrowLeft;
  readonly searchIcon = faSearch;
  readonly refreshIcon = faRotate;
  readonly loading = signal(false);
  readonly parcelasLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly parcelasError = signal<string | null>(null);
  readonly people = signal<GpProductorResponse[]>([]);
  readonly selected = signal<GpProductorResponse | null>(null);
  readonly parcelas = signal<GpParcelaResponse[]>([]);
  readonly view = signal<ListViewMode>('table');
  readonly parcelasView = signal<ListViewMode>('table');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly parcelaPage = signal(1);
  readonly parcelaSize = signal(10);
  readonly parcelaSearch = signal('');
  readonly rows = computed(() => this.people().slice((this.page()-1)*this.size(),this.page()*this.size()));
  readonly totalPages = computed(() => Math.ceil(this.people().length/this.size()));
  readonly parcelasFiltradas = computed(() => {
    const buscar=this.parcelaSearch().trim().toLocaleLowerCase();
    return this.parcelas().filter(p => !buscar || `${p.codigo} ${p.nombre} ${p.referencia ?? ''}`.toLocaleLowerCase().includes(buscar));
  });
  readonly parcelasPages = computed(() => Math.ceil(this.parcelasFiltradas().length/this.parcelaSize()));
  readonly parcelasRows = computed(() => this.parcelasFiltradas().slice(
    (this.parcelaPage()-1)*this.parcelaSize(),this.parcelaPage()*this.parcelaSize()));
  readonly requiresUot = computed(() => this.uot.isGeneral());
  readonly columns: readonly DataTableColumn<GpProductorResponse>[] = [
    {key:'nombreCompleto',label:'Productor'},
    {key:'numeroDocumento',label:'Documento',format:(v,p)=>`${p.tipoDocumento} ${v ?? ''}`},
    {key:'tipo',label:'Rol',value:()=> 'Productor'},
    {key:'acciones',label:'Acciones',align:'right'},
  ];
  readonly parcelaColumns: readonly DataTableColumn<GpParcelaResponse>[] = [
    {key:'nombre',label:'Parcela'},
    {key:'areaHa',label:'Superficie (m²)',align:'right',format:v=>v==null?'—':this.m2(Number(v))+' m²'},
    {key:'distritoCodigo',label:'Distrito'},
    {key:'acciones',label:'Acciones',align:'right'},
  ];
  search = '';

  ngOnInit():void {
    const product = Number(this.route.snapshot.queryParamMap.get('productor'));
    const document = this.route.snapshot.queryParamMap.get('documento');
    if (Number.isInteger(product) && product > 0 && document) {
      this.search = document;
      this.load(product);
    } else this.load();
  }
  ngOnDestroy():void { this.peopleSubscription?.unsubscribe(); this.parcelasSubscription?.unsubscribe(); }
  can(code:string):boolean { return this.permisos.has(code); }
  m2(area:number|null|undefined):string { return area == null ? '—' : (Number(area)*10000).toLocaleString('es-PE',{maximumFractionDigits:0}); }

  load(restoreId:number|null=null):void {
    const u=this.uot.selectedId();
    if (!u) { this.loading.set(false);this.error.set('Seleccione una unidad territorial.');return; }
    const term=this.search.trim();
    if(term.length>0&&term.length<3) {this.error.set('Ingrese al menos tres caracteres.');return;}
    this.peopleSubscription?.unsubscribe();
    this.loading.set(true);this.error.set(null);
    this.peopleSubscription=this.gp.productores(u,term).pipe(finalize(()=>this.loading.set(false))).subscribe({
      next:people=>{
        this.people.set(people);this.page.set(1);
        if(restoreId!==null){
          const p=people.find(x=>x.personaId===restoreId);
          if(p) this.select(p);
        }
      },
      error:e=>this.error.set(mapOpenApiError(e).message),
    });
  }
  clear():void {this.search='';this.load();}
  setPage(value:number):void {if(value>=1&&value<=this.totalPages())this.page.set(value);}
  setSize(value:number):void {if([10,20,50,100].includes(value)){this.size.set(value);this.page.set(1);}}
  setParcelPage(value:number):void {if(value>=1&&value<=this.parcelasPages())this.parcelaPage.set(value);}
  setParcelSize(value:number):void {if([10,20,50,100].includes(value)){this.parcelaSize.set(value);this.parcelaPage.set(1);}}
  filterParcels(term:string):void {this.parcelaSearch.set(term);this.parcelaPage.set(1);}

  select(person:GpProductorResponse):void {
    if(!this.can('CULTIVOS_LISTAR'))return;
    const u=this.uot.selectedId();if(!u)return;
    this.parcelasSubscription?.unsubscribe();
    const version=++this.parcelasVersion;
    this.selected.set(person);this.parcelas.set([]);this.parcelasError.set(null);
    this.parcelaPage.set(1);this.parcelaSearch.set('');
    this.parcelasLoading.set(true);
    this.parcelasSubscription=this.gp.parcelasProductor(u,person.personaId)
      .pipe(finalize(()=>{if(version===this.parcelasVersion)this.parcelasLoading.set(false);})).subscribe({
        next:rows=>{if(version===this.parcelasVersion)this.parcelas.set(rows);},
        error:e=>{if(version===this.parcelasVersion)this.parcelasError.set(mapOpenApiError(e).message);},
      });
  }
  refreshParcels():void {const p=this.selected();if(p)this.select(p);}
  back():void {
    this.parcelasSubscription?.unsubscribe();++this.parcelasVersion;
    this.parcelasLoading.set(false);this.selected.set(null);this.parcelas.set([]);
    this.parcelasError.set(null);this.parcelaSearch.set('');
    this.search='';this.load();
  }

  readonly findPersonForModal=(type:string,doc:string):Observable<readonly PersonOwnerChoice[]>=>{
    const u=this.uot.selectedId();
    return u ? this.expediente.buscarPersonas(u,doc).pipe(map(rows=>rows.filter(
      x=>x.tipoDocumento===type&&x.numeroDocumento===doc))) : of([]);
  };
  readonly savePersonForModal=(data:PersonOwnerInput):Observable<number>=>{
    const u=this.uot.selectedId();
    return u ? this.expediente.crearPersona(u,data) : throwError(()=>new Error('Seleccione una unidad territorial.'));
  };
  readonly saveEditForModal=(id:number,values:PersonEditData,key:string):Observable<number>=>{
    const u=this.uot.selectedId();
    return u ? this.gp.editarProductor(u,id,values,key) : throwError(()=>new Error('Seleccione una unidad territorial.'));
  };

  async createPerson():Promise<void> {
    if(!this.can('PREDIOS_CREAR')||this.requiresUot()||this.busy())return;
    this.busy.set(true);
    try {
      const person=await this.personModal.open('DNI','','lookup');
      if(!person)return;
      this.toast.success('Productor registrado');
      this.search=person.numeroDocumento;
      this.load(person.personaId);
    } catch {
      this.error.set('No se pudo registrar la persona.');
    } finally {this.busy.set(false);}
  }
  async editPerson(person:GpProductorResponse):Promise<void> {
    if(!this.can('PREDIOS_EDITAR')||this.requiresUot()||this.busy())return;
    const u=this.uot.selectedId();if(!u)return;
    this.busy.set(true);
    const autorizado=await firstValueFrom(this.gp.puedeActuarProductor(u,person.personaId));
    this.busy.set(false);
    if(!autorizado){this.toast.error("Inicia una visita desde una salida aprobada.");return;}
    this.busy.set(true);
    try {
      if(await this.editModal.open(person)){
        this.toast.success('Persona actualizada');
        this.search=person.numeroDocumento;this.load(person.personaId);
      }
    } finally {this.busy.set(false);}
  }
  async removePerson(person:GpProductorResponse):Promise<void> {
    const u=this.uot.selectedId();
    if(!u||!this.can('PREDIOS_RETIRAR')||this.requiresUot()||this.busy())return;
    this.busy.set(true);
    const autorizado=await firstValueFrom(this.gp.puedeActuarProductor(u,person.personaId));
    this.busy.set(false);
    if(!autorizado){this.toast.error("Inicia una visita desde una salida aprobada.");return;}
    const confirmation=await this.confirmDialog.show({title:'Desactivar productor',
      message:'Dejará de aparecer en este padrón. Sus datos personales y registros se conservarán.',
      tone:'danger',confirmLabel:'Desactivar',requiresReason:true,
      minimumReasonLength:3,maximumReasonLength:500,reasonLabel:'Motivo'});
    if(!confirmation.confirmed||!confirmation.reason)return;
    this.busy.set(true);
    this.gp.retirarProductor(u,person.personaId,confirmation.reason)
      .pipe(finalize(()=>this.busy.set(false))).subscribe({
        next:()=>{this.toast.success('Productor desactivado');if(this.selected()?.personaId===person.personaId)this.back();else this.load();},
        error:e=>this.error.set(mapOpenApiError(e).message),
      });
  }
  async createParcel():Promise<void> {
    const p=this.selected();
    if(!p||!this.can('CULTIVOS_CREAR')||this.requiresUot()||this.busy())return;
    this.busy.set(true);
    try {
      if((await this.parcelaModal.openForProductor(p.personaId,p.nombreCompleto)).saved)this.refreshParcels();
    } finally {this.busy.set(false);}
  }
  async editParcel(p:GpParcelaResponse):Promise<void> {
    const person=this.selected();
    if(!person||!this.can('CULTIVOS_EDITAR')||this.requiresUot()||this.busy()||!p.estado)return;
    const u=this.uot.selectedId();if(!u)return;
    this.busy.set(true);
    const autorizado=await firstValueFrom(this.gp.puedeActuar(u,p.predioId));
    this.busy.set(false);
    if(!autorizado){this.toast.error("Inicia una visita desde una salida aprobada.");return;}
    this.busy.set(true);
    try {
      if((await this.parcelaModal.openForProductor(person.personaId,person.nombreCompleto,p)).saved)this.refreshParcels();
    } finally {this.busy.set(false);}
  }
  async removeParcel(p:GpParcelaResponse):Promise<void> {
    const u=this.uot.selectedId();
    if(!u||!this.can('CULTIVOS_RETIRAR')||this.requiresUot()||this.busy())return;
    this.busy.set(true);
    const autorizado=await firstValueFrom(this.gp.puedeActuar(u,p.predioId));
    this.busy.set(false);
    if(!autorizado){this.toast.error("Inicia una visita desde una salida aprobada.");return;}
    const confirmation=await this.confirmDialog.show({title:'Eliminar parcela',
      message:'Se ocultará la parcela y sus actividades. Los historiales se conservarán.',
      tone:'danger',confirmLabel:'Eliminar',requiresReason:true,
      minimumReasonLength:3,maximumReasonLength:1000,reasonLabel:'Motivo'});
    if(!confirmation.confirmed||!confirmation.reason)return;
    this.busy.set(true);
    this.gp.eliminarParcela(u,p.parcelaId,confirmation.reason).pipe(finalize(()=>this.busy.set(false))).subscribe({
      next:()=>{this.toast.success('Parcela eliminada');this.refreshParcels();},
      error:e=>this.parcelasError.set(mapOpenApiError(e).message),
    });
  }
}
