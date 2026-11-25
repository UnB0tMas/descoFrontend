import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { BASE_PATH } from '../../../../../../infrastructure/openapi/generated';
import { UotContextStore } from '../../../../../../features/uot/state/uot-context.store';
import { BrowserFileDownloadService } from '../../../../../../shared/files/browser-file-download.service';

export type ReportArea = 'POS' | 'TECNICA' | 'RECURSOS' | 'DOCUMENTOS';
export interface ExcelReport { codigo: string; nombre: string; grupo: ReportArea; descripcion: string; }
export interface ExcelJob { id: number; codigo: string; estado: 'PENDIENTE' | 'PROCESANDO' | 'LISTO' | 'ERROR';
  desde: string; hasta: string; creadoUtc: string; filas: number | null; mensaje: string | null; visto: boolean; }
export interface SelectOption { id: number; nombre: string; }
export interface ExcelFilters { codigo: string; desde: string; hasta: string; almacenId?: number; predioId?: number; clave: string; }
interface Response<T> { exitoso: boolean; mensaje: string; datos: T; }

@Injectable({ providedIn: 'root' })
export class ExcelReportService {
  private readonly http = inject(HttpClient);
  private readonly uot = inject(UotContextStore);
  private readonly files = inject(BrowserFileDownloadService);
  private readonly base = String(inject(BASE_PATH)).replace(/\/$/, '') + '/api/v1/reportes/excel';
  readonly trabajos = signal<readonly ExcelJob[]>([]);
  readonly listos = computed(() => this.trabajos().filter(j => j.estado === 'LISTO' && !j.visto));
  constructor() { effect(() => { this.uot.selectedId(); this.trabajos.set([]); }); }
  nombre(codigo: string): string {
    const nombres: Record<string,string> = {
      POS_VENTAS: 'Ventas realizadas', POS_DETALLE: 'Detalle de productos vendidos',
      TEC_VISITAS: 'Visitas técnicas', TEC_SALIDAS: 'Salidas de campo',
      TEC_SANIDAD: 'Casos fitosanitarios', REC_MOVIMIENTOS: 'Movimientos de inventario',
      REC_PRODUCTOS: 'Movimientos por producto', DOC_EVIDENCIAS: 'Evidencias registradas',
      DOC_CORRESPONDENCIA: 'Correspondencia interna',
    };
    return nombres[codigo] ?? 'Informe';
  }
  catalogo(): Observable<readonly ExcelReport[]> {
    return this.http.get<Response<ExcelReport[]>>(this.base + '/catalogo').pipe(map(r => r.datos ?? []));
  }
  segmentadores(): Observable<{ almacenes: SelectOption[]; predios: SelectOption[] }> {
    return this.http.get<Response<{ almacenes: SelectOption[]; predios: SelectOption[] }>>(this.base + '/segmentadores')
      .pipe(map(r => r.datos ?? { almacenes: [], predios: [] }));
  }
  generar(data: ExcelFilters): Observable<ExcelJob> {
    return this.http.post<Response<ExcelJob>>(this.base + '/trabajos', data).pipe(map(r => r.datos));
  }
  actualizar(): Observable<readonly ExcelJob[]> {
    const unidad = this.uot.selectedId();
    return this.http.get<Response<ExcelJob[]>>(this.base + '/trabajos').pipe(
      map(r => r.datos ?? []), tap(items => { if (this.uot.selectedId() === unidad) this.trabajos.set(items); }));
  }
  private confirmarDescarga(id: number): Observable<unknown> {
    return this.http.post(this.base + '/trabajos/' + id + '/confirmar-descarga', {});
  }
  descargar(job: ExcelJob): Observable<Blob> {
    return this.http.get(this.base + '/trabajos/' + job.id + '/archivo', { responseType: 'blob' });
  }
  guardar(blob: Blob, job: ExcelJob): void {
    this.files.save(blob, 'Reporte-' + this.nombre(job.codigo).replaceAll(' ', '-') + '-' + job.id + '.xlsx');
    // Solo se confirma una vez recibido el Blob completo e iniciada la descarga local.
    this.confirmarDescarga(job.id).subscribe({
      next: () => this.trabajos.update(items => items.filter(item => item.id !== job.id)),
      error: () => this.actualizar().subscribe({ error: () => {} }),
    });
  }
}
