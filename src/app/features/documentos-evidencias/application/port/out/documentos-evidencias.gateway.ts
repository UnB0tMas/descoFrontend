import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../shared/models/page-result.model';
import {
  DocumentoEvidencia,
  DocumentoEvidenciaDetalle,
  DocumentoEvidenciaRegistro,
} from '../../../domain/documento-evidencia.model';
import { EvidenciaFiltro } from '../../../domain/evidencia-filtro.model';

export interface DocumentosEvidenciasGateway {
  list(filter: EvidenciaFiltro): Observable<PageResult<DocumentoEvidencia>>;
  get(archivoId: number): Observable<DocumentoEvidenciaDetalle>;
  register(input: DocumentoEvidenciaRegistro): Observable<number>;
  retire(archivoId: number, motivo: string): Observable<void>;
}

export const DOCUMENTOS_EVIDENCIAS_GATEWAY =
  new InjectionToken<DocumentosEvidenciasGateway>('DOCUMENTOS_EVIDENCIAS_GATEWAY');
