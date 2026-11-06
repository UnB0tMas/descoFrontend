export type EstadoPlantaE3 = 'SIN_EVALUAR' | 'SANA' | 'ENFERMA' | 'MUERTA';
export type TipoActuacionE3 = 'SANITARIO' | 'PREVENTIVO' | 'PODA' | 'RIEGO' | 'FERTILIZACION' | 'OTRO';
export type TipoProduccionE3 = 'ESTIMACION' | 'COSECHA';
export interface OpcionE3 { id: number; nombre: string; }
export interface CatalogosE3 { variedades: OpcionE3[]; diagnosticos: OpcionE3[]; parcelas: OpcionE3[]; socios: OpcionE3[]; }
export interface ResumenE3 { variedadId: number; variedad: string; cantidad: number; sinEvaluar: number;
 sanas: number; enfermas: number; muertas: number; plantasConEstimacion: number; plantasConCosecha: number;
 estimadoKg: number; realKg: number; }
export interface ResumenParcelaE3 { parcelaCultivoId?: number; variedadId: number; variedad: string; cantidad: number;
 plantasConEstimacion: number; plantasConCosecha: number; estimadoKg: number; realKg: number; }
export interface PlantaE3 { plantaId: number; codigo: string; variedad: string; variedadId: number;
 estado: EstadoPlantaE3; parcelaCultivoId?: number; socioId?: number; version: number; }
export interface PaginaE3 { total: number; items: PlantaE3[]; resumen: ResumenE3[];
 anioResumen: number; resumenParcelas: ResumenParcelaE3[]; }
export interface EventoE3 { eventoId: number; tipo: string; estadoAnterior?: string; estadoNuevo?: string;
 observacion?: string; visitaId?: number; usuarioId?: number; fechaHora?: string; }
export interface EpisodioE3 { episodioId: number; diagnostico: string; diagnosticoId: number;
 inicio?: string; fin?: string; observacion?: string; }
export interface SeguimientoE3 { seguimientoId: number; episodioId?: number; tipo: TipoActuacionE3;
 observacion: string; resultado?: string; eventoId: number; visitaId?: number; usuarioId?: number; fechaHora?: string; }
export interface FichaHistorialE3 { fichaId: number; fechaPlantacion?: string; edadReferenciaAnios?: number;
 fechaReferencia?: string; version: number; usuarioId: number; fechaHora?: string; }
export interface TratamientoE3 { tratamientoId: number; episodioId: number; descripcion: string;
 resultado?: string; fechaHora?: string; visitaId?: number; }
export interface ProduccionE3 { produccionId: number; anio: number; tipo: TipoProduccionE3 | 'LEGADO';
 estimadoKg?: number; realKg?: number; observacion?: string; fechaEvento?: string;
 visitaId?: number; fechaHora?: string; }
export interface ProduccionPeriodoE3 { anio: number; estimadoKg?: number; realKg: number;
 tieneEstimacion: boolean; tieneReal: boolean; }
export interface MedicionE3 { medicionId: number; plantaId: number; porcentaje: number;
 visitaId: number; observacion?: string; fechaHora?: string; usuarioId?: number; }
export interface EvidenciaE3 { archivoId: number; eventoId?: number; nombre: string; mimeType: string;
 url?: string; tipo: string; }
export interface DetalleE3 { plantaId: number; predioId: number; codigo: string; variedad: string;
 variedadId: number; estado: EstadoPlantaE3; socioId?: number; registradoPorUsuarioId?: number;
 registradoEn?: string; fechaPlantacion?: string; edadReferenciaAnios?: number;
 edadActual?: number; version: number; parcelaCultivoId?: number; historial: EventoE3[];
 fichas: FichaHistorialE3[]; episodios: EpisodioE3[]; seguimientos: SeguimientoE3[];
 tratamientos: TratamientoE3[]; producciones: ProduccionE3[];
 produccionResumen: ProduccionPeriodoE3[]; evidencias: EvidenciaE3[]; }
export interface FilaE3 { variedadId: number; cantidad: number; parcelaCultivoId?: number; }
export interface LoteResultadoE3 { total: number; resumen: ResumenE3[]; }
export interface OperacionE3 { plantaId: number; eventoId: number; estado: EstadoPlantaE3; }
export interface AmbitoE3 { uotId: number; convenioId: number; predioId: number; }
export interface FiltrosE3 { buscar?: string; estado?: string; variedadId?: number; pagina: number; tamano: number; }
export interface EstadoE3 { version: number; estado: EstadoPlantaE3; diagnosticoId?: number;
 observacion?: string; visitaId?: number; correccionExcepcional?: boolean; motivoCorreccion?: string; }
export interface FichaE3 { version: number; fechaPlantacion?: string; edadReferenciaAnios?: number; }
export interface TratamientoNuevoE3 { descripcion: string; resultado?: string; visitaId?: number; }
export interface SeguimientoNuevoE3 { observacion: string; tipo?: TipoActuacionE3;
 resultado?: string; visitaId?: number; }
export interface ProduccionNuevaE3 { anio: number; tipo: TipoProduccionE3;
 estimadoKg?: number; realKg?: number; fechaEvento?: string; visitaId?: number; observacion?: string; }
export interface MateriaSecaE3 { porcentaje: number; visitaId: number; observacion?: string; }
export interface ResultadoMasivoE3 { procesadas: number; }
export interface SeguimientoMasivoE3 { plantasIds: number[]; observacion: string; visitaId: number;
 tipo?: TipoActuacionE3; resultado?: string; }
export interface DocumentoPredioE3 { archivoId: number; nombre: string; mimeType: string; url?: string; }
