import { DecimalPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ModalShellComponent } from '../../../../../shared/feedback/modal-shell/modal-shell';
import { DataTableComponent } from '../../../../../shared/data-display/data-table/data-table';
import { PaginatorComponent } from '../../../../../shared/data-display/paginator/paginator';
import { DataTableColumn } from '../../../../../shared/data-display/data-table/data-table.types';
import { IsolatedPrintService } from '../../../../../shared/printing/isolated-print.service';
import { ToastService } from '../../../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { CajaArqueo, CajaPosApiService } from '../../caja-pos-api.service';

interface BalanceRow {
  id: string; ventaId: number; fecha: string; estado: string;
  medio: string; codigo: string; total: number | null; importe: number;
}

/** Vista de arqueo de un único turno. Utiliza los elementos visuales de shared. */
@Component({
  selector: 'app-caja-arqueo-panel', standalone: true,
  imports: [DecimalPipe, DatePipe, UpperCasePipe, FormsModule, ModalShellComponent, DataTableComponent, PaginatorComponent],
  templateUrl: './caja-arqueo-panel.html', styleUrl: './caja-arqueo-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaArqueoPanelComponent {
  @ViewChild(ModalShellComponent) private dialog?: ModalShellComponent;
  @ViewChild('ticket') private ticket?: ElementRef<HTMLElement>;
  private readonly api = inject(CajaPosApiService);
  private readonly printer = inject(IsolatedPrintService);
  private readonly toast = inject(ToastService);
  readonly reporte = signal<CajaArqueo | null>(null);
  readonly uotIdActivo = signal(0);
  readonly filtro = signal('TODOS');
  readonly buscar = signal('');
  readonly loading = signal(false);
  readonly pagina = signal(1);
  readonly tamanoPagina = signal(10);
  readonly paginas = computed(() => Math.ceil(this.filas().length / this.tamanoPagina()));
  readonly paginaVisible = computed(() => Math.min(this.pagina(), Math.max(1, this.paginas())));
  readonly filasPaginadas = computed(() => {
    const desde = (this.paginaVisible() - 1) * this.tamanoPagina();
    return this.filas().slice(desde, desde + this.tamanoPagina());
  });
  cambiarPagina(pagina: number): void { this.pagina.set(pagina); }
  cambiarTamano(tamano: number): void { this.tamanoPagina.set(tamano); this.pagina.set(1); }
  cambiarFiltro(valor: string): void { this.filtro.set(valor); this.pagina.set(1); }
  cambiarBusqueda(valor: string): void { this.buscar.set(valor); this.pagina.set(1); }

  readonly error = signal<string | null>(null);
  readonly columns: readonly DataTableColumn<BalanceRow>[] = [
    { key: 'ventaId', label: 'Venta', format: v => `#${v}` },
    { key: 'fecha', label: 'Hora', format: v => String(v).replace('T', ' ').slice(11, 16) },
    { key: 'estado', label: 'Estado' },
    { key: 'medio', label: 'Medio de pago' },
    { key: 'total', label: 'Venta PEN', align: 'right', format: v => v === null ? '—' : Number(v).toFixed(2) },
    { key: 'importe', label: 'Pagado PEN', align: 'right', format: v => Number(v).toFixed(2) },
  ];
  readonly filas = computed(() => {
    const r = this.reporte();
    const term = this.buscar().trim().toLowerCase();
    if (!r) return [] as BalanceRow[];
    const rows: BalanceRow[] = [];
    for (const v of r.ventas) {
      if (!v.pagos.length) {
        rows.push({id: `${v.ventaId}-0`, ventaId: v.ventaId, fecha: v.fecha,
          estado: v.estado, medio: 'Sin pago', codigo: 'SIN_PAGO', total: v.total, importe: 0});
      }
      v.pagos.forEach((p, i) => rows.push({id: `${v.ventaId}-${i}`, ventaId: v.ventaId,
        fecha: v.fecha, estado: v.estado, medio: p.nombre, codigo: p.codigo,
        total: i === 0 ? v.total : null, importe: p.importe}));
    }
    return rows.filter(x => (this.filtro() === 'TODOS' || x.codigo === this.filtro()) &&
      (!term || String(x.ventaId).includes(term) || x.medio.toLowerCase().includes(term)));
  });
  readonly totalFiltrado = computed(() => this.filas().reduce((sum, item) => sum + item.importe, 0));
  readonly estadoCaja = computed(() => {
    const r = this.reporte();
    if (!r || r.diferencia === null) return 'Sin cerrar';
    if (r.diferencia > 0) return 'Sobrante';
    if (r.diferencia < 0) return 'Faltante';
    return 'Caja cuadrada';
  });

  cerrarModal(): void { this.dialog?.close(); }

  simular(sesionId: number, uotId: number): void {
    if (this.loading()) return;
    this.error.set(null); this.loading.set(true); this.uotIdActivo.set(uotId);
    this.api.arqueo(sesionId, uotId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: balance => {
        if (!balance) return;
        this.reporte.set(balance); this.filtro.set('TODOS'); this.buscar.set(''); this.pagina.set(1);
        this.dialog?.open();
      },
      error: e => {this.error.set(mapOpenApiError(e).message);this.toast.error('No se pudo consultar el balance.');},
    });
  }

  imprimirCierre(sesionId: number, uotId: number): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set(null); this.uotIdActivo.set(uotId);
    this.api.arqueo(sesionId, uotId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: balance => {
        if (!balance || balance.estado !== 'CERRADA') return;
        this.reporte.set(balance);
        // Permite que Angular actualice el comprobante antes de enviarlo a impresión.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (this.reporte()?.sesionId === sesionId && this.ticket) {
            this.printer.printElement(this.ticket.nativeElement, 80);
          }
        }));
      },
      error: e => {this.error.set(mapOpenApiError(e).message);this.toast.error('No se pudo generar el comprobante.');},
    });
  }

  descargarPdf(sesionId: number, uotId: number): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.api.arqueoPdf(sesionId, uotId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `cierre-caja-${sesionId}.pdf`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => this.toast.error('No se pudo descargar el documento.'),
    });
  }
}
