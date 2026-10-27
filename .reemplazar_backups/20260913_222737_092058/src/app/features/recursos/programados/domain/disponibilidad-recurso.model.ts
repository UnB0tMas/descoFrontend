export interface BienDisponible {
  bienInventarioId: number;
  codigoPatrimonial: string;
  nombre: string;
  estadoBien: string;
  disponible: boolean;
}

export interface SuministroDisponible {
  suministroId: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockDisponible: number;
}

export interface DisponibilidadRecurso {
  bienes: readonly BienDisponible[];
  suministros: readonly SuministroDisponible[];
}
