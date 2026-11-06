import { GpVariedadSuperficie } from './gpVariedadSuperficie';
import { GpRazaConteo } from './gpRazaConteo';
export interface GpCensoAltaRequest {
  cantidadAproximada?: number | null; cantidadExacta?: number | null;
  superficieAproximadaM2?: number | null; superficieExactaM2?: number | null;
  razas?: GpRazaConteo[] | null; variedades?: GpVariedadSuperficie[] | null;
  observacion: string; versionAnteriorId?: number | null;
}
