import { GpVariedadSuperficie } from './gpVariedadSuperficie';
import { GpRazaConteo } from './gpRazaConteo';
export interface GpCensoResponse {
  censoId: number; actividadId: number; cantidadAproximada?: number | null;
  cantidadExacta?: number | null;
  superficieAproximadaM2?: number | null; superficieExactaM2?: number | null;
  razas?: GpRazaConteo[]; variedades?: GpVariedadSuperficie[]; fecha: string; observacion?: string | null;
  fechaRegistro: string; usuarioId: number;
}
