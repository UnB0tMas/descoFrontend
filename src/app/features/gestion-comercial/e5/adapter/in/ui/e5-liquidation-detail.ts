import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { faChartLine, faChartPie, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { E5UseCase } from '../../../application/use-case/e5.use-case';
import { E5ExtrasApiService, E5Beneficiario, E5EntregasSocio, E5JabaSocio, E5EntregaSocioDetalle } from './e5-extras-api.service';
import { CampaignSaleProcessApiService, SaleParticipant } from '../../../../campaigns/campaign-sale-process-api.service';
import { E5LiquidacionResponse, E5LineaResponse, E5PagoResponse } from '../../../../../../infrastructure/openapi/generated';
import { PermissionService } from '../../../../../../core/access/permission.service';
import { DataTableComponent } from '../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../shared/data-display/data-table/data-table.types';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../shared/data-display/loading-state/loading-state';
import { ChartCardComponent } from '../../../../../../shared/charts/chart-card/chart-card';
import { ChartCardData } from '../../../../../../shared/charts/chart-card/chart-card.types';
import { LocalDocumentApiService } from '../../../../../../shared/files/local-document-api.service';
import { ToastService } from '../../../../../../shared/feedback/toast-center/toast.service';

@Component({
  selector: 'app-e5-liquidation-detail', standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent, PageHeaderComponent, LoadingStateComponent, ChartCardComponent, DataTableComponent],
  templateUrl: './e5-liquidation-detail.html', styleUrl: './e5-liquidation-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class E5LiquidationDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(E5UseCase);
  private readonly extras = inject(E5ExtrasApiService);
  private readonly saleApi = inject(CampaignSaleProcessApiService);
  private readonly permission = inject(PermissionService);
  private readonly documents = inject(LocalDocumentApiService);
  private readonly toast = inject(ToastService);
  readonly proofIcon = faPaperclip;
  readonly openingProof = signal<number|null>(null);
  readonly tab = signal<'general'|'jabas'|'liquidacion'|'pagos'>('general');
  readonly tabs = [
    {id:'general' as const,label:'General'},
    {id:'jabas' as const,label:'Jabas entregadas'},
    {id:'liquidacion' as const,label:'Liquidación'},
    {id:'pagos' as const,label:'Pagos'},
  ];
  onTabKeydown(event:KeyboardEvent,index:number):void {
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%this.tabs.length;
    else if(event.key==='ArrowLeft')next=(index+this.tabs.length-1)%this.tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=this.tabs.length-1;
    else return;
    event.preventDefault();
    this.tab.set(this.tabs[next].id);
    (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  readonly jabaColumns:readonly DataTableColumn<E5JabaSocio>[] = [
    {key:'entregaId',label:'Entrega',format:v=>`#${v??''}`},
    {key:'numero',label:'Jaba',format:v=>`#${v??''}`},
    {key:'pesoBruto',label:'Bruto (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
    {key:'tara',label:'Tara (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
    {key:'pesoNeto',label:'Neto (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
  ];
  readonly entregaColumns:readonly DataTableColumn<E5EntregaSocioDetalle>[] = [
    {key:'lote',label:'Lote'}, {key:'jabas',label:'Jabas',align:'right'},
    {key:'pesoBruto',label:'Bruto (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
    {key:'tara',label:'Tara (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
    {key:'rechazado',label:'Rechazado (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
    {key:'aceptado',label:'Aceptado (kg)',align:'right',format:v=>Number(v??0).toFixed(3)},
  ];
  readonly lineaColumns:readonly DataTableColumn<E5LineaResponse>[] = [
    {key:'tipo',label:'Tipo'}, {key:'concepto',label:'Concepto'},
    {key:'importe',label:'Importe',align:'right',format:v=>this.money(v)},
  ];
  readonly pagoColumns:readonly DataTableColumn<E5PagoResponse>[] = [
    {key:'fecha',label:'Fecha'}, {key:'receptor',label:'Recibió'},
    {key:'importe',label:'Importe',align:'right',format:v=>this.money(v)},
    {key:'medioPago',label:'Medio'}, {key:'referencia',label:'Referencia'},
    {key:'estado',label:'Estado'},
    {key:'comprobante',label:'Comprobante',align:'center'},
  ];
  private money(v:unknown):string {
    return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(v??0));
  }
  readonly liquidacionId = Number(this.route.snapshot.paramMap.get('liquidacionId'));
  readonly campaniaId = Number(this.route.snapshot.queryParamMap.get('campaniaId'));
  readonly origenPagos = this.route.snapshot.queryParamMap.get('origen') === 'pagos';
  readonly liquidacion = signal<E5LiquidacionResponse | null>(null);
  readonly beneficiario = signal<E5Beneficiario | null>(null);
  readonly entregas = signal<E5EntregasSocio | null>(null);
  readonly venta = signal<SaleParticipant | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly jabas = computed(() => this.entregas()?.jabas ?? []);
  readonly totalPeso = computed(() => this.jabas().reduce((sum, j) => sum + (j.pesoNeto ?? 0), 0));
  readonly chartWidth = computed(() => Math.max(320, this.jabas().length * 34));
  readonly pagos = computed(() => this.liquidacion()?.pagos ?? []);
  readonly pagoPorId = computed(() => new Map((this.beneficiario()?.historial ?? []).map(h => [h.pagoId, h])));
  openProof(pagoId:number):void {
    const archivoId=this.pagoPorId().get(pagoId)?.comprobanteArchivoId??0;
    if(!archivoId||this.openingProof())return;
    this.openingProof.set(pagoId);
    this.documents.content(archivoId).pipe(finalize(()=>this.openingProof.set(null)))
      .subscribe({next:blob=>{
        const url=URL.createObjectURL(blob);
        const popup=window.open(url,'_blank','noopener,noreferrer');
        if(!popup){
          const a=document.createElement('a');a.href=url;a.download=`comprobante-pago-${pagoId}`;
          document.body.appendChild(a);a.click();a.remove();
        }
        setTimeout(()=>URL.revokeObjectURL(url),120000);
      },error:e=>this.toast.error('Comprobante no disponible',mapOpenApiError(e).message)});
  }

  readonly avanceChart = computed<ChartCardData>(() => {
    const d = this.liquidacion();
    const neto = Math.max(0, d?.neto ?? 0);
    const pagado = Math.max(0, Math.min(neto, d?.pagado ?? 0));
    const porcentaje = neto > 0 ? Math.min(100, Math.round(pagado / neto * 10000) / 100) : 0;
    return {
      title: 'Avance de pago', icon: faChartPie, empty: !d || neto <= 0,
      emptyMessage: 'Sin importe liquidado.',
      options: {
        series: [porcentaje],
        chart: { type: 'radialBar', height: 282, sparkline: { enabled: true }, toolbar: { show: false },
          fontFamily: 'inherit', background: 'transparent', animations: { enabled: true, speed: 450 } },
        colors: ['#22c55e'],
        plotOptions: { radialBar: { startAngle: -115, endAngle: 115, hollow: { size: '66%', background: 'transparent' },
          track: { background: '#64748b25', strokeWidth: '98%', margin: 0 },
          dataLabels: { name: { show: true, offsetY: 28, color: '#94a3b8', fontSize: '12px' },
            value: { show: true, offsetY: -14, color: '#22c55e', fontSize: '31px', fontWeight: 800,
              formatter: value => `${Number(value).toFixed(1)}%` } } } },
        stroke: { lineCap: 'round' }, labels: ['Pagado'],
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: .2,
          gradientToColors: ['#14b8a6'], opacityFrom: 1, opacityTo: 1, stops: [0, 100] } },
        tooltip: { enabled: false }, legend: { show: false },
      },
    };
  });

  readonly jabasChart = computed<ChartCardData>(() => {
    const data = this.jabas();
    const promedio = data.length ? this.totalPeso() / data.length : 0;
    return {
      title: 'Peso neto por jaba', icon: faChartLine, empty: data.length === 0,
      emptyMessage: 'Sin pesajes disponibles.',
      options: {
        series: [{ name: 'Peso neto', data: data.map(j => Number((j.pesoNeto ?? 0).toFixed(3))) }],
        chart: { type: 'area', height: 282, background: 'transparent', toolbar: { show: false },
          fontFamily: 'inherit', zoom: { enabled: false }, animations: { enabled: true, speed: 500 } },
        colors: ['#38bdf8'],
        stroke: { curve: 'smooth', width: 3 }, markers: { size: data.length <= 12 ? 4 : 0,
          strokeWidth: 2, strokeColors: '#0b1220', colors: ['#38bdf8'], hover: { sizeOffset: 3 } },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: .45, opacityTo: .035,
          stops: [0, 88, 100] } },
        grid: { borderColor: '#64748b2c', strokeDashArray: 4, padding: { left: 8, right: 15, top: 8 } },
        xaxis: { categories: data.map(j => `#${j.numero}`), axisBorder: { show: false }, axisTicks: { show: false },
          labels: { style: { colors: '#94a3b8', fontSize: '10px' }, rotate: 0, hideOverlappingLabels: true } },
        yaxis: { min: 0, labels: { formatter: value => `${value.toFixed(1)}`, style: { colors: '#94a3b8' } } },
        annotations: data.length ? { yaxis: [{ y: promedio, borderColor: '#fbbf24', strokeDashArray: 5,
          label: { text: `Prom. ${promedio.toFixed(2)} kg`, style: { color: '#111827', background: '#fbbf24' } } }] } : undefined,
        dataLabels: { enabled: false }, legend: { show: false },
        tooltip: { theme: 'dark', y: { formatter: value => `${Number(value).toFixed(3)} kg` } },
      },
    };
  });

  ngOnInit(): void {
    if(!this.permission.hasAll(['APAPPSS_PAGOS_VER','PAGOS_VER','LIQUIDACIONES_VER','PAGOS_LISTAR'])) {
      this.error.set('Sin permiso para consultar el detalle.'); return;
    }
    this.load();
  }
  load(): void {
    if (!Number.isSafeInteger(this.liquidacionId) || this.liquidacionId <= 0) {
      this.error.set('Liquidación no válida.'); return;
    }
    this.loading.set(true); this.error.set(null);
    this.api.liquidacion(this.liquidacionId).pipe(
      switchMap(d => forkJoin({
        beneficiario: this.extras.beneficiario(this.liquidacionId).pipe(catchError(() => of(null))),
        entregas: d.participacionId ? this.extras.entregas(d.participacionId).pipe(catchError(() => of(null))) : of(null),
        venta: this.campaniaId > 0 ? this.saleApi.detail(this.campaniaId).pipe(
          map(v => (v.socios ?? []).find(s => s.participacionId === d.participacionId) ?? null),
          catchError(() => of(null))) : of(null),
      }).pipe(map(extra => ({ d, ...extra })))),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: x => { this.liquidacion.set(x.d); this.beneficiario.set(x.beneficiario);
        this.entregas.set(x.entregas); this.venta.set(x.venta); },
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }
  avg(value: number | null | undefined): number {
    const kg = this.liquidacion()?.kilogramos ?? 0;
    return kg > 0 ? (value ?? 0) / kg : 0;
  }
}
