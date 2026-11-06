import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faMapLocationDot, faRotate, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { GeographyCascadeComponent } from '../../../shared/forms/geography-cascade/geography-cascade';
import { PredioMapComponent } from '../../gestion-tecnica/predios/adapter/in/ui/components/predio-map/predio-map';
import { ExpedienteE1UseCase } from '../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import { ExpedienteE1 } from '../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import { PlantasE3Page } from '../plantas/adapter/in/ui/plantas-e3';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';

type TabPredio='ficha'|'plantas';
@Component({selector:'app-apappss-predio-detail',standalone:true,
 imports:[DecimalPipe,FormsModule,RouterLink,FaIconComponent,PageHeaderComponent,LoadingStateComponent,
  ErrorStateComponent,GeographyCascadeComponent,PredioMapComponent,PlantasE3Page],
 templateUrl:'./apappss-predio-detail.html',styleUrls: ['../../gestion-tecnica/gestion-productiva/gestion-productiva.css', './apappss-predio-detail.css'],
 changeDetection:ChangeDetectionStrategy.OnPush})
export class ApappssPredioDetailPage implements OnInit {
 @ViewChild('fichaDialog',{static:true}) private fichaDialog!:ElementRef<HTMLDialogElement>;
 private readonly route=inject(ActivatedRoute);private readonly uot=inject(UotContextStore);
 private readonly e1=inject(ExpedienteE1UseCase);private readonly permissions=inject(PermissionService);
 private readonly toast=inject(ToastService);
 readonly predioId=Number(this.route.snapshot.paramMap.get('predioId'));
 readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'));
 readonly socioId=Number(this.route.snapshot.queryParamMap.get('socioId'))||0;
 readonly icon=faMapLocationDot;readonly backIcon=faArrowLeft;readonly refreshIcon=faRotate;readonly closeIcon=faXmark;
 readonly loading=signal(true);readonly saving=signal(false);readonly error=signal<string|null>(null);
 readonly detalle=signal<ExpedienteE1|null>(null);
 readonly tabPredio=signal<TabPredio>('ficha');
 readonly puedeEditar=computed(()=>this.permissions.hasAll(['PREDIOS_EDITAR','APAPPSS_PREDIOS_EDITAR']));
 superficieM2:number|null=null;superficieCultivableM2:number|null=null;tipoRiego='';
 setSuperficieHa(value:number|null,area:'total'|'cultivable'):void {
  const metros=value===null||!Number.isFinite(+value)?null:Math.round(+value*10000);
  if(area==='total')this.superficieM2=metros;else this.superficieCultivableM2=metros;
 }
 ngOnInit():void {this.cargar();}
 abrirEdicion():void {if(this.puedeEditar()&&!this.loading()&&!this.saving())this.fichaDialog.nativeElement.showModal();}
 cerrarEdicion():void {if(!this.saving()&&this.fichaDialog.nativeElement.open)this.fichaDialog.nativeElement.close();}
 cargar():void {
  const uotId=this.uot.selectedId();
  if(!uotId||!Number.isInteger(this.convenioId)||this.convenioId<=0||!Number.isInteger(this.predioId)||this.predioId<=0){
   this.error.set('El expediente requiere predio, UOT y convenio válidos.');this.loading.set(false);return;}
  this.loading.set(true);this.error.set(null);
  this.e1.detalle(uotId,this.predioId,this.convenioId).pipe(finalize(()=>this.loading.set(false))).subscribe({next:d=>{
    this.detalle.set(d);this.superficieM2=d.areaTotalHa==null?null:Math.round(d.areaTotalHa*10000);
    this.superficieCultivableM2=d.areaCultivableHa==null?null:Math.round(d.areaCultivableHa*10000);
    this.tipoRiego=d.tipoRiego||'';
   },error:e=>this.error.set(mapOpenApiError(e).message)});
 }
 cambiarTab(tab:TabPredio):void {this.tabPredio.set(tab);}
 guardarFicha():void {
  const uotId=this.uot.selectedId();
  if(!uotId||!this.puedeEditar()||this.saving()||this.superficieM2==null||!Number.isInteger(this.superficieM2)||this.superficieM2<=0||
    (this.superficieCultivableM2!=null&&(!Number.isInteger(this.superficieCultivableM2)||this.superficieCultivableM2<0||this.superficieCultivableM2>this.superficieM2)))return;
  this.saving.set(true);this.error.set(null);
  this.e1.ficha(uotId,this.predioId,{areaTotalHa:this.superficieM2/10000,
   areaCultivableHa:this.superficieCultivableM2==null?undefined:this.superficieCultivableM2/10000,
   tipoRiego:this.tipoRiego.trim()||undefined},this.convenioId)
   .pipe(finalize(()=>this.saving.set(false))).subscribe({next:()=>{this.toast.success('Ficha técnica actualizada');this.fichaDialog.nativeElement.close();this.cargar();},
    error:e=>this.error.set(mapOpenApiError(e).message)});
 }
}
