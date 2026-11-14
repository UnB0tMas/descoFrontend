import {ChangeDetectionStrategy,Component,inject} from '@angular/core';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeft,faSeedling} from '@fortawesome/free-solid-svg-icons';
import {PageHeaderComponent} from '../../../../../../shared/layout/page-header/page-header';
import {PlantasE3Page} from './plantas-e3';
@Component({selector:'app-e3-planta-detalle-page',standalone:true,
 imports:[RouterLink,FaIconComponent,PageHeaderComponent,PlantasE3Page],
 template:`<main class="desco-page e3-standalone-detail">
 <app-page-header title="Expediente de planta" eyebrow="Convenios · APAPPSS" [icon]="plantaIcon">
  <a pageActions class="admin-secondary-button" [routerLink]="['/convenios/apappss/predios',predioId]" [queryParams]="{convenioId:convenioId,socioId:socioId}"><fa-icon [icon]="backIcon"/> Volver al predio</a>
 </app-page-header>
 <app-plantas-e3-page [predioInicial]="predioId" [plantaInicial]="plantaId" [convenioId]="convenioId" [socioInicial]="socioId" [predioFijo]="true" [vistaIntegrada]="true" vistaFundo="expediente"/>
 </main>`,styles:[`:host{display:block;min-width:0}.e3-standalone-detail{min-width:0;display:grid;gap:1.2rem}.e3-standalone-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}.e3-standalone-head h1{font-size:clamp(1.25rem,2.5vw,1.65rem);font-weight:750;margin:.2rem 0}.e3-standalone-head p{color:var(--desco-text-muted);margin:0;font-size:.85rem}.e3-standalone-eyebrow{color:var(--desco-primary);font-size:.7rem;letter-spacing:.08em;font-weight:700}`],
 changeDetection:ChangeDetectionStrategy.OnPush})
export class E3PlantaDetallePage{
 private readonly route=inject(ActivatedRoute);
 readonly predioId=Number(this.route.snapshot.paramMap.get('predioId'));
 readonly plantaId=Number(this.route.snapshot.paramMap.get('plantaId'));
 readonly convenioId=Number(this.route.snapshot.queryParamMap.get('convenioId'));
 readonly socioId=Number(this.route.snapshot.queryParamMap.get('socioId'))||0;
 readonly backIcon=faArrowLeft;readonly plantaIcon=faSeedling;
}
