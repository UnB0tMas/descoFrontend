import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChartArea,
  faChartColumn,
  faChartLine,
  faChartPie,
} from '@fortawesome/free-solid-svg-icons';

import { ChartCardComponent } from '../../../../../../../shared/charts/chart-card/chart-card';
import { ChartCardData } from '../../../../../../../shared/charts/chart-card/chart-card.types';
import { ChartPresetsService } from '../../../../../../../shared/charts/chart-presets.service';
import {
  DashboardChart,
  DashboardChartSeries,
} from '../../../../../domain/grafico-dashboard.model';

@Component({
  selector: 'app-graficos-panel',
  standalone: true,
  imports: [ChartCardComponent, FaIconComponent],
  templateUrl: './graficos-panel.html',
  styleUrl: './graficos-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficosPanelComponent {
  @Input({ required: true }) graficos: readonly DashboardChart[] = [];

  private readonly presets = inject(ChartPresetsService);

  readonly sectionIcon = faChartArea;

  chartData(graph: DashboardChart): ChartCardData {
    const categories = this.categories(graph.series);
    const axisSeries = graph.series.map((series) => ({
      name: series.nombre,
      data: categories.map((category) => this.valueFor(series, category)),
    }));
    const primarySeries = graph.series[0];
    const primaryValues = categories.map((category) =>
      primarySeries ? this.valueFor(primarySeries, category) : 0,
    );

    const options =
      graph.tipoGrafico === 'LINE'
        ? this.presets.line(axisSeries, categories)
        : graph.tipoGrafico === 'AREA'
          ? this.presets.area(axisSeries, categories)
          : graph.tipoGrafico === 'COLUMN'
            ? this.presets.column(axisSeries, categories)
            : graph.tipoGrafico === 'DONUT'
              ? this.presets.donut(primaryValues, categories)
              : this.presets.bar(axisSeries, categories);

    return {
      title: graph.titulo,
      subtitle:
        graph.subtitulo ||
        (graph.unidad ? `Unidad: ${graph.unidad}` : undefined),
      icon: this.iconFor(graph.tipoGrafico),
      options,
      empty: categories.length === 0,
      emptyMessage: 'No existen datos en el periodo seleccionado.',
    };
  }

  private categories(
    series: readonly DashboardChartSeries[],
  ): readonly string[] {
    const values = new Map<string, number>();

    for (const item of series) {
      for (const point of item.puntos) {
        const current = values.get(point.categoria);

        if (current === undefined || point.orden < current) {
          values.set(point.categoria, point.orden);
        }
      }
    }

    return [...values.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([category]) => category);
  }

  private valueFor(
    series: DashboardChartSeries,
    category: string,
  ): number {
    return (
      series.puntos.find((point) => point.categoria === category)?.valor ?? 0
    );
  }

  private iconFor(type: DashboardChart['tipoGrafico']) {
    switch (type) {
      case 'LINE':
        return faChartLine;
      case 'AREA':
        return faChartArea;
      case 'DONUT':
        return faChartPie;
      default:
        return faChartColumn;
    }
  }
}
