import { DialogBackdropDirective } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faGaugeHigh, faPen, faPlus, faRotate, faTriangleExclamation, faTruck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, Observable } from 'rxjs';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ResourceAssetIncidentRequest, ResourceAssetIncidentRequestTipoEnum } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetIncidentRequest';
import { ResourceAssetListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetListItemResponse';
import { ResourceAssetResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetResponse';
import { ResourceAssetStateChangeRequestEstadoEnum } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetStateChangeRequest';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { localDateTimeInputNow, normalizeOptionalText, normalizeText, notBlankValidator, notFutureDateValidator, todayLocalIsoDate } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { ListarOrganizacionesUseCase } from '../../../../../../../administracion/organizaciones/application/use-case/listar-organizaciones.use-case';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ActualizarKilometrajeUseCase } from '../../../../../application/use-case/actualizar-kilometraje.use-case';
import { RegistrarVehiculoUseCase } from '../../../../../application/use-case/registrar-vehiculo.use-case';
import { Vehiculo } from '../../../../../domain/vehiculo.model';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';

type ResourceFormMode = 'create' | 'edit' | 'state' | 'incident' | 'vehicle' | 'mileage';
type AssetTarget = ResourceAssetResponse | ResourceAssetListItemResponse;

@Component({
  selector: 'app-recurso-form', standalone: true,
  imports: [DialogBackdropDirective, ReactiveFormsModule, FaIconComponent, FormErrorComponent, NgTemplateOutlet],
  templateUrl: './recurso-form.html', styleUrl: './recurso-form.css', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursoFormComponent {
  @ViewChild('dialog', { static: true }) private readonly dialogRef!: ElementRef<HTMLDialogElement>;
  private readonly fb=inject(FormBuilder); private readonly api=inject(ResourceApiService); private readonly refs=inject(ReferenceDataService); private readonly listOrganizations=inject(ListarOrganizacionesUseCase); private readonly registerVehicle=inject(RegistrarVehiculoUseCase); private readonly updateMileage=inject(ActualizarKilometrajeUseCase); private readonly toast=inject(ToastService); readonly uot=inject(UotContextStore);

  readonly mode=signal<ResourceFormMode>('create'); readonly current=signal<AssetTarget|null>(null); readonly currentVehicle=signal<Vehiculo|null>(null); readonly saving=signal(false); readonly referencesLoading=signal(false); readonly errorMessage=signal<string|null>(null); readonly assetTypes=signal<readonly AdminSelectOption[]>([]); readonly organizations=signal<readonly AdminSelectOption[]>([]); readonly currencies=signal<readonly {code:string;label:string}[]>([]); readonly vehicleTypes=signal<readonly {code:string;label:string}[]>([]);
  readonly addIcon=faPlus; readonly editIcon=faPen; readonly stateIcon=faRotate; readonly incidentIcon=faTriangleExclamation; readonly vehicleIcon=faTruck; readonly mileageIcon=faGaugeHigh; readonly saveIcon=faFloppyDisk; readonly closeIcon=faXmark; readonly today=todayLocalIsoDate();

  readonly states=[{value:ResourceAssetStateChangeRequestEstadoEnum.PendientePlaca,label:'Pendiente de placa'},{value:ResourceAssetStateChangeRequestEstadoEnum.Disponible,label:'Disponible'},{value:ResourceAssetStateChangeRequestEstadoEnum.Asignado,label:'Asignado'},{value:ResourceAssetStateChangeRequestEstadoEnum.Mantenimiento,label:'Mantenimiento'},{value:ResourceAssetStateChangeRequestEstadoEnum.Averiado,label:'Averiado'},{value:ResourceAssetStateChangeRequestEstadoEnum.NoDisponible,label:'No disponible'},{value:ResourceAssetStateChangeRequestEstadoEnum.Inactivo,label:'Inactivo'},{value:ResourceAssetStateChangeRequestEstadoEnum.Baja,label:'Baja'}] as const;
  readonly incidentTypes=[{value:ResourceAssetIncidentRequestTipoEnum.Averia,label:'Avería'},{value:ResourceAssetIncidentRequestTipoEnum.Accidente,label:'Accidente'},{value:ResourceAssetIncidentRequestTipoEnum.Perdida,label:'Pérdida'},{value:ResourceAssetIncidentRequestTipoEnum.Robo,label:'Robo'},{value:ResourceAssetIncidentRequestTipoEnum.Mantenimiento,label:'Mantenimiento'},{value:ResourceAssetIncidentRequestTipoEnum.Otro,label:'Otro'}] as const;
  private resolver:((value:AdminModalResult)=>void)|null=null;

  readonly form=this.fb.nonNullable.group({uotId:[0,[Validators.required,Validators.min(1)]],tipoBienId:[0,[Validators.required,Validators.min(1)]],codigoPatrimonial:['',[Validators.maxLength(60)]],nombre:['',[Validators.required,notBlankValidator,Validators.maxLength(150)]],marca:['',[Validators.maxLength(80)]],modelo:['',[Validators.maxLength(80)]],serie:['',[Validators.maxLength(100)]],fechaAdquisicion:['',[notFutureDateValidator]],montoAdquisicion:[0,[Validators.min(0),Validators.max(999999999999)]],moneda:['PEN',[Validators.required,Validators.maxLength(3)]],proveedorEmpresaId:[0],observacion:['',[Validators.maxLength(500)]]});
  readonly stateForm=this.fb.nonNullable.group({estado:[ResourceAssetStateChangeRequestEstadoEnum.Disponible,[Validators.required]],motivo:['',[Validators.required,notBlankValidator,Validators.maxLength(500)]]});
  readonly incidentForm=this.fb.nonNullable.group({tipo:[ResourceAssetIncidentRequestTipoEnum.Averia,[Validators.required]],fechaHora:[localDateTimeInputNow(),[Validators.required]],descripcion:['',[Validators.required,notBlankValidator,Validators.maxLength(700)]],costoEstimado:[0,[Validators.min(0),Validators.max(999999999999)]]});
  readonly vehicleForm=this.fb.group({
    color:this.fb.nonNullable.control('',[Validators.maxLength(50)]),
    placa:this.fb.nonNullable.control('',[Validators.maxLength(12),Validators.pattern(/^[A-Za-z0-9-]*$/)]),
    tipoVehiculo:this.fb.nonNullable.control('',[Validators.required,notBlankValidator,Validators.maxLength(30)]),
    kilometrajeKm:this.fb.control<number|null>(null,[Validators.min(0),Validators.max(99999999999.9),Validators.pattern(/^\d+(?:\.\d)?$/)]),
  });

  openCreate(preferredUotId?:number):Promise<AdminModalResult>{this.resetState();this.resetVehicleForm();this.mode.set('create');const selected=this.resolveCreateUotId(preferredUotId);this.form.reset({uotId:selected,tipoBienId:0,codigoPatrimonial:'',nombre:'',marca:'',modelo:'',serie:'',fechaAdquisicion:'',montoAdquisicion:0,moneda:'PEN',proveedorEmpresaId:0,observacion:''});this.form.controls.uotId[this.uot.modo()==='GENERAL'?'enable':'disable']({emitEvent:false});this.loadReferences();return this.show();}
  openEdit(item:AssetTarget,vehicle?:Vehiculo|null):Promise<AdminModalResult>{this.resetState();this.mode.set('edit');this.current.set(item);this.resetVehicleForm(item,vehicle);this.form.reset({uotId:item.uotId??0,tipoBienId:item.tipoBienId??0,codigoPatrimonial:item.codigoPatrimonial??'',nombre:item.nombre??'',marca:item.marca??'',modelo:item.modelo??'',serie:item.serie??'',fechaAdquisicion:item.fechaAdquisicion??'',montoAdquisicion:item.montoAdquisicion??0,moneda:item.monedaAdquisicion??'PEN',proveedorEmpresaId:item.proveedorEmpresaId??0,observacion:item.observacion??''});this.form.controls.uotId.disable({emitEvent:false});this.loadReferences();return this.show();}
  openState(item:AssetTarget):Promise<AdminModalResult>{this.resetState();this.mode.set('state');this.current.set(item);const valid=this.states.find((state)=>state.value===item.estadoBien);this.stateForm.reset({estado:valid?.value??ResourceAssetStateChangeRequestEstadoEnum.Disponible,motivo:''});return this.show();}
  openIncident(item:AssetTarget):Promise<AdminModalResult>{this.resetState();this.mode.set('incident');this.current.set(item);this.incidentForm.reset({tipo:ResourceAssetIncidentRequestTipoEnum.Averia,fechaHora:localDateTimeInputNow(),descripcion:'',costoEstimado:0});return this.show();}
  openVehicle(item:AssetTarget,vehicle?:Vehiculo|null):Promise<AdminModalResult>{this.resetState();this.mode.set('vehicle');this.current.set(item);this.resetVehicleForm(item,vehicle);this.loadVehicleTypes();return this.show();}
  openMileage(item:AssetTarget,vehicle:Vehiculo):Promise<AdminModalResult>{this.resetState();this.mode.set('mileage');this.current.set(item);this.currentVehicle.set(vehicle);this.vehicleForm.reset({color:vehicle.color??'',placa:vehicle.placa??'',tipoVehiculo:vehicle.tipoVehiculo,kilometrajeKm:vehicle.kilometrajeKm});return this.show();}

  isVehicleAsset():boolean{
    const type=this.assetTypes().find(item=>item.value===Number(this.form.controls.tipoBienId.value));
    return (type?.label??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()==='VEHICULO';
  }
  private resetVehicleForm(item?:AssetTarget,vehicle?:Vehiculo|null):void{
    const row=item as ResourceAssetListItemResponse|undefined;
    this.vehicleForm.reset({color:vehicle?.color??row?.color??'',placa:vehicle?.placa??row?.placa??'',tipoVehiculo:vehicle?.tipoVehiculo??row?.tipoVehiculo??'',kilometrajeKm:vehicle?.kilometrajeKm??row?.kilometrajeKm??null});
  }
  private setVehicleCatalog(items:readonly {code:string;label:string}[]):void{
    this.vehicleTypes.set(items);
    const current=this.vehicleForm.controls.tipoVehiculo.value;
    const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
    const match=items.find(item=>item.code===current||normalized(item.label)===normalized(current));
    this.vehicleForm.controls.tipoVehiculo.setValue(match?.code??items[0]?.code??'');
  }

  availableUnits(){return this.uot.memberships();}
  onUotChange():void{this.form.controls.proveedorEmpresaId.setValue(0,{emitEvent:false});this.loadReferences();}
  close():void{if(!this.saving())this.finish({saved:false,value:null});}
  save():void{switch(this.mode()){case'state':this.saveState();return;case'incident':this.saveIncident();return;case'vehicle':this.saveVehicle();return;case'mileage':this.saveMileage();return;default:this.saveAsset();}}
  title():string{switch(this.mode()){case'edit':return'Editar bien';case'state':return'Cambiar estado';case'incident':return'Registrar incidencia';case'vehicle':return'Completar datos del vehículo';case'mileage':return'Actualizar kilometraje';default:return'Registrar bien';}}
  icon(){switch(this.mode()){case'edit':return this.editIcon;case'state':return this.stateIcon;case'incident':return this.incidentIcon;case'vehicle':return this.vehicleIcon;case'mileage':return this.mileageIcon;default:return this.addIcon;}}

  private saveAsset():void{
    this.form.markAllAsTouched();
    const isVehicle=this.isVehicleAsset();
    if(isVehicle)this.vehicleForm.markAllAsTouched();
    if(this.form.invalid||(isVehicle&&this.vehicleForm.invalid)||this.saving()||this.referencesLoading())return;
    const raw=this.form.getRawValue(),amount=Number(raw.montoAdquisicion),providerId=Number(raw.proveedorEmpresaId);
    const vehicle=this.vehicleForm.getRawValue();
    const common={tipoBienId:Number(raw.tipoBienId),nombre:normalizeText(raw.nombre),marca:normalizeOptionalText(raw.marca),modelo:normalizeOptionalText(raw.modelo),serie:normalizeOptionalText(raw.serie),fechaAdquisicion:raw.fechaAdquisicion||undefined,montoAdquisicion:amount>0?amount:undefined,moneda:raw.moneda.trim().toUpperCase()||'PEN',proveedorEmpresaId:providerId>0?providerId:undefined,observacion:normalizeOptionalText(raw.observacion),
      vehiculo:isVehicle?{color:normalizeOptionalText(vehicle.color),placa:vehicle.placa.trim().toUpperCase()||undefined,tipoVehiculo:vehicle.tipoVehiculo,kilometrajeKm:vehicle.kilometrajeKm??undefined}:undefined};
    const operation=this.mode()==='edit'&&this.current()?.bienInventarioId?this.api.updateAsset(this.current()!.bienInventarioId!,common):this.api.createAsset({uotId:Number(raw.uotId),codigoPatrimonial:undefined,...common});
    this.run(operation,this.mode()==='edit'?'Bien actualizado':'Bien registrado');
  }
  private saveState():void{const item=this.current();this.stateForm.markAllAsTouched();if(!item?.bienInventarioId||this.stateForm.invalid||this.saving())return;const raw=this.stateForm.getRawValue();this.run(this.api.changeAssetState(item.bienInventarioId,{estado:raw.estado,motivo:normalizeOptionalText(raw.motivo)}),'Estado actualizado');}
  private saveIncident():void{const item=this.current();this.incidentForm.markAllAsTouched();if(!item?.bienInventarioId||this.incidentForm.invalid||this.saving())return;const raw=this.incidentForm.getRawValue(),cost=Number(raw.costoEstimado);const body:ResourceAssetIncidentRequest={tipo:raw.tipo,fechaHora:raw.fechaHora,descripcion:normalizeText(raw.descripcion),costoEstimado:cost>0?cost:undefined};this.run(this.api.reportAssetIncident(item.bienInventarioId,body),'Incidencia registrada');}
  private saveVehicle():void{const item=this.current();this.vehicleForm.markAllAsTouched();if(!item?.bienInventarioId||this.vehicleForm.invalid||this.saving())return;const raw=this.vehicleForm.getRawValue();this.run(this.registerVehicle.execute(item.bienInventarioId,{color:normalizeOptionalText(raw.color),placa:raw.placa.trim().toUpperCase()||undefined,tipoVehiculo:raw.tipoVehiculo.trim().toUpperCase(),kilometrajeKm:raw.kilometrajeKm??undefined}),'Vehículo registrado');}
  private saveMileage():void{const item=this.current();this.vehicleForm.controls.kilometrajeKm.markAsTouched();if(!item?.bienInventarioId||this.vehicleForm.controls.kilometrajeKm.invalid||this.saving())return;if(this.vehicleForm.controls.kilometrajeKm.value===null){this.vehicleForm.controls.kilometrajeKm.setErrors({required:true});return;}this.run(this.updateMileage.execute(item.bienInventarioId,{kilometrajeKm:Number(this.vehicleForm.controls.kilometrajeKm.value)}),'Kilometraje actualizado');}
  private run(operation:Observable<unknown>,success:string):void{this.saving.set(true);this.errorMessage.set(null);operation.pipe(finalize(()=>this.saving.set(false))).subscribe({next:()=>{this.toast.success(success);this.finish({saved:true,value:null});},error:(error)=>{const message=mapOpenApiError(error).message;this.errorMessage.set(message);this.toast.error('No se pudo completar la operación',message);}});}

  private resolveCreateUotId(preferredUotId?:number):number{
    if(this.uot.isSpecific())return this.uot.selectedId()??0;
    return preferredUotId&&preferredUotId>0?preferredUotId:0;
  }
  private loadReferences():void{
    this.referencesLoading.set(true);
    this.setAssetReferenceControlsLoading(true);

    forkJoin({
      types:this.refs.catalog('TIPO_BIEN'),
      vehicleTypes:this.refs.catalog('TIPO_VEHICULO'),
      currencies:this.refs.catalog('MONEDA'),
      organizations:this.listOrganizations.execute(
        1,
        100,
        Number(this.form.getRawValue().uotId)||undefined,
      ),
    })
      .pipe(
        finalize(()=>{
          this.referencesLoading.set(false);
          this.setAssetReferenceControlsLoading(false);
        }),
      )
      .subscribe({
        next:({types,vehicleTypes,currencies,organizations})=>{
          this.setVehicleCatalog(vehicleTypes.map(item=>({code:item.code,label:item.label})));
          this.assetTypes.set(
            types
              .map((item)=>({
                value:Number(item.id),
                label:item.label,
                description:item.code,
              }))
              .filter((item)=>item.value>0),
          );
          this.currencies.set(
            currencies.map((item)=>({
              code:item.code,
              label:item.label,
            })),
          );
          this.organizations.set(
            organizations.items
              .filter((item)=>item.estado)
              .map((item)=>({
                value:item.empresaId,
                label:item.razonSocial,
                description:item.ruc,
              })),
          );

          const current=this.form.controls.moneda.value;
          if(!this.currencies().some((item)=>item.code===current)){
            this.form.controls.moneda.setValue(
              this.currencies()[0]?.code??'PEN',
            );
          }
        },
        error:(error)=>
          this.errorMessage.set(
            mapOpenApiError(error).message,
          ),
      });
  }

  private loadVehicleTypes():void{
    this.referencesLoading.set(true);
    this.setVehicleReferenceControlsLoading(true);

    this.refs
      .catalog('TIPO_VEHICULO')
      .pipe(
        finalize(()=>{
          this.referencesLoading.set(false);
          this.setVehicleReferenceControlsLoading(false);
        }),
      )
      .subscribe({
        next:(items)=>{
          this.vehicleTypes.set(
            items.map((item)=>({
              code:item.code,
              label:item.label,
            })),
          );

          if(!this.vehicleForm.controls.tipoVehiculo.value){
            this.vehicleForm.controls.tipoVehiculo.setValue(
              this.vehicleTypes()[0]?.code??'',
            );
          }
        },
        error:(error)=>
          this.errorMessage.set(
            mapOpenApiError(error).message,
          ),
      });
  }

  private setAssetReferenceControlsLoading(
    loading:boolean,
  ):void{
    const typeControl=this.form.controls.tipoBienId;
    const currencyControl=this.form.controls.moneda;
    const providerControl=this.form.controls.proveedorEmpresaId;

    if(loading){
      typeControl.disable({emitEvent:false});
      currencyControl.disable({emitEvent:false});
      providerControl.disable({emitEvent:false});
      return;
    }

    typeControl.enable({emitEvent:false});
    currencyControl.enable({emitEvent:false});

    if(Number(this.form.getRawValue().uotId)>0){
      providerControl.enable({emitEvent:false});
    }else{
      providerControl.disable({emitEvent:false});
    }
  }

  private setVehicleReferenceControlsLoading(
    loading:boolean,
  ):void{
    const control=this.vehicleForm.controls.tipoVehiculo;

    if(loading){
      control.disable({emitEvent:false});
    }else{
      control.enable({emitEvent:false});
    }
  }
  private show():Promise<AdminModalResult>{this.dialogRef.nativeElement.showModal();return new Promise((resolve)=>{this.resolver=resolve;});}
  private finish(result:AdminModalResult):void{if(this.dialogRef.nativeElement.open)this.dialogRef.nativeElement.close();this.resolver?.(result);this.resolver=null;this.resetState();}
  private resetState():void{this.current.set(null);this.currentVehicle.set(null);this.errorMessage.set(null);}
}
