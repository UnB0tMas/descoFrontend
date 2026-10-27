import { EvidenciaContextoTipo } from './evidencia-contexto.model';

export interface EvidenciaFiltro {
  tipoEvidencia?: string;
  origenCaptura?: 'CARGA' | 'CAMARA';
  usuarioId?: number;
  contextoTipo?: EvidenciaContextoTipo;
  contextoId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page: number;
  size: number;
}
