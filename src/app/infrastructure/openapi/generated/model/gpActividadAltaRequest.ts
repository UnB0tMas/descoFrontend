import { GpVariedadSuperficie } from './gpVariedadSuperficie';
import { GpRubro } from './gpRubro';
import { GpRazaConteo } from './gpRazaConteo';
/** Agricultura se mide en m²; crianza, por número de animales. */
export interface GpActividadAltaRequest {
  parcelaId: number; rubro: GpRubro; cultivoId?: number | null; especieId?: number | null; variedadId?: number | null;
  cantidadAproximada?: number | null; cantidadExacta?: number | null;
  superficieAproximadaM2?: number | null; superficieExactaM2?: number | null;
  razas?: GpRazaConteo[] | null; variedades?: GpVariedadSuperficie[] | null;
}
