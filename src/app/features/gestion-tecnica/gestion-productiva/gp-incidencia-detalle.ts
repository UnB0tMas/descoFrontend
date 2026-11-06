import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faRotate, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';
import { GpActividadResponse } from '../../../infrastructure/openapi/generated/model/gpActividadResponse';
import { GpCatalogoResponse } from '../../../infrastructure/openapi/generated/model/gpCatalogoResponse';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { GpGeneralFacade } from './gp-general.facade';
import { GpIncidenciasPanel } from './gp-incidencias-panel';

@Component({
  selector: 'app-gp-incidencia-detalle', standalone: true,
  imports: [RouterLink, FaIconComponent, PageHeaderComponent, LoadingStateComponent,
    ErrorStateComponent, EmptyStateComponent, GpIncidenciasPanel],
  templateUrl: './gp-incidencia-detalle.html',
  styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpIncidenciaDetalle implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gp = inject(GpGeneralFacade);
  private readonly uot = inject(UotContextStore);
  readonly backIcon = faArrowLeft;
  readonly refreshIcon = faRotate;
  readonly pageIcon = faStethoscope;
  readonly predioId = Number(this.route.snapshot.paramMap.get('predioId'));
  readonly parcelaId = Number(this.route.snapshot.paramMap.get('parcelaId'));
  readonly actividadId = Number(this.route.snapshot.paramMap.get('actividadId'));
  readonly incidenciaId = Number(this.route.snapshot.paramMap.get('incidenciaId'));
  readonly loading = signal(true);
  readonly error = signal<string|null>(null);
  readonly actividad = signal<GpActividadResponse|null>(null);
  readonly catalogos = signal<GpCatalogoResponse[]>([]);

  ngOnInit(): void { this.load(); }
  load(): void {
    const u = this.uot.selectedId();
    if (!u || ![this.predioId,this.parcelaId,this.actividadId,this.incidenciaId].every(id => Number.isSafeInteger(id) && id > 0)) {
      this.loading.set(false); this.error.set('No se puede consultar el expediente.'); return;
    }
    this.loading.set(true); this.error.set(null);
    forkJoin({ actividades: this.gp.actividades(u,this.parcelaId), catalogos: this.gp.catalogos(u) })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => {
          this.catalogos.set(data.catalogos);
          this.actividad.set(data.actividades.find(x => x.actividadId === this.actividadId) ?? null);
        },
        error: err => this.error.set(mapOpenApiError(err).message),
      });
  }
}
