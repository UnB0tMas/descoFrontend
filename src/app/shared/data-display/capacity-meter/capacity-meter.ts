import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Indicador visual genérico; la validación de negocio permanece en el formulario y el servidor. */
@Component({
  selector: 'app-capacity-meter',
  standalone: true,
  templateUrl: './capacity-meter.html',
  styleUrl: './capacity-meter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CapacityMeterComponent {
  readonly total = input<number | null>(null);
  readonly available = input<number | null>(null);
  readonly proposed = input<number | null>(null);
  readonly unit = input('m²');
  readonly heading = input('Superficie de la parcela');
  readonly secondaryUnit = input<string | null>(null);
  readonly unitsPerSecondary = input(1);

  readonly visible = computed(() => this.total() !== null && this.available() !== null &&
    Number.isFinite(this.total()) && Number.isFinite(this.available()) && this.total()! > 0);
  readonly occupied = computed(() => this.visible() ? Math.max(0, this.total()! - this.available()!) : 0);
  readonly pending = computed(() => Number.isFinite(this.proposed()) ? Math.max(0, this.proposed() ?? 0) : 0);
  readonly remaining = computed(() => this.visible() ? Math.max(0, this.available()! - this.pending()) : 0);
  readonly exceeds = computed(() => this.visible() && this.pending() > this.available()! + 0.0001);
  readonly usedPercent = computed(() => this.visible() ? Math.min(100, 100 * this.occupied() / this.total()!) : 0);
  readonly progressNow = computed(() => this.visible() ? Math.min(this.total()!, this.occupied() + this.pending()) : 0);
  readonly pendingPercent = computed(() => this.visible() ?
    Math.min(100 - this.usedPercent(), 100 * this.pending() / this.total()!) : 0);

  format(value: number): string {
    return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value);
  }
}
