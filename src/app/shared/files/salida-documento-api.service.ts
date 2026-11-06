import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IdempotencyKeyService } from '../../core/http/services/idempotency-key.service';
import { ApiEnvelope, unwrapApiResponse } from '../../infrastructure/openapi/api-response-unwrapper';
import { LocalDocumentApiService } from './local-document-api.service';

export interface DocumentoSalida {
  archivoId: number;
  salidaId: number;
  salidaNombre: string;
  nombreOriginal: string;
  mimeType: string;
  tipo: 'SOLICITUD_GENERADA' | 'SOLICITUD_FIRMADA' | 'EVIDENCIA_SALIDA';
  fechaCarga: string;
  tamanoBytes: number;
}
export interface ObservacionEntrega {
  solicitudRecursoId: number;
  observacion: string;
}

@Injectable({ providedIn: 'root' })
export class SalidaDocumentoApiService {
  private readonly http = inject(HttpClient);
  private readonly keys = inject(IdempotencyKeyService);
  private readonly files = inject(LocalDocumentApiService);
  private readonly root = `${environment.apiBaseUrl}/api/v1/salidas-operativas`;

  misDocumentos(uotId?: number) {
    const params = uotId ? new HttpParams().set('uotId', uotId) : new HttpParams();
    return this.http.get<ApiEnvelope<DocumentoSalida[]>>(`${this.root}/documentos/mios`, { params })
      .pipe(map(response => unwrapApiResponse<DocumentoSalida[]>(response) ?? []));
  }
  listar(uotId: number, salidaId: number) {
    return this.http.get<ApiEnvelope<DocumentoSalida[]>>(`${this.root}/${salidaId}/documentos`,
      { params: new HttpParams().set('uotId', uotId) })
      .pipe(map(response => unwrapApiResponse<DocumentoSalida[]>(response) ?? []));
  }
  generar(uotId: number, salidaId: number) {
    return this.http.post<ApiEnvelope<DocumentoSalida>>(`${this.root}/${salidaId}/documentos/generar`, {},
      { params: new HttpParams().set('uotId', uotId) })
      .pipe(map(response => unwrapApiResponse<DocumentoSalida>(response)));
  }
  adjuntar(uotId: number, salidaId: number, file: File, tipo: 'SOLICITUD_FIRMADA' | 'EVIDENCIA_SALIDA') {
    const body = new FormData();
    body.append('archivo', file, file.name);
    body.append('tipo', tipo);
    return this.http.post<ApiEnvelope<DocumentoSalida>>(`${this.root}/${salidaId}/documentos/adjuntar`, body,
      { params: new HttpParams().set('uotId', uotId),
        headers: new HttpHeaders({ 'X-Idempotency-Key': this.keys.create() }) })
      .pipe(map(response => unwrapApiResponse<DocumentoSalida>(response)));
  }
  registrarEstadoEntrega(uotId: number, salidaId: number, recursos: ObservacionEntrega[]) {
    return this.http.post<ApiEnvelope<void>>(`${this.root}/${salidaId}/entrega-observaciones`, { recursos },
      { params: new HttpParams().set('uotId', uotId) }).pipe(map(response => unwrapApiResponse<void>(response)));
  }
  contenido(archivoId: number) { return this.files.content(archivoId); }
  descargar(documento: DocumentoSalida): void {
    this.contenido(documento.archivoId).subscribe(blob => {
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');anchor.href=url;
      anchor.download=documento.nombreOriginal||`salida-${documento.salidaId}`;
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
    });
  }
}
