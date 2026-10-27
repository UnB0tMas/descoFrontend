import { inject, Injectable } from '@angular/core';
import { DOCUMENTOS_EVIDENCIAS_GATEWAY, DocumentosEvidenciasGateway } from '../port/out/documentos-evidencias.gateway';
@Injectable()
export class ObtenerDocumentoEvidenciaUseCase {
  private readonly gateway: DocumentosEvidenciasGateway = inject(DOCUMENTOS_EVIDENCIAS_GATEWAY);
  execute(archivoId: number) { return this.gateway.get(archivoId); }
}
