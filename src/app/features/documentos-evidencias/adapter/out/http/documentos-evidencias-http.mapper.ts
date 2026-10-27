import { inject, Injectable } from '@angular/core';
import { DocumentLinkRequest, DocumentRegisterRequest } from '../../../../../infrastructure/openapi/generated';
import { AdminApiMapper } from '../../../../administracion/shared/admin-api.mapper';
import { DocumentoEvidencia, DocumentoEvidenciaDetalle, DocumentoEvidenciaRegistro } from '../../../domain/documento-evidencia.model';
import { EVIDENCIA_CONTEXTOS } from '../../../domain/evidencia-contexto.model';

@Injectable()
export class DocumentosEvidenciasHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) { return this.api.page(response, (row) => this.summary(row), size); }
  detail(response: unknown): DocumentoEvidenciaDetalle {
    const row = this.api.record(this.api.data<unknown>(response));
    return {
      ...this.summary(row),
      cloudinaryPublicId: this.api.string(row['cloudinaryPublicId']),
      vinculos: this.api.array(row['vinculos']).map((item) => {
        const link = this.api.record(item);
        return {
          archivoVinculoId: this.api.number(link['archivoVinculoId']),
          tipoContexto: this.api.string(link['tipoContexto']),
          contextoId: this.api.number(link['contextoId']),
        };
      }),
    };
  }
  createdId(response: unknown): number {
    const row = this.api.record(this.api.data<unknown>(response));
    return this.api.number(row['archivoId']);
  }
  void(response: unknown): void { this.api.void(response); }

  request(input: DocumentoEvidenciaRegistro): DocumentRegisterRequest {
    return {
      nombreOriginal: input.nombreOriginal,
      mimeType: input.mimeType,
      cloudinaryPublicId: input.cloudinaryPublicId,
      secureUrl: input.secureUrl,
      tamanoBytes: input.tamanoBytes,
      tipoEvidencia: input.tipoEvidencia,
      categoria: input.categoria,
      origenCaptura: input.origenCaptura,
      descripcion: input.descripcion,
      fechaCaptura: input.fechaCaptura,
      latitudCaptura: input.latitudCaptura,
      longitudCaptura: input.longitudCaptura,
      vinculo: this.link(input),
    };
  }

  private link(input: DocumentoEvidenciaRegistro): DocumentLinkRequest {
    const descriptor = EVIDENCIA_CONTEXTOS.find((item) => item.tipo === input.contexto.tipo);
    if (!descriptor || input.contexto.id <= 0) throw new Error('El contexto de la evidencia no es válido.');
    return { [descriptor.campoVinculo]: input.contexto.id } as DocumentLinkRequest;
  }

  private summary(row: Record<string, unknown>): DocumentoEvidencia {
    return {
      archivoId: this.api.number(row['archivoId']),
      nombreOriginal: this.api.string(row['nombreOriginal']),
      mimeType: this.api.string(row['mimeType']),
      secureUrl: this.api.string(row['secureUrl']),
      tamanoBytes: this.api.number(row['tamanoBytes']),
      categoria: this.api.nullableString(row['categoria']),
      tipoEvidencia: this.api.string(row['tipoEvidencia']),
      origenCaptura: this.api.string(row['origenCaptura']),
      descripcion: this.api.nullableString(row['descripcion']),
      fechaCaptura: this.api.nullableString(row['fechaCaptura']),
      latitudCaptura: this.api.nullableNumber(row['latitudCaptura']),
      longitudCaptura: this.api.nullableNumber(row['longitudCaptura']),
      fechaCarga: this.api.nullableString(row['fechaCarga']),
      usuarioId: this.api.nullableNumber(row['usuarioId']),
      nombreUsuario: this.api.nullableString(row['nombreUsuario']),
      tipoContexto: this.api.nullableString(row['tipoContexto']),
      contextoId: this.api.nullableNumber(row['contextoId']),
    };
  }
}
