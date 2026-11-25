import { MiSalidaActividad, MisSalidasPagina } from '../../../domain/salida-personal.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { ApiEnvelope, unwrapApiResponse } from '../../../../../../../infrastructure/openapi/api-response-unwrapper';
import { IdempotencyKeyService } from '../../../../../../../core/http/services/idempotency-key.service';
import { CorreccionE2, SolicitudE2 } from '../../../domain/salida-operativa.model';

export interface ContextoSalidaTecnica { habilitado: boolean; tieneAprobador: boolean; autorizacionPropiaAdmin?: boolean; uotId: number; }
export interface VinculoSalidaTecnica { salidaId: number; documentoId: number; hiloId: number; estado: string; uotId: number; }
export interface ResultadoSolicitudTecnica { salidaId: number; documentoId: number; hiloId: number; estado: string; }
export interface ResponsableSalidaTecnica {
  responsableId?: number;
  usuarioId: number;
  usuario?: string;
  funcion: 'APROBADOR' | 'ENTREGA' | 'INSPECTOR';
  prioridad: number;
  suplente: boolean;
  activo: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
}
export interface SolicitudDocumentalE2 extends Omit<SolicitudE2,'borrador'> { archivoIds?: number[]; }

@Injectable({ providedIn: 'root' })
export class SalidasTecnicasApi {
  private readonly http = inject(HttpClient);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly base = `${environment.apiBaseUrl}/api/v1/salidas-tecnicas`;

  private params(uotId: number) { return new HttpParams().set('uotId', uotId); }

  contexto(uotId: number) {
    return this.http.get<ApiEnvelope<ContextoSalidaTecnica>>(`${this.base}/contexto`,
      {params: this.params(uotId)}).pipe(map(r => unwrapApiResponse<ContextoSalidaTecnica>(r)));
  }

  responsables(uotId: number) {
    return this.http.get<ApiEnvelope<ResponsableSalidaTecnica[]>>(`${this.base}/responsables`,
      {params: this.params(uotId)}).pipe(map(r => unwrapApiResponse<ResponsableSalidaTecnica[]>(r) ?? []));
  }

  guardarResponsable(uotId: number, body: ResponsableSalidaTecnica) {
    return this.post<{responsableId:number}>(`${this.base}/responsables`, uotId, body,
      `responsables:${uotId}:${body.usuarioId}:${body.funcion}`);
  }

  solicitar(uotId: number, solicitud: SolicitudDocumentalE2) {
    return this.post<ResultadoSolicitudTecnica>(this.base, uotId, solicitud, `solicitar:${uotId}`);
  }

  enviarBorrador(uotId: number, salidaId: number, solicitud: CorreccionE2) {
    return this.post<ResultadoSolicitudTecnica>(`${this.base}/${salidaId}/enviar-borrador`, uotId,
      {...solicitud, enviar:true}, `enviar:${uotId}:${salidaId}`);
  }

  corregir(uotId: number, salidaId: number, solicitud: CorreccionE2) {
    return this.post<ResultadoSolicitudTecnica>(`${this.base}/${salidaId}/corregir`, uotId,
      solicitud, `corregir:${uotId}:${salidaId}`);
  }

  decidir(uotId: number, salidaId: number, decision: 'APROBADA'|'OBSERVADA'|'RECHAZADA', motivo?: string) {
    return this.post<ResultadoSolicitudTecnica>(`${this.base}/${salidaId}/decision`, uotId,
      {decision, motivo}, `decidir:${uotId}:${salidaId}`);
  }

  cancelar(uotId: number, salidaId: number, motivo: string) {
    return this.post<ResultadoSolicitudTecnica>(`${this.base}/${salidaId}/cancelar`, uotId,
      {motivo}, `cancelar:${uotId}:${salidaId}`);
  }

  expediente(uotId: number, salidaId: number) {
    return this.http.get<ApiEnvelope<VinculoSalidaTecnica>>(`${this.base}/${salidaId}/expediente`,
      {params:this.params(uotId)}).pipe(map(r => unwrapApiResponse<VinculoSalidaTecnica>(r) ?? null));
  }

  expedienteDocumento(uotId: number, documentoId: number) {
    return this.http.get<ApiEnvelope<VinculoSalidaTecnica>>(`${this.base}/documentos/${documentoId}/expediente`,
      {params:this.params(uotId)}).pipe(map(r => unwrapApiResponse<VinculoSalidaTecnica>(r) ?? null));
  }

  misSalidas(uotId: number, filtro: {buscar?: string; estado?: string; pagina: number; tamano: number}) {
    let params = this.params(uotId).set('pagina', filtro.pagina).set('tamano', filtro.tamano);
    if (filtro.buscar) params = params.set('buscar', filtro.buscar);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return this.http.get<ApiEnvelope<MisSalidasPagina>>(`${this.base}/mis-salidas`, {params})
      .pipe(map(r => unwrapApiResponse<MisSalidasPagina>(r)!));
  }

  miActividad(uotId: number, salidaId: number) {
    return this.http.get<ApiEnvelope<MiSalidaActividad>>(
      `${this.base}/mis-salidas/${salidaId}/actividad`, {params: this.params(uotId)})
      .pipe(map(r => unwrapApiResponse<MiSalidaActividad>(r)!));
  }

  private post<T>(url: string, uotId: number, body: unknown, scope: string) {
    return this.keys.idempotent(scope, body, key =>
      this.http.post<ApiEnvelope<T>>(url, body, {
        params:this.params(uotId),
        headers:new HttpHeaders({'X-Idempotency-Key':key})
      }).pipe(map(r => unwrapApiResponse<T>(r)!)));
  }
}
