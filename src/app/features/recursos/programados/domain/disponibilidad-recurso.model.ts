export interface BienDisponible {
  bienInventarioId: number;
  uotId: number;
  uotCodigo: string | null;
  uotNombre: string | null;
  codigoPatrimonial: string;
  nombre: string;
  estadoBien: string;
  disponible: boolean;
}

export interface SuministroDisponible {
  suministroId: number;
  uotId: number;
  uotCodigo: string | null;
  uotNombre: string | null;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  requiereReposicion: boolean;
}

export interface DisponibilidadRecurso {
  bienes: readonly BienDisponible[];
  suministros: readonly SuministroDisponible[];
}
