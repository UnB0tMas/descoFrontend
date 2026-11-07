import { ResourceDatePipe } from '../../../../../../../../shared/formatting/resource-date.pipe';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faClockRotateLeft, faCoins, faImage, faPen, faRotate, faRotateLeft, faTags } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, of } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ResourceProductDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductDetailResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { LocalFilePanelComponent } from '../../../../../../../../shared/files/local-file-panel/local-file-panel';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService, ResourceProductPriceHistory } from '../../../../../../shared/resource-api.service';
import { ResourceImageComponent } from '../../../../../../shared/resource-image/resource-image';
import { ProductoFormComponent } from '../producto-form/producto-form';

@Component({selector:'app-producto-detail-page',standalone:true,imports:[ResourceDatePipe,DecimalPipe,RouterLink,FaIconComponent,PermissionDirective,EmptyStateComponent,ErrorStateComponent,LoadingStateComponent,ActionConfirmDialogComponent,LocalFilePanelComponent,PageHeaderComponent,ResourceImageComponent,ProductoFormComponent],templateUrl:'./producto-detail.html',styleUrl:'./producto-detail.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class ProductoDetailPage implements OnInit {
 @ViewChild(ProductoFormComponent) private form!:ProductoFormComponent; @ViewChild(ActionConfirmDialogComponent) private confirm!:ActionConfirmDialogComponent;
 private readonly route=inject(ActivatedRoute); private readonly api=inject(ResourceApiService); private readonly permissions=inject(PermissionService); private readonly toast=inject(ToastService); readonly uot=inject(UotContextStore);
 readonly loading=signal(true); readonly historyLoading=signal(false); readonly actionLoadingId=signal<number|null>(null); readonly errorMessage=signal<string|null>(null); readonly historyError=signal<string|null>(null); readonly detail=signal<ResourceProductDetailResponse|null>(null); readonly history=signal<readonly ResourceProductPriceHistory[]>([]);
 readonly pageIcon=faTags; readonly backIcon=faArrowLeft; readonly refreshIcon=faRotate; readonly editIcon=faPen; readonly stateIcon=faRotate; readonly priceIcon=faCoins; readonly historyIcon=faClockRotateLeft; readonly imageIcon=faImage; readonly reactivateIcon=faRotateLeft;
 readonly productId=Number(this.route.snapshot.paramMap.get('id')); readonly requestedUotId=Number(this.route.snapshot.queryParamMap.get('uotId'))||null;
 ngOnInit():void{this.load();}
 load():void{const uotId=this.targetUotId();if(!this.productId||!uotId){this.loading.set(false);this.errorMessage.set('No se identificó correctamente el producto y su UOT.');return;}this.loading.set(true);this.errorMessage.set(null);const canHistory=this.permissions.has('PRODUCTOS_PRECIO_HISTORIAL');forkJoin({detail:this.api.getProduct(this.productId,uotId),history:canHistory?this.api.listProductPriceHistory(this.productId,uotId):of([] as ResourceProductPriceHistory[])}).pipe(finalize(()=>this.loading.set(false))).subscribe({next:({detail,history})=>{this.detail.set(detail??null);this.history.set(history);},error:(e)=>this.errorMessage.set(mapOpenApiError(e).message)});}
 async edit():Promise<void>{const item=this.detail();if(!item)return;const r=await this.form.openEdit(item,this.targetUotId());if(r.saved)this.load();} async changeState():Promise<void>{const item=this.detail();if(!item)return;const r=await this.form.openState(item,this.targetUotId());if(r.saved)this.load();} async versionPrice():Promise<void>{const item=this.detail();if(!item||item.estado===false)return;const r=await this.form.openPrice(item,this.targetUotId());if(r.saved)this.load();}
 loadHistory():void{if(!this.permissions.has('PRODUCTOS_PRECIO_HISTORIAL'))return;const uotId=this.targetUotId();if(!uotId)return;this.historyLoading.set(true);this.historyError.set(null);this.api.listProductPriceHistory(this.productId,uotId).pipe(finalize(()=>this.historyLoading.set(false))).subscribe({next:(items)=>this.history.set(items),error:(e)=>this.historyError.set(mapOpenApiError(e).message)});}
 async reactivate(price:ResourceProductPriceHistory):Promise<void>{if(price.vigente||!price.productoPrecioId||this.actionLoadingId())return;const result=await this.confirm.show({title:'Reactivar precio histórico',message:`Se creará una nueva versión vigente con ${price.moneda} ${price.precioVenta.toFixed(2)}. La versión histórica no será modificada.`,confirmLabel:'Crear versión vigente',cancelLabel:'Cancelar',tone:'warning'});if(!result.confirmed)return;this.actionLoadingId.set(price.productoPrecioId);this.api.reactivateProductPrice(this.productId,price.productoPrecioId,{uotId:this.targetUotId()}).pipe(finalize(()=>this.actionLoadingId.set(null))).subscribe({next:()=>{this.toast.success('Precio reactivado como nueva versión');this.load();},error:(e)=>this.toast.error('No se pudo reactivar el precio',mapOpenApiError(e).message)});}
 targetUotId():number{if(this.uot.isSpecific())return this.uot.selectedId()??0;return this.detail()?.uotId??this.requestedUotId??0;} canUploadImages():boolean{return this.detail()?.estado!==false&&this.permissions.has('PRODUCTOS_IMAGENES')&&this.permissions.has('ARCHIVOS_CREAR');} imageIds():readonly number[]{return this.detail()?.archivosImagen??(this.detail()?.archivoPrincipalId?[this.detail()!.archivoPrincipalId!]:[]);}
}
