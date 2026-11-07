import { ResourceDatePipe } from '../../../../../../../../shared/formatting/resource-date.pipe';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faGaugeHigh, faPen, faRotate, faTriangleExclamation, faTruck, faWrench } from '@fortawesome/free-solid-svg-icons';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ResourceAssetDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetDetailResponse';
import { ResourceAssetListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetListItemResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { LocalFilePanelComponent } from '../../../../../../../../shared/files/local-file-panel/local-file-panel';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { ObtenerVehiculoUseCase } from '../../../../../application/use-case/obtener-vehiculo.use-case';
import { Vehiculo } from '../../../../../domain/vehiculo.model';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { ResourceImageComponent } from '../../../../../../shared/resource-image/resource-image';
import { RecursoFormComponent } from '../recurso-form/recurso-form';

@Component({
  selector:'app-recurso-detail-page', standalone:true,
  imports:[ResourceDatePipe,DecimalPipe,RouterLink,FaIconComponent,PermissionDirective,ErrorStateComponent,LoadingStateComponent,LocalFilePanelComponent,PageHeaderComponent,ResourceImageComponent,RecursoFormComponent],
  templateUrl:'./recurso-detail.html', styleUrl:'./recurso-detail.css', changeDetection:ChangeDetectionStrategy.OnPush,
})
export class RecursoDetailPage implements OnInit {
  @ViewChild(RecursoFormComponent) private form!:RecursoFormComponent;
  private readonly route=inject(ActivatedRoute); private readonly api=inject(ResourceApiService); private readonly getVehicle=inject(ObtenerVehiculoUseCase); private readonly permissions=inject(PermissionService);
  readonly loading=signal(true); readonly errorMessage=signal<string|null>(null); readonly detail=signal<ResourceAssetDetailResponse|null>(null); readonly summary=signal<ResourceAssetListItemResponse|null>(null); readonly vehicle=signal<Vehiculo|null>(null);
  readonly pageIcon=faWrench; readonly backIcon=faArrowLeft; readonly editIcon=faPen; readonly refreshIcon=faRotate; readonly stateIcon=faWrench; readonly incidentIcon=faTriangleExclamation; readonly vehicleIcon=faTruck; readonly mileageIcon=faGaugeHigh;
  readonly assetId=Number(this.route.snapshot.paramMap.get('id'));

  ngOnInit():void{this.load();}
  load():void{
    if(!Number.isFinite(this.assetId)||this.assetId<=0){this.errorMessage.set('El identificador del bien no es válido.');this.loading.set(false);return;}
    this.loading.set(true);this.errorMessage.set(null);
    this.api.getAsset(this.assetId).pipe(
      switchMap((detail)=>{
        const item=detail?.bien;
        const summaryRequest=item?.uotId&&item.codigoPatrimonial
          ? this.api.listAssets({uotId:item.uotId,search:item.codigoPatrimonial,page:1,size:20}).pipe(map((page)=>page.items.find((candidate)=>candidate.bienInventarioId===item.bienInventarioId)??null),catchError(()=>of(null)))
          : of(null);
        const vehicleRequest=this.normalizeResourceText(item?.tipoBien)==='VEHICULO'
          ? this.getVehicle.execute(this.assetId).pipe(catchError(()=>of(null)))
          : of(null);
        return forkJoin({detail:of(detail),summary:summaryRequest,vehicle:vehicleRequest});
      }),
      finalize(()=>this.loading.set(false)),
    ).subscribe({next:({detail,summary,vehicle})=>{if(!detail?.bien){this.errorMessage.set('No se encontró el bien solicitado.');return;}this.detail.set(detail);this.summary.set(summary);this.vehicle.set(vehicle);},error:(error)=>this.errorMessage.set(mapOpenApiError(error).message)});
  }
  async edit():Promise<void>{const item=this.detail()?.bien;if(!item)return;const result=await this.form.openEdit(item,this.vehicle());if(result.saved)this.load();}
  async changeState():Promise<void>{const item=this.detail()?.bien;if(!item)return;const result=await this.form.openState(item);if(result.saved)this.load();}
  async reportIncident():Promise<void>{const item=this.detail()?.bien;if(!item)return;const result=await this.form.openIncident(item);if(result.saved)this.load();}
  async registerVehicle():Promise<void>{const item=this.detail()?.bien;if(!item||!this.isVehicleAsset())return;const result=await this.form.openVehicle(item,this.vehicle());if(result.saved)this.load();}
  async updateMileage():Promise<void>{const item=this.detail()?.bien,vehicle=this.vehicle();if(!item||!vehicle)return;const result=await this.form.openMileage(item,vehicle);if(result.saved)this.load();}
  canUploadImages():boolean{return this.permissions.has('INVENTARIO_EDITAR')&&this.permissions.has('ARCHIVOS_CREAR');}
  fileIds():readonly number[]{return this.detail()?.archivosImagen??[];}
  mainFileId():number|null{return this.summary()?.archivoPrincipalId??this.detail()?.bien?.archivoPrincipalId??null;}
  mainImageUrl():string|null{return this.summary()?.imagenPrincipalUrl??null;}
  providerName():string{return this.summary()?.proveedorNombre??'—';}

  isVehicleAsset(): boolean {
    const name = this.detail()?.bien?.tipoBien ?? '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase() === 'VEHICULO';
  }

  incidentStatusLabel(value?: string | null): string {
    const labels: Record<string, string> = {
      ABIERTO: 'Abierta',
      EN_ATENCION: 'En atención',
      RESUELTO: 'Resuelta',
      CERRADO: 'Cerrada',
      ANULADO: 'Anulada',
    };

    return labels[(value ?? '').trim().toUpperCase()] ?? 'Sin estado';
  }

  incidentStatusClass(value?: string | null): string {
    const state = (value ?? '').trim().toUpperCase();
    if (state === 'RESUELTO' || state === 'CERRADO') {
      return 'resource-incident-state resource-incident-state--ok';
    }
    if (state === 'EN_ATENCION') {
      return 'resource-incident-state resource-incident-state--warning';
    }
    if (state === 'ANULADO') {
      return 'resource-incident-state resource-incident-state--muted';
    }
    return 'resource-incident-state resource-incident-state--danger';
  }

  private normalizeResourceText(value?: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

}
