import { inject, Injectable } from '@angular/core';
import { filter, map, switchMap } from 'rxjs';
import { DocumentoEvidenciaRegistro, EvidenceStorageEvent } from '../../domain/documento-evidencia.model';
import { EvidenciaContexto } from '../../domain/evidencia-contexto.model';
import { DOCUMENTOS_EVIDENCIAS_GATEWAY, DocumentosEvidenciasGateway } from '../port/out/documentos-evidencias.gateway';
import { EVIDENCE_STORAGE_GATEWAY, EvidenceStorageGateway } from '../port/out/evidence-storage.gateway';

export interface UploadEvidenceInput {
  file: File;
  tipoEvidencia: string;
  categoria: DocumentoEvidenciaRegistro['categoria'];
  descripcion?: string;
  fechaCaptura?: string;
  latitudCaptura?: number;
  longitudCaptura?: number;
  contexto: EvidenciaContexto;
}

@Injectable()
export class SubirDocumentoEvidenciaUseCase {
  private readonly storage: EvidenceStorageGateway = inject(EVIDENCE_STORAGE_GATEWAY);
  private readonly gateway: DocumentosEvidenciasGateway = inject(DOCUMENTOS_EVIDENCIAS_GATEWAY);

  execute(input: UploadEvidenceInput) {
    return this.storage.upload(input.file).pipe(
      filter((event): event is Extract<EvidenceStorageEvent, { kind: 'completed' }> => event.kind === 'completed'),
      switchMap(({ result }) => {
        const registration: DocumentoEvidenciaRegistro = {
          nombreOriginal: result.originalName,
          mimeType: result.mimeType,
          cloudinaryPublicId: result.publicId,
          secureUrl: result.secureUrl,
          tamanoBytes: result.bytes,
          tipoEvidencia: input.tipoEvidencia,
          categoria: input.categoria,
          origenCaptura: 'CARGA',
          descripcion: input.descripcion,
          fechaCaptura: input.fechaCaptura,
          latitudCaptura: input.latitudCaptura,
          longitudCaptura: input.longitudCaptura,
          contexto: input.contexto,
        };
        return this.gateway.register(registration);
      }),
      map((archivoId) => ({ archivoId })),
    );
  }

  uploadEvents(file: File) { return this.storage.upload(file); }
}
