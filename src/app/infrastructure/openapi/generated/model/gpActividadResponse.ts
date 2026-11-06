import { GpRubro } from './gpRubro';
export interface GpActividadResponse {
  actividadId: number; parcelaId: number; predioId: number; rubro: GpRubro;
  cultivoId?: number | null; especieId?: number | null; variedadId?: number | null; variedadNombre?: string | null;
  nombre: string; fechaInicio: string; estado: boolean; estadoProceso?: 'ACTIVA' | 'FINALIZADA';
  cantidadAproximada?: number | null; cantidadExacta?: number | null;
  superficieAproximadaM2?: number | null; superficieExactaM2?: number | null;
  versionActualId?: number | null; fechaUltimoCenso?: string | null;
}
