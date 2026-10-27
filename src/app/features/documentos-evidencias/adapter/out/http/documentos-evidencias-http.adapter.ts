import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { IdempotencyKeyService } from '../../../../../core/http/services/idempotency-key.service';
import { DocumentosYEvidenciasService, DocumentRetireRequest } from '../../../../../infrastructure/openapi/generated';
import { DocumentosEvidenciasGateway } from '../../../application/port/out/documentos-evidencias.gateway';
import { DocumentoEvidenciaRegistro } from '../../../domain/documento-evidencia.model';
import { EvidenciaFiltro } from '../../../domain/evidencia-filtro.model';
import { DocumentosEvidenciasHttpMapper } from './documentos-evidencias-http.mapper';

@Injectable()
export class DocumentosEvidenciasHttpAdapter implements DocumentosEvidenciasGateway {
  private readonly api = inject(DocumentosYEvidenciasService);
  private readonly mapper = inject(DocumentosEvidenciasHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: EvidenciaFiltro) {
    return this.api.documentosListar({
      tipoEvidencia: filter.tipoEvidencia,
      origenCaptura: filter.origenCaptura,
      usuarioId: filter.usuarioId,
      contextoTipo: filter.contextoTipo,
      contextoId: filter.contextoId,
      fechaDesde: filter.fechaDesde,
      fechaHasta: filter.fechaHasta,
      pagina: filter.page,
      tamano: filter.size,
    }, 'body', false, { transferCache: false }).pipe(map((response) => this.mapper.page(response, filter.size)));
  }

  get(archivoId: number) {
    return this.api.documentosVer({ archivoId }, 'body', false, { transferCache: false })
      .pipe(map((response) => this.mapper.detail(response)));
  }

  register(input: DocumentoEvidenciaRegistro) {
    return this.api.documentosRegistrar({
      xIdempotencyKey: this.idempotency.create(),
      documentRegisterRequest: this.mapper.request(input),
    }, 'body', false, { transferCache: false }).pipe(map((response) => this.mapper.createdId(response)));
  }

  retire(archivoId: number, motivo: string) {
    const documentRetireRequest: DocumentRetireRequest = { motivo };
    return this.api.documentosRetirar({
      archivoId,
      xIdempotencyKey: this.idempotency.create(),
      documentRetireRequest,
    }, 'body', false, { transferCache: false }).pipe(map((response) => this.mapper.void(response)));
  }
}
