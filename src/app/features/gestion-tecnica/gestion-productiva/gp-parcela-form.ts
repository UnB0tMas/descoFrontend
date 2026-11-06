import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLayerGroup, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { GpParcelaResponse } from '../../../infrastructure/openapi/generated/model/gpParcelaResponse';
import { GeographyCascadeComponent, GeographySelection } from '../../../shared/forms/geography-cascade/geography-cascade';
import { PredioMapComponent } from '../predios/adapter/in/ui/components/predio-map/predio-map';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { GpGeneralFacade } from './gp-general.facade';

export interface GpModalResult { saved: boolean; }

@Component({
  selector: 'app-gp-parcela-form', standalone: true,
  imports: [FormsModule, GeographyCascadeComponent, PredioMapComponent, FaIconComponent],
  templateUrl: './gp-parcela-form.html', styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpParcelaForm {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(PredioMapComponent) private mapComponent?: PredioMapComponent;
  private readonly gp = inject(GpGeneralFacade);
  private readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);

  readonly modalIcon=faLayerGroup;readonly closeIcon=faXmark;
  readonly editing = signal<GpParcelaResponse | null>(null);
  readonly opened = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private resolver: ((value: GpModalResult) => void) | null = null;
  private ultimoPayload: string | null = null;
  private ultimoRequestId: string | null = null;


  predioId = 0;
  predioNombre = '';
  nombre = '';
  areaHa: number | null = null;
  distrito = '';
  centroPoblado: number | null = null;
  latitud: number | null = null;
  longitud: number | null = null;

  open(predioId: number, predioNombre: string, current: GpParcelaResponse | null = null): Promise<GpModalResult> {
    this.editing.set(current);
    this.predioId = predioId;
    this.predioNombre = predioNombre;
    this.nombre = current?.nombre ?? '';
    this.areaHa = current?.areaHa ?? null;
    this.distrito = current?.distritoCodigo ?? '';
    this.centroPoblado = current?.centroPobladoId ?? null;
    this.latitud = current?.latitud ?? null;
    this.longitud = current?.longitud ?? null;
    this.error.set(null);
    this.ultimoPayload = null;
    this.ultimoRequestId = null;
    this.opened.set(true);
    this.dialog.nativeElement.showModal();
    return new Promise(resolve => { this.resolver = resolve; });
  }
  geography(s: GeographySelection): void {
    this.distrito = s.districtCode;
    this.centroPoblado = s.populationCenterId;
  }
  point(p: { latitude: number; longitude: number }): void {
    this.latitud = p.latitude;
    this.longitud = p.longitude;
  }
  clearPoint(): void {
    this.latitud = null;
    this.longitud = null;
    this.mapComponent?.clearSelection();
  }
  close(): void { if (!this.saving()) this.finish(false); }
  save(): void {
    const uot = this.uot.selectedId();
    if (!uot || this.saving()) return;
    if (!this.nombre.trim() || this.nombre.trim().length > 120 ||
        this.areaHa == null || !Number.isFinite(this.areaHa) || this.areaHa <= 0 ||
        this.areaHa > 999999.9999 ||
        Math.abs(this.areaHa * 10000 - Math.round(this.areaHa * 10000)) > 0.000001 ||
        !/^\d{6}$/.test(this.distrito)) {
      this.error.set('Complete nombre, superficie mayor que cero (máximo 4 decimales) y distrito obligatorio.'); return;
    }
    if ((this.latitud === null) !== (this.longitud === null) ||
        this.latitud !== null && (!Number.isFinite(this.latitud) || Math.abs(this.latitud) > 90) ||
        this.longitud !== null && (!Number.isFinite(this.longitud) || Math.abs(this.longitud) > 180)) {
      this.error.set('El GPS debe contener latitud y longitud válidas o ninguna coordenada.'); return;
    }
    if (this.centroPoblado !== null && (!Number.isInteger(this.centroPoblado) || this.centroPoblado <= 0)) {
      this.error.set('Seleccione un centro poblado válido o deje el campo vacío.'); return;
    }
    const current = this.editing();
    const common = {
      nombre: this.nombre.trim(), areaHa: this.areaHa, distritoCodigo: this.distrito,
      centroPobladoId: this.centroPoblado,
      latitud: this.latitud, longitud: this.longitud,
    };
    const payload = JSON.stringify({ uot, parcelaId: current?.parcelaId ?? null, predioId: this.predioId, ...common });
    if (this.ultimoPayload !== payload || this.ultimoRequestId === null) {
      this.ultimoPayload = payload;
      this.ultimoRequestId = crypto.randomUUID();
    }
    const clave = this.ultimoRequestId;
    this.saving.set(true);
    this.error.set(null);
    const operation = current
      ? this.gp.editarParcela(uot, current.parcelaId, common, clave)
      : this.gp.crearParcela(uot, { ...common, predioId: this.predioId }, clave);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.toast.success(current ? 'Parcela actualizada' : 'Parcela registrada'); this.finish(true); },
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }
  private finish(saved: boolean): void {
    if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
    this.opened.set(false);
    this.resolver?.({ saved });
    this.resolver = null;
  }
}
