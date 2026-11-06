import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';
import { PermissionDirective } from '../../../../../core/access/permission.directive';
import { UotContextStore } from '../../../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../shared/data-display/error-state/error-state';
import { ToastService } from '../../../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EvidencePanelComponent } from '../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { PredioMapComponent } from '../../adapter/in/ui/components/predio-map/predio-map';
import { ExpedienteE1UseCase } from '../application/expediente-e1.use-case';
import { CatalogosE1, ExpedienteE1, VariedadE1 } from '../domain/expediente-e1.model';

type Seccion = 'cultivos' | 'crianzas' | 'historial' | 'ficha' | 'evidencias';

@Component({ selector: 'app-expediente-e1', standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, PermissionDirective,
    PageHeaderComponent, LoadingStateComponent, ErrorStateComponent, PredioMapComponent, EvidencePanelComponent],
  templateUrl: './expediente.html', styleUrl: './expediente-e1.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpedienteE1Page implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly uot = inject(UotContextStore);
  private readonly caso = inject(ExpedienteE1UseCase);
  private readonly toast = inject(ToastService);
  readonly icon = faMapLocationDot;
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly convenio = Number(this.route.snapshot.queryParamMap.get('convenioId')) || undefined;
  readonly backRoute = this.convenio ? '/convenios/apappss' : '/gestion-tecnica/predios';
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detalle = signal<ExpedienteE1 | null>(null);
  readonly catalogos = signal<CatalogosE1>({ cultivos: [], variedades: [], especies: [] });
  readonly seccion = signal<Seccion>('cultivos');
  readonly titulo = computed(() => this.detalle()?.nombre || 'Expediente productivo');
  cultivoId = 0;
  variedadId = 0;
  parcelaNombre = '';
  especieId = 0;
  loteNombre = '';
  cantidad: number | null = null;
  loteId = 0;
  cantidadConteo: number | null = null;
  conteoNota = '';
  tipoNota = 'GENERAL';
  nota = '';
  notaCultivoId = 0;
  notaCrianzaId = 0;
  fichaArea: number | null = null;
  fichaCultivable: number | null = null;
  fichaRiego = '';
  readonly variedades = (): VariedadE1[] =>
    this.catalogos().variedades.filter(v => v.padreId === Number(this.cultivoId));

  ngOnInit(): void {
    const requestedSection = this.route.snapshot.queryParamMap.get('seccion') as Seccion | null;
    if (requestedSection && ['cultivos', 'crianzas', 'historial', 'ficha', 'evidencias'].includes(requestedSection)) {
      this.seccion.set(requestedSection);
    }
    this.cargar();
    const uot = this.uot.selectedId();
    if (uot) this.caso.catalogos(uot).subscribe({
      next: d => this.catalogos.set(d),
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }
  cargar(): void {
    const uot = this.uot.selectedId();
    if (!uot || !Number.isInteger(this.id) || this.id < 1) {
      this.error.set('El expediente requiere una UOT y un predio válidos.'); this.loading.set(false); return;
    }
    this.loading.set(true); this.error.set(null);
    this.caso.detalle(uot, this.id, this.convenio)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: d => {
        this.detalle.set(d);
        this.fichaArea = d.areaTotalHa ?? null;
        this.fichaCultivable = d.areaCultivableHa ?? null;
        this.fichaRiego = d.tipoRiego ?? '';
      }, error: e => this.error.set(mapOpenApiError(e).message) });
  }
  cambiar(seccion: Seccion): void { this.seccion.set(seccion); }
  private guardar(request: Observable<number>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(null);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({ next: () => {
      this.toast.success(message); this.cargar();
      this.nota = ''; this.conteoNota = ''; this.parcelaNombre = ''; this.loteNombre = '';
      this.cultivoId = 0; this.variedadId = 0; this.especieId = 0; this.cantidad = null;
      this.loteId = 0; this.cantidadConteo = null; this.notaCultivoId = 0; this.notaCrianzaId = 0;
    }, error: e => this.error.set(mapOpenApiError(e).message) });
  }
  agregarCultivo(): void {
    const uot = this.uot.selectedId();
    if (!uot || !this.cultivoId || this.busy()) return;
    this.guardar(this.caso.cultivo(uot, this.id, {
      cultivoId: Number(this.cultivoId), variedadId: this.variedadId ? Number(this.variedadId) : undefined,
      parcelaNombre: this.parcelaNombre.trim() || undefined,
    }, this.convenio), 'Cultivo agregado');
  }
  agregarCrianza(): void {
    const uot = this.uot.selectedId();
    if (!uot || !this.especieId || this.busy() || (this.cantidad !== null && this.cantidad < 0)) return;
    this.guardar(this.caso.crianza(uot, this.id, {
      especieId: Number(this.especieId), nombre: this.loteNombre.trim() || undefined,
      cantidad: this.cantidad ?? undefined,
    }, this.convenio), 'Crianza agregada');
  }
  agregarConteo(): void {
    const uot = this.uot.selectedId();
    if (!uot || !this.loteId || this.busy() || (this.cantidadConteo !== null && this.cantidadConteo < 0)) return;
    this.guardar(this.caso.conteo(uot, this.id, {
      loteId: Number(this.loteId), cantidad: this.cantidadConteo ?? undefined,
      observacion: this.conteoNota.trim() || undefined,
    }, this.convenio), 'Conteo registrado');
  }
  guardarNota(): void {
    const uot = this.uot.selectedId();
    if (!uot || this.nota.trim().length < 3 || this.busy()) return;
    this.guardar(this.caso.actuacion(uot, this.id, {
      tipo: this.tipoNota,
      observacion: this.nota.trim(),
      cultivoId: this.notaCultivoId || undefined,
      crianzaId: this.notaCrianzaId || undefined,
    }, this.convenio),
      'Actuación registrada');
  }
  completar(): void {
    const uot = this.uot.selectedId();
    if (!uot || this.busy() || (this.fichaArea !== null && this.fichaArea <= 0) ||
        (this.fichaCultivable !== null && (this.fichaCultivable < 0 || (this.fichaArea !== null && this.fichaCultivable > this.fichaArea)))) return;
    this.guardar(this.caso.ficha(uot, this.id, {
      areaTotalHa: this.fichaArea ?? undefined,
      areaCultivableHa: this.fichaCultivable ?? undefined,
      tipoRiego: this.fichaRiego.trim() || undefined,
    }, this.convenio), 'Ficha ampliada');
  }
}
