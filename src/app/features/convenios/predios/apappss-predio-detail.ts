import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faMapLocationDot, faRotate } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { GeographyCascadeComponent } from '../../../shared/forms/geography-cascade/geography-cascade';
import { ApappssNavigationComponent } from './navigation/apappss-navigation';
import { ApappssPredioAltaPage } from './apappss-predio-alta';
import { ExpedienteE1UseCase } from '../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import { ExpedienteE1 } from '../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import { PlantasE3Page } from '../plantas/adapter/in/ui/plantas-e3';
import { E3MateriaSecaComponent } from '../plantas/adapter/in/ui/clinical/e3-materia-seca';
import { FundoProduccionComponent } from './fundo-produccion';
import type { AmbitoE3 } from '../plantas/domain/planta-paltera.model';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';

type TabPredio = 'general'|'ubicacion'|'plantas'|'materia-seca'|'produccion';
@Component({selector:'app-apappss-predio-detail',standalone:true,
 imports:[DecimalPipe,RouterLink,FaIconComponent,PageHeaderComponent,LoadingStateComponent,
  ErrorStateComponent,GeographyCascadeComponent,ApappssNavigationComponent,PlantasE3Page,ApappssPredioAltaPage,E3MateriaSecaComponent,FundoProduccionComponent],
 templateUrl:'./apappss-predio-detail.html',styleUrls:['../../gestion-tecnica/gestion-productiva/gestion-productiva.css','./apappss-predio-detail.css'],
 changeDetection:ChangeDetectionStrategy.OnPush})
export class ApappssPredioDetailPage implements OnInit {
 @ViewChild(ApappssPredioAltaPage) private editor?:ApappssPredioAltaPage;
 private readonly route=inject(ActivatedRoute);
 private readonly uot=inject(UotContextStore);
 private readonly e1=inject(ExpedienteE1UseCase);
 private readonly permissions=inject(PermissionService);
 readonly predioId=Number(this.route.snapshot.paramMap.get('predioId'));
 readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'));
 readonly socioId=Number(this.route.snapshot.queryParamMap.get('socioId'))||0;
 readonly icon=faMapLocationDot;readonly backIcon=faArrowLeft;readonly refreshIcon=faRotate;
 readonly loading=signal(true);readonly error=signal<string|null>(null);
 readonly detalle=signal<ExpedienteE1|null>(null);
 readonly tabPredio=signal<TabPredio>('general');
 readonly puedeEditar=computed(()=>this.permissions.hasAll(['PREDIOS_EDITAR','APAPPSS_PREDIOS_EDITAR']));
 readonly ambitoMateriaSeca=computed<AmbitoE3|null>(()=>{
  const uotId=this.uot.selectedId();
  return uotId&&this.convenioId>0&&this.predioId>0?{uotId,convenioId:this.convenioId,predioId:this.predioId}:null;
 });
 ngOnInit():void{this.cargar();}
 cambiarTab(tab:TabPredio):void{this.tabPredio.set(tab);}
 async abrirEdicion():Promise<void>{
  const socio=this.socioId||this.detalle()?.titulares.find(x=>x.socioId)?.socioId
    ||this.detalle()?.titulares[0]?.personaId||0;
  if(!this.puedeEditar()||!this.editor||!socio||this.loading())return;
  const result=await this.editor.openEditar(socio,this.convenioId,this.predioId);
  if(result.saved)this.cargar();
 }
 cargar():void{
  const uotId=this.uot.selectedId();
  if(!uotId||!Number.isInteger(this.convenioId)||this.convenioId<=0||
    !Number.isInteger(this.predioId)||this.predioId<=0){
    this.error.set('Seleccione un predio y un convenio válidos.');this.loading.set(false);return;
  }
  this.loading.set(true);this.error.set(null);
  this.e1.detalle(uotId,this.predioId,this.convenioId)
   .pipe(finalize(()=>this.loading.set(false))).subscribe({
    next:d=>this.detalle.set(d),error:e=>this.error.set(mapOpenApiError(e).message),
   });
 }
}
