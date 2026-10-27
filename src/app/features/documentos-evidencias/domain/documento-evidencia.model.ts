import { EvidenciaContexto } from './evidencia-contexto.model';

export type EvidenciaCategoria =
  | 'FOTOGRAFIA'
  | 'DOCUMENTO'
  | 'TICKET'
  | 'COMPROBANTE'
  | 'OTRO';

export type EvidenciaOrigen = 'CARGA' | 'CAMARA';

export interface DocumentoEvidencia {
  archivoId: number;
  nombreOriginal: string;
  mimeType: string;
  secureUrl: string;
  tamanoBytes: number;
  categoria: string | null;
  tipoEvidencia: string;
  origenCaptura: string;
  descripcion: string | null;
  fechaCaptura: string | null;
  latitudCaptura: number | null;
  longitudCaptura: number | null;
  fechaCarga: string | null;
  usuarioId: number | null;
  nombreUsuario: string | null;
  tipoContexto: string | null;
  contextoId: number | null;
}

export interface DocumentoEvidenciaVinculo {
  archivoVinculoId: number;
  tipoContexto: string;
  contextoId: number;
}

export interface DocumentoEvidenciaDetalle extends DocumentoEvidencia {
  cloudinaryPublicId: string;
  vinculos: readonly DocumentoEvidenciaVinculo[];
}

export interface DocumentoEvidenciaRegistro {
  nombreOriginal: string;
  mimeType: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  tamanoBytes: number;
  tipoEvidencia: string;
  categoria?: EvidenciaCategoria;
  origenCaptura: EvidenciaOrigen;
  descripcion?: string;
  fechaCaptura?: string;
  latitudCaptura?: number;
  longitudCaptura?: number;
  contexto: EvidenciaContexto;
}

export interface EvidenceStorageResult {
  publicId: string;
  secureUrl: string;
  bytes: number;
  mimeType: string;
  originalName: string;
}

export type EvidenceStorageEvent =
  | { kind: 'progress'; progress: number }
  | { kind: 'completed'; result: EvidenceStorageResult };
