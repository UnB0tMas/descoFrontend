import { LocalDocumentApiService } from '../../../../shared/files/local-document-api.service';
import { UotContextStore } from '../../../uot/state/uot-context.store';
import { runtimeCloudinaryEvidenceStorageConfig } from '../../adapter/out/storage/cloudinary-evidence-storage.adapter';
import { inject, Injectable } from '@angular/core';
import { defer, filter, map, switchMap } from 'rxjs';
import { DocumentoEvidenciaRegistro, EvidenceStorageEvent } from '../../domain/documento-evidencia.model';
import { EvidenciaContexto } from '../../domain/evidencia-contexto.model';
import { DOCUMENTOS_EVIDENCIAS_GATEWAY, DocumentosEvidenciasGateway } from '../port/out/documentos-evidencias.gateway';
import { EVIDENCE_STORAGE_GATEWAY, EvidenceStorageGateway } from '../port/out/evidence-storage.gateway';

export interface RegisterPhotoEvidenceInput {
  file: File;
  tipoEvidencia: string;
  descripcion?: string;
  fechaCaptura: string;
  latitudCaptura?: number;
  longitudCaptura?: number;
  contexto: EvidenciaContexto;
}

@Injectable()
export class RegistrarFotografiaUseCase {
  private readonly storage: EvidenceStorageGateway = inject(EVIDENCE_STORAGE_GATEWAY);
  private readonly gateway: DocumentosEvidenciasGateway = inject(DOCUMENTOS_EVIDENCIAS_GATEWAY);

  private readonly local = inject(LocalDocumentApiService);
  private readonly uot = inject(UotContextStore);

  execute(input: RegisterPhotoEvidenceInput) {
    return defer(() => {
      const config=runtimeCloudinaryEvidenceStorageConfig();
      if(!config.cloudName || !config.uploadPreset) {
        const uotId=this.uot.selectedId();
        if(!uotId) throw new Error('Selecciona una UOT antes de subir la evidencia.');
        return this.local.upload({uotId,file:input.file,category:'FOTOGRAFIA',description:input.descripcion,
          linkType:input.contexto.tipo,linkId:input.contexto.id,
          evidence:{tipo:input.tipoEvidencia,origen:'CAMARA',fecha:input.fechaCaptura,latitud:input.latitudCaptura,longitud:input.longitudCaptura}
        }).pipe(map(file=>({archivoId:file.archivoId!})));
      }
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
          categoria: 'FOTOGRAFIA',
          origenCaptura: 'CAMARA',
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
    });
  }
}
