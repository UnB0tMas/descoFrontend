import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexNonAxisChartSeries,
  ChartComponent,
} from 'ng-apexcharts';

import { ChartCardData } from './chart-card.types';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [ChartComponent, FaIconComponent],
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent {
  @Input({ required: true }) data!: ChartCardData;

  readonly fallbackIcon = faChartLine;
  readonly emptyNoData = { text: '' };

  get series(): ApexAxisChartSeries | ApexNonAxisChartSeries {
    return this.data.options.series ?? [];
  }

  get chart(): ApexChart {
    return (
      this.data.options.chart ?? {
        type: 'line',
        height: 320,
        toolbar: { show: false },
      }
    );
  }
}
