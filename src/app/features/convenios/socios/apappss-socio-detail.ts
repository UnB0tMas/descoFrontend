import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPlus, faRotate, faUsers } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ObtenerProductorUseCase } from '../../gestion-tecnica/productores/application/use-case/obtener-productor.use-case';
import { ProductorDetalle, ProductorPredio } from '../../gestion-tecnica/productores/domain/productor-detalle.model';
import { ApappssPredioAltaPage } from '../predios/apappss-predio-alta';
import { ExpedienteE1UseCase } from '../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';

@Component({
 selector:'app-apappss-socio-detail',standalone:true,
 imports:[DatePipe,RouterLink,FaIconComponent,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent,ApappssPredioAltaPage],
 templateUrl:'./apappss-socio-detail.html',styleUrls: ['../../gestion-tecnica/gestion-productiva/gestion-productiva.css', './apappss-socio-detail.css'],
 changeDetection:ChangeDetectionStrategy.OnPush,
})
export class ApappssSocioDetailPage implements OnInit {
 @ViewChild(ApappssPredioAltaPage) private alta?:ApappssPredioAltaPage;
 private readonly route=inject(ActivatedRoute);
 private readonly getSocio=inject(ObtenerProductorUseCase);
 private readonly expediente=inject(ExpedienteE1UseCase);
 private readonly uot=inject(UotContextStore);
 private readonly permissions=inject(PermissionService);
 readonly socioId=Number(this.route.snapshot.paramMap.get('socioId'));
 readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'));
 readonly icon=faUsers;readonly backIcon=faArrowLeft;readonly plusIcon=faPlus;readonly refreshIcon=faRotate;
 readonly loading=signal(true);readonly error=signal<string|null>(null);
 readonly socio=signal<ProductorDetalle|null>(null);readonly predios=signal<ProductorPredio[]>([]);
 readonly puedeCrear=computed(()=>this.permissions.hasAll(['PREDIOS_CREAR','APAPPSS_PREDIOS_CREAR']));
 readonly nombre=computed(()=>{const s=this.socio();return s?[s.nombres,s.apellidoPaterno,s.apellidoMaterno].filter(Boolean).join(' '):'Detalle del socio';});
 ngOnInit():void { this.cargar(); }
 cargar():void {
  const uotId=this.uot.selectedId();
  if(!uotId||!Number.isInteger(this.socioId)||this.socioId<=0||!Number.isInteger(this.convenioId)||this.convenioId<=0){this.error.set('Seleccione un socio y un convenio válidos.');this.loading.set(false);return;}
  this.loading.set(true);this.error.set(null);
  this.getSocio.execute(this.socioId).subscribe({next:s=>{
   this.socio.set(s);
   // El listado E1 controla el ámbito de convenio; no basta con el listado general del productor.
   this.expediente.buscarPredios(uotId,s.numeroDocumento,this.convenioId)
    .pipe(finalize(()=>this.loading.set(false))).subscribe({next:rows=>{
     const ids=new Set(rows.map(p=>p.predioId));
     this.predios.set(s.predios.filter(p=>p.estado&&(!p.fechaHasta)&&ids.has(p.predioId)));
    },error:e=>this.error.set(mapOpenApiError(e).message)});
  },error:e=>{this.loading.set(false);this.error.set(mapOpenApiError(e).message);}});
 }
 async crearPredio():Promise<void>{
  if(!this.puedeCrear()||!this.alta)return;
  const res=await this.alta.open(this.socioId,this.convenioId);
  if(res.saved)this.cargar();
 }
}
