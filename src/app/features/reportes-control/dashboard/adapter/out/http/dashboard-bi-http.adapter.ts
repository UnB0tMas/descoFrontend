import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { BASE_PATH } from '../../../../../../infrastructure/openapi/generated';

export type BiTab = 'POS' | 'TECNICA' | 'RECURSOS' | 'DOCUMENTOS';
export interface BiFilter {
  tab: BiTab;
  desde: string;
  hasta: string;
  almacenId?: number;
  predioId?: number;
}
export interface BiOption { id: number; nombre: string; }
export interface BiSegmenters { contexto: string; almacenes: BiOption[]; predios: BiOption[]; }
export interface BiKpi { codigo: string; titulo: string; valor: number; unidad: string; orden: number; }
export interface BiPoint { grafico: string; categoria: string; serie: string; valor: number; orden: number; }
export interface BiSnapshot {
  desde: string;
  hasta: string;
  tab: BiTab;
  uotId: number;
  indicadores: BiKpi[];
  puntos: BiPoint[];
}
interface ApiEnvelope<T> { exitoso: boolean; codigo: string; mensaje: string; datos: T | null; }

@Injectable({ providedIn: 'root' })
export class DashboardBiHttpAdapter {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BASE_PATH).replace(/\/$/, '');
  private readonly url = `${this.base}/api/v1/reportes/dashboard`;

  segmenters() {
    return this.http.get<ApiEnvelope<BiSegmenters>>(`${this.url}/segmentadores`, {
      transferCache: false,
    }).pipe(map(response => this.unwrap(response)));
  }

  summary(filter: BiFilter) {
    let params = new HttpParams()
      .set('tab', filter.tab)
      .set('desde', filter.desde)
      .set('hasta', filter.hasta);
    if (filter.almacenId !== undefined) params = params.set('almacenId', filter.almacenId);
    if (filter.predioId !== undefined) params = params.set('predioId', filter.predioId);
    return this.http.get<ApiEnvelope<BiSnapshot>>(this.url, {
      params, transferCache: false,
    }).pipe(map(response => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (!response.exitoso || !response.datos) {
      throw new Error(response.mensaje || 'No se pudo cargar la información.');
    }
    return response.datos;
  }
}
