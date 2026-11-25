import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faClipboardList, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { SalidasTecnicasApi } from '../../../../../../salidas/e2/adapter/out/http/salidas-tecnicas.api';
import { MiSalidaActividad } from '../../../../../../salidas/e2/domain/salida-personal.model';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ModuleAccessService } from '../../../../../../../../core/access/module-access.service';
import { SectionPanelComponent } from '../../../../../../../../shared/layout/section-panel/section-panel';

interface ActividadMomento {
  id: string;
  fecha: string;
  tipo: string;
  texto: string;
  predioId?: number | null;
  visitaId?: number | null;
  detalle?: string;
}

@Component({
  selector: 'app-mi-actividad-salida', standalone: true,
  imports: [DatePipe, RouterLink, FaIconComponent, PageHeaderComponent, LoadingStateComponent,
    ErrorStateComponent, SectionPanelComponent],
  templateUrl: './mi-actividad.html', styleUrl: './mi-actividad.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiActividadSalidaPage {
  private readonly api = inject(SalidasTecnicasApi);
  private readonly uot = inject(UotContextStore);
  private readonly route = inject(ActivatedRoute);
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly uotId = this.uot.selectedId;
  readonly icon = faClipboardList;
  readonly backIcon = faArrowLeft;
  readonly fichaIcon = faFileLines;
  private readonly permissions = inject(PermissionService);
  private readonly modules = inject(ModuleAccessService);
  canViewFicha(): boolean {return this.permissions.has('SALIDAS_VER') && this.modules.has('SALIDAS');}
  fichaParams(): Record<string, string | number | null> {return {...this.backParams,origen:'mi-actividad'};}
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detalle = signal<MiSalidaActividad | null>(null);
  readonly backParams = {
    buscar: this.route.snapshot.queryParamMap.get('buscar'),
    estado: this.route.snapshot.queryParamMap.get('estado'),
    pagina: Number(this.route.snapshot.queryParamMap.get('pagina')) || 1,
    tamano: Number(this.route.snapshot.queryParamMap.get('tamano')) || 20,
  };
  private sequence=0;

  /** Únicamente hechos asociados a esta salida y a la identidad de la sesión. */
  readonly timeline = computed<ActividadMomento[]>(() => {
    const salida = this.detalle();
    if (!salida) return [];
    const eventos: ActividadMomento[] = [];
    for (const visita of salida.visitas) {
      if (visita.iniciadaPorMi) {
        eventos.push({id:`inicio-${visita.visitaId}`, fecha:visita.fechaInicio,
          tipo:'Visita iniciada', texto:visita.objetivo || visita.tipoVisita,
          predioId:visita.predioId, visitaId:visita.visitaId});
      }
      if (visita.finalizadaPorMi && visita.fechaFin) {
        eventos.push({id:`fin-${visita.visitaId}`, fecha:visita.fechaFin,
          tipo:'Visita finalizada', texto:visita.resumen || visita.tipoVisita,
          predioId:visita.predioId, visitaId:visita.visitaId,
          detalle:visita.recomendaciones || undefined});
      }
    }
    for (const actuacion of salida.actuaciones) {
      eventos.push({id:`actuacion-${actuacion.actuacionId}`, fecha:actuacion.fecha,
        tipo:actuacion.tipo, texto:actuacion.observacion,
        predioId:actuacion.predioId, visitaId:actuacion.visitaId});
    }
    for (const consumo of salida.consumos) {
      eventos.push({id:`consumo-${consumo.consumoId}`, fecha:consumo.fecha,
        tipo:'Material utilizado', texto:`${consumo.suministro}: ${consumo.cantidad} ${consumo.unidad}`,
        predioId:consumo.predioId, visitaId:consumo.visitaId});
    }
    for (const evidencia of salida.evidencias) {
      if (evidencia.visitaId != null) {
        eventos.push({id:`archivo-${evidencia.archivoId}`, fecha:evidencia.fecha,
          tipo:'Evidencia registrada', texto:evidencia.nombre,
          predioId:evidencia.predioId, visitaId:evidencia.visitaId,
          detalle:evidencia.descripcion || undefined});
      }
    }
    return eventos.sort((x,y) => x.fecha.localeCompare(y.fecha) || x.id.localeCompare(y.id));
  });
  readonly sinActividad = computed(() => this.timeline().length === 0);

  predioNombre(predioId: number | null | undefined): string {
    const predio=this.detalle()?.destinos.find(item => item.predioId === predioId);
    return predio?.nombrePredio || predio?.referencia || 'Predio sin identificar';
  }

  private readonly watchUot = effect(() => {
    const id=this.uotId();
    untracked(() => {
      if (id) this.load();
      else {this.sequence++;this.detalle.set(null);this.loading.set(false);
        this.error.set('Seleccione una unidad territorial.');}
    });
  });

  load(): void {
    const uotId=this.uotId();
    if (!uotId || !Number.isInteger(this.id) || this.id<1) {
      this.error.set('Seleccione una salida válida.');this.loading.set(false);return;
    }
    const request=++this.sequence;
    this.loading.set(true);this.error.set(null);this.detalle.set(null);
    this.api.miActividad(uotId,this.id)
      .pipe(finalize(()=>{if(request===this.sequence)this.loading.set(false);})).subscribe({
        next:result=>{if(request===this.sequence)this.detalle.set(result);},
        error:err=>{if(request===this.sequence)this.error.set(mapOpenApiError(err).message);},
      });
  }

  estadoTexto(estado: string): string {
    const map:Record<string,string> = {
      BORRADOR:'Borrador',SOLICITADA:'Pendiente de aprobación',OBSERVADA:'Observada',
      RECHAZADA:'Rechazada',APROBADA:'Aprobada',EN_EJECUCION:'En ejecución',
      EN_RETORNO:'En retorno',CERRADA:'Cerrada',CANCELADA:'Cancelada',
    };
    return map[estado]??estado;
  }
}
