import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { faUsersGear } from '@fortawesome/free-solid-svg-icons';
import { PageHeaderComponent } from '../../../../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../../shared/data-display/error-state/error-state';
import { ToastService } from '../../../../../../../../../shared/feedback/toast-center/toast.service';
import { UotContextStore } from '../../../../../../../../uot/state/uot-context.store';
import { GestionDocumentariaApi, ReceptorInterno } from '../../../../../../../../gestion-documentaria/gestion-documentaria.api';
import { SalidasTecnicasApi, ResponsableSalidaTecnica } from '../../../../out/http/salidas-tecnicas.api';
import { mapOpenApiError } from '../../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';

@Component({selector:'app-responsables-salidas',standalone:true,
  imports:[FormsModule,RouterLink,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent],
  templateUrl:'./responsables-salidas.html',styleUrl:'./responsables-salidas.css',
  changeDetection:ChangeDetectionStrategy.OnPush})
export class ResponsablesSalidasPage implements OnInit {
  private readonly api=inject(SalidasTecnicasApi);
  private readonly docs=inject(GestionDocumentariaApi);
  private readonly toast=inject(ToastService);
  readonly uot=inject(UotContextStore);
  readonly icon=faUsersGear;
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal<string|null>(null);
  readonly rows=signal<ResponsableSalidaTecnica[]>([]);
  readonly personas=signal<ReceptorInterno[]>([]);
  usuarioId=0;
  funcion:ResponsableSalidaTecnica['funcion']='APROBADOR';
  prioridad=1;
  suplente=false;
  fechaDesde='';
  fechaHasta='';
  ngOnInit():void{this.load();}
  load():void{
    const u=this.uot.selectedId();if(!u){this.error.set('Seleccione una UOT.');this.loading.set(false);return;}
    this.loading.set(true);this.error.set(null);
    forkJoin({rows:this.api.responsables(u),personas:this.docs.destinatarios(u)})
      .pipe(finalize(()=>this.loading.set(false))).subscribe({
        next:r=>{this.rows.set(r.rows);this.personas.set(r.personas.filter(x=>x.habilitado&&!!x.usuarioId));},
        error:e=>this.error.set(mapOpenApiError(e).message)
      });
  }
  nombre(usuarioId:number):string{
    return this.personas().find(p=>p.usuarioId===usuarioId)?.nombre
      ??this.rows().find(p=>p.usuarioId===usuarioId)?.usuario??`Usuario #${usuarioId}`;
  }
  guardar():void{
    const u=this.uot.selectedId();if(!u||!this.usuarioId||this.saving())return;
    this.enviar({usuarioId:this.usuarioId,funcion:this.funcion,prioridad:this.prioridad,
      suplente:this.suplente,activo:true,
      fechaDesde:this.fechaDesde?new Date(this.fechaDesde).toISOString():undefined,
      fechaHasta:this.fechaHasta?new Date(this.fechaHasta).toISOString():undefined});
  }
  cambiarEstado(row:ResponsableSalidaTecnica):void{
    if(this.saving())return;
    this.enviar({...row,activo:!row.activo});
  }
  private enviar(body:ResponsableSalidaTecnica):void{
    const u=this.uot.selectedId();if(!u)return;
    this.saving.set(true);this.error.set(null);
    this.api.guardarResponsable(u,body).pipe(finalize(()=>this.saving.set(false))).subscribe({
      next:()=>{this.toast.success('Configuración guardada');this.load();},
      error:e=>this.error.set(mapOpenApiError(e).message)
    });
  }
}
