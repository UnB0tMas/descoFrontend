import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBoxesStacked,
  faBuildingWheat,
  faCalendarCheck,
  faChartColumn,
  faClipboardCheck,
  faCoins,
  faLeaf,
  faMoneyBillTransfer,
  faRoute,
  faSeedling,
  faTruck,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';

import { KpiCardComponent } from '../../../../../../../shared/data-display/kpi-card/kpi-card';
import { KpiCardData } from '../../../../../../../shared/data-display/kpi-card/kpi-card.model';
import { Indicador } from '../../../../../domain/indicador.model';

@Component({
  selector: 'app-indicadores-panel',
  standalone: true,
  imports: [KpiCardComponent, FaIconComponent],
  templateUrl: './indicadores-panel.html',
  styleUrl: './indicadores-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadoresPanelComponent {
  @Input({ required: true }) indicadores: readonly Indicador[] = [];

  readonly chartIcon = faChartColumn;

  kpis(): readonly KpiCardData[] {
    return this.indicadores.map((indicator, index) => ({
      label: indicator.indicador,
      value: indicator.valor,
      description: this.description(indicator),
      icon: this.iconFor(indicator.codigo, indicator.indicador),
      tone:
        index % 4 === 1
          ? 'sky'
          : index % 4 === 2
            ? 'indigo'
            : index % 4 === 3
              ? 'slate'
              : 'blue',
    }));
  }

  private description(indicator: Indicador): string | undefined {
    if (!indicator.unidad) {
      return undefined;
    }

    if (indicator.unidad.toUpperCase() === 'PEN') {
      return 'Importe en soles';
    }

    return indicator.unidad;
  }

  private iconFor(code: string, label: string): IconDefinition {
    const normalized = `${code} ${label}`.toLowerCase();

    if (normalized.includes('productor') || normalized.includes('socio')) {
      return faUserGroup;
    }

    if (normalized.includes('predio') || normalized.includes('parcela')) {
      return faBuildingWheat;
    }

    if (normalized.includes('cultivo') || normalized.includes('produccion')) {
      return faSeedling;
    }

    if (normalized.includes('sanitar') || normalized.includes('caso')) {
      return faLeaf;
    }

    if (normalized.includes('salida') || normalized.includes('visita')) {
      return faRoute;
    }

    if (normalized.includes('campania') || normalized.includes('operativo')) {
      return faCalendarCheck;
    }

    if (normalized.includes('jaba') || normalized.includes('inventario')) {
      return faBoxesStacked;
    }

    if (normalized.includes('entrega') || normalized.includes('vehiculo')) {
      return faTruck;
    }

    if (
      normalized.includes('pago') ||
      normalized.includes('cobro') ||
      normalized.includes('saldo')
    ) {
      return faMoneyBillTransfer;
    }

    if (
      normalized.includes('gasto') ||
      normalized.includes('liquidacion') ||
      normalized.includes('importe')
    ) {
      return faCoins;
    }

    return faClipboardCheck;
  }
}
