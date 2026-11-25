import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { map, tap } from 'rxjs';
import { BASE_PATH } from '../../../../../../../../infrastructure/openapi/generated';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { BrowserFileDownloadService } from '../../../../../../../../shared/files/browser-file-download.service';

export type ApTab = 'SOCIOS' | 'PREDIOS' | 'CAMPANIAS' | 'VENTAS' | 'COMPRADORES' | 'LIQUIDACIONES' | 'PAGOS';
export interface ApOption { id: number; nombre: string; }
export interface ApOptions { convenios: ApOption[]; socios: ApOption[]; predios: ApOption[]; campanias: ApOption[]; }
export interface ApKpi { codigo: string; titulo: string; valor: number; unidad: string; orden: number; }
export interface ApPoint { grafico: string; categoria: string; serie: string; valor: number; orden: number; }
export interface ApSnapshot { tab: ApTab; desde: string; hasta: string; convenioId: number; indicadores: ApKpi[]; puntos: ApPoint[]; }
interface ApiResponse<T> { exitoso: boolean; mensaje: string; datos: T | null; }
export interface ApFilters { tab: ApTab; desde: string; hasta: string; convenioId: number; socioId?: number; predioId?: number; campaniaId?: number; }

@Injectable({ providedIn: 'root' })
export class ApappssInsightsService {
  private readonly http = inject(HttpClient);
  private readonly base = String(inject(BASE_PATH)).replace(/\/$/, '') + '/api/v1/reportes/apappss';
  filtros(convenioId?: number) { return this.http.get<ApiResponse<ApOptions>>(this.base + '/filtros', { params: convenioId === undefined ? new HttpParams() : new HttpParams().set('convenioId', convenioId), transferCache: false }).pipe(
    map(r => { if (!r.exitoso || !r.datos) throw new Error(r.mensaje); return r.datos; })); }
  resumen(f: ApFilters) {
    let params = new HttpParams().set('tab', f.tab).set('desde', f.desde).set('hasta', f.hasta).set('convenioId', f.convenioId);
    if (f.socioId) params = params.set('socioId', f.socioId);
    if (f.predioId) params = params.set('predioId', f.predioId);
    if (f.campaniaId) params = params.set('campaniaId', f.campaniaId);
    return this.http.get<ApiResponse<ApSnapshot>>(this.base + '/resumen', { params, transferCache: false }).pipe(
      map(r => { if (!r.exitoso || !r.datos) throw new Error(r.mensaje); return r.datos; }));
  }
}

export type EspecialArea = 'APAPPSS' | 'TECNICA';
export interface EspecialItem { codigo: string; nombre: string; grupo: EspecialArea; }
export interface EspecialJob { id: number; tipo: string; formato: 'PDF' | 'DOCX' | 'XLSX';
  estado: 'PENDIENTE' | 'PROCESANDO' | 'LISTO' | 'ERROR'; desde: string; hasta: string;
  creadoUtc: string; mensaje?: string; visto: boolean; }
export interface EspecialRequest { tipo: string; formato: string; desde: string; hasta: string; clave: string;
  convenioId?: number; socioId?: number; predioId?: number; campaniaId?: number; }

@Injectable({ providedIn: 'root' })
export class EspecialReportService {
  private readonly http = inject(HttpClient);
  private readonly base = String(inject(BASE_PATH)).replace(/\/$/, '') + '/api/v1/reportes/especiales';
  private readonly uot = inject(UotContextStore);
  private readonly files = inject(BrowserFileDownloadService);
  readonly trabajos = signal<readonly EspecialJob[]>([]);
  readonly listos = computed(() => this.trabajos().filter(x => x.estado === 'LISTO' && !x.visto));
  constructor() { effect(() => { this.uot.selectedId(); this.trabajos.set([]); }); }
  catalogo() { return this.http.get<ApiResponse<EspecialItem[]>>(this.base + '/catalogo').pipe(map(r => r.datos ?? [])); }
  filtros() { return this.http.get<ApiResponse<ApOptions>>(this.base + '/filtros').pipe(map(r => r.datos ?? {convenios:[], socios:[], predios:[], campanias:[]})); }
  generar(req: EspecialRequest) { return this.http.post<ApiResponse<{id:number}>>(this.base + '/trabajos', req).pipe(map(r => r.datos)); }
  actualizar() { const selected = this.uot.selectedId(); return this.http.get<ApiResponse<EspecialJob[]>>(this.base + '/trabajos').pipe(
    map(r => r.datos ?? []), tap(jobs => {if(this.uot.selectedId() === selected) this.trabajos.set(jobs);})); }
  descargar(job: EspecialJob) { return this.http.get(this.base + '/trabajos/' + job.id + '/archivo', { responseType: 'blob' }); }
  guardar(blob: Blob, job: EspecialJob) {
    this.files.save(blob, 'Informe-' + job.tipo + '-' + job.id + '.' + job.formato.toLowerCase());
    this.http.post(this.base + '/trabajos/' + job.id + '/confirmar-descarga', {}).subscribe({
      next: () => this.trabajos.update(items => items.filter(item => item.id !== job.id)),
      error: () => this.actualizar().subscribe({ error: () => {} }),
    });
  }
}
