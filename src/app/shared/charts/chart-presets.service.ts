import { Injectable } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexNonAxisChartSeries,
  ApexOptions,
} from 'ng-apexcharts';

const BLUE_PALETTE = [
  '#2563EB',
  '#0EA5E9',
  '#1D4ED8',
  '#0284C7',
  '#60A5FA',
  '#38BDF8',
  '#1E40AF',
];

@Injectable({ providedIn: 'root' })
export class ChartPresetsService {
  line(
    series: ApexAxisChartSeries,
    categories: readonly string[],
  ): ApexOptions {
    return this.axisBase('line', series, categories, {
      stroke: { curve: 'smooth', width: 3 },
      markers: { size: 0, hover: { sizeOffset: 4 } },
    });
  }

  area(
    series: ApexAxisChartSeries,
    categories: readonly string[],
  ): ApexOptions {
    return this.axisBase('area', series, categories, {
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'solid', opacity: 0.12 },
      markers: { size: 0 },
    });
  }

  bar(
    series: ApexAxisChartSeries,
    categories: readonly string[],
  ): ApexOptions {
    return this.axisBase('bar', series, categories, {
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: '58%',
        },
      },
    });
  }

  column(
    series: ApexAxisChartSeries,
    categories: readonly string[],
  ): ApexOptions {
    return this.axisBase('bar', series, categories, {
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 7,
          columnWidth: '52%',
        },
      },
    });
  }

  pie(series: ApexNonAxisChartSeries, labels: readonly string[]): ApexOptions {
    return this.circularBase('pie', series, labels);
  }

  donut(
    series: ApexNonAxisChartSeries,
    labels: readonly string[],
  ): ApexOptions {
    return {
      ...this.circularBase('donut', series, labels),
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: '#64748B',
                fontSize: '12px',
                fontWeight: 600,
              },
            },
          },
        },
      },
    };
  }

  radialBar(
    series: ApexNonAxisChartSeries,
    labels: readonly string[],
  ): ApexOptions {
    return {
      series,
      chart: this.chart('radialBar'),
      labels: [...labels],
      colors: BLUE_PALETTE,
      plotOptions: {
        radialBar: {
          hollow: { size: '54%' },
          track: { background: '#EFF6FF', strokeWidth: '100%' },
          dataLabels: {
            name: { color: '#64748B', fontSize: '12px' },
            value: { color: '#0F172A', fontSize: '22px', fontWeight: 700 },
          },
        },
      },
      stroke: { lineCap: 'round' },
      legend: this.legend(),
    };
  }

  radar(
    series: ApexAxisChartSeries,
    categories: readonly string[],
  ): ApexOptions {
    return {
      ...this.axisBase('radar', series, categories),
      stroke: { width: 2 },
      fill: { type: 'solid', opacity: 0.12 },
      markers: { size: 4 },
      plotOptions: {
        radar: {
          polygons: {
            strokeColors: '#E2E8F0',
            connectorColors: '#E2E8F0',
            fill: { colors: ['#FFFFFF', '#F8FAFC'] },
          },
        },
      },
    };
  }

  polarArea(
    series: ApexNonAxisChartSeries,
    labels: readonly string[],
  ): ApexOptions {
    return {
      series,
      chart: this.chart('polarArea'),
      labels: [...labels],
      colors: BLUE_PALETTE,
      stroke: { colors: ['#FFFFFF'], width: 2 },
      fill: { type: 'solid', opacity: 0.92 },
      legend: this.legend(),
      dataLabels: { enabled: true },
    };
  }

  scatter(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('scatter'),
      colors: BLUE_PALETTE,
      xaxis: {
        tickAmount: 8,
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
      },
      yaxis: {
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
      },
      grid: this.grid(),
      legend: this.legend(),
      markers: { size: 6, strokeWidth: 0 },
      tooltip: this.tooltip(),
    };
  }

  bubble(series: ApexAxisChartSeries): ApexOptions {
    return {
      ...this.scatter(series),
      chart: this.chart('bubble'),
      fill: { type: 'solid', opacity: 0.72 },
    };
  }

  heatmap(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('heatmap'),
      colors: ['#2563EB'],
      dataLabels: { enabled: false },
      plotOptions: {
        heatmap: {
          radius: 5,
          shadeIntensity: 0.45,
          colorScale: {
            ranges: [
              { from: 0, to: 20, color: '#DBEAFE' },
              { from: 21, to: 40, color: '#BFDBFE' },
              { from: 41, to: 60, color: '#60A5FA' },
              { from: 61, to: 80, color: '#2563EB' },
              { from: 81, to: 1000000, color: '#1E40AF' },
            ],
          },
        },
      },
      grid: this.grid(),
      tooltip: this.tooltip(),
    };
  }

  treemap(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('treemap'),
      colors: BLUE_PALETTE,
      legend: { show: false },
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px', fontWeight: 600 },
      },
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false,
        },
      },
      tooltip: this.tooltip(),
    };
  }

  rangeBar(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('rangeBar'),
      colors: BLUE_PALETTE,
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
        },
      },
      grid: this.grid(),
      legend: this.legend(),
      tooltip: this.tooltip(),
    };
  }

  rangeArea(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('rangeArea'),
      colors: BLUE_PALETTE,
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'solid', opacity: 0.18 },
      grid: this.grid(),
      legend: this.legend(),
      tooltip: this.tooltip(),
    };
  }

  candlestick(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('candlestick'),
      plotOptions: {
        candlestick: {
          colors: {
            upward: '#2563EB',
            downward: '#94A3B8',
          },
        },
      },
      grid: this.grid(),
      xaxis: { type: 'datetime' },
      tooltip: this.tooltip(),
    };
  }

  boxPlot(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('boxPlot'),
      colors: ['#2563EB', '#93C5FD'],
      plotOptions: {
        boxPlot: {
          colors: {
            upper: '#2563EB',
            lower: '#93C5FD',
          },
        },
      },
      grid: this.grid(),
      tooltip: this.tooltip(),
    };
  }

  funnel(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('funnel'),
      colors: BLUE_PALETTE,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontWeight: 600,
          colors: ['#FFFFFF'],
        },
      },
      plotOptions: {
        funnel: {
          shape: 'trapezoid',
          lastShape: 'taper',
        },
      },
      legend: { show: false },
      tooltip: this.tooltip(),
    };
  }

  pyramid(series: ApexAxisChartSeries): ApexOptions {
    return {
      series,
      chart: this.chart('pyramid'),
      colors: BLUE_PALETTE,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontWeight: 600,
          colors: ['#FFFFFF'],
        },
      },
      legend: { show: false },
      tooltip: this.tooltip(),
    };
  }

  gauge(
    value: number,
    label = 'Avance',
  ): ApexOptions {
    return {
      series: [value],
      chart: this.chart('radialBar'),
      labels: [label],
      colors: ['#2563EB'],
      plotOptions: {
        radialBar: {
          startAngle: -110,
          endAngle: 110,
          hollow: {
            size: '66%',
          },
          track: {
            background: '#E2E8F0',
            strokeWidth: '100%',
            margin: 0,
          },
          dataLabels: {
            name: {
              offsetY: 22,
              color: '#64748B',
              fontSize: '12px',
              fontWeight: 600,
            },
            value: {
              offsetY: -18,
              color: '#0F172A',
              fontSize: '28px',
              fontWeight: 700,
              formatter: (currentValue: number) => `${Math.round(currentValue)}%`,
            },
          },
        },
      },
      stroke: {
        lineCap: 'round',
      },
    };
  }

  mixed(
    series: ApexAxisChartSeries,
    categories: readonly string[],
  ): ApexOptions {
    return {
      series,
      chart: this.chart('line'),
      colors: BLUE_PALETTE,
      dataLabels: { enabled: false },
      fill: { type: 'solid', opacity: 1 },
      stroke: {
        width: [0, 3, 2],
        curve: 'smooth',
      },
      plotOptions: {
        bar: {
          borderRadius: 7,
          columnWidth: '48%',
        },
      },
      xaxis: {
        categories: [...categories],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
      },
      yaxis: {
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
      },
      grid: this.grid(),
      legend: this.legend(),
      tooltip: this.tooltip(),
    };
  }

  generic(options: ApexOptions): ApexOptions {
    return {
      colors: BLUE_PALETTE,
      grid: this.grid(),
      legend: this.legend(),
      tooltip: this.tooltip(),
      dataLabels: { enabled: false },
      fill: { type: 'solid', opacity: 1 },
      ...options,
    };
  }

  private axisBase(
    type: 'line' | 'area' | 'bar' | 'radar',
    series: ApexAxisChartSeries,
    categories: readonly string[],
    extra: ApexOptions = {},
  ): ApexOptions {
    return {
      series,
      chart: this.chart(type),
      colors: BLUE_PALETTE,
      dataLabels: { enabled: false },
      fill: { type: 'solid', opacity: 1 },
      grid: this.grid(),
      legend: this.legend(),
      tooltip: this.tooltip(),
      stroke: { width: type === 'bar' ? 0 : 3, curve: 'smooth' },
      xaxis: {
        categories: [...categories],
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
      },
      yaxis: {
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
      },
      ...extra,
    };
  }

  private circularBase(
    type: 'pie' | 'donut',
    series: ApexNonAxisChartSeries,
    labels: readonly string[],
  ): ApexOptions {
    return {
      series,
      chart: this.chart(type),
      labels: [...labels],
      colors: BLUE_PALETTE,
      legend: this.legend(),
      dataLabels: { enabled: true },
      stroke: { colors: ['#FFFFFF'], width: 3 },
      fill: { type: 'solid', opacity: 1 },
      tooltip: this.tooltip(),
    };
  }

  private chart(type: NonNullable<ApexChart['type']>): ApexChart {
    return {
      type,
      height: 320,
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      foreColor: '#64748B',
      toolbar: { show: false },
      animations: {
        enabled: true,
        speed: 450,
      },
      background: 'transparent',
    };
  }

  private grid(): NonNullable<ApexOptions['grid']> {
    return {
      borderColor: '#E2E8F0',
      strokeDashArray: 4,
      padding: { left: 4, right: 8, top: 4, bottom: 0 },
    };
  }

  private legend(): NonNullable<ApexOptions['legend']> {
    return {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: '#475569' },
      itemMargin: { horizontal: 12, vertical: 4 },
    };
  }

  private tooltip(): NonNullable<ApexOptions['tooltip']> {
    return {
      theme: 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      },
    };
  }
}
