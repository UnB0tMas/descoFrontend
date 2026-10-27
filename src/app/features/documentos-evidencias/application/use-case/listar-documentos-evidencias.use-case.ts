import { inject, Injectable } from '@angular/core';
import { EvidenciaFiltro } from '../../domain/evidencia-filtro.model';
import { DOCUMENTOS_EVIDENCIAS_GATEWAY, DocumentosEvidenciasGateway } from '../port/out/documentos-evidencias.gateway';
@Injectable()
export class ListarDocumentosEvidenciasUseCase {
  private readonly gateway: DocumentosEvidenciasGateway = inject(DOCUMENTOS_EVIDENCIAS_GATEWAY);
  execute(filter: EvidenciaFiltro) { return this.gateway.list(filter); }
}
