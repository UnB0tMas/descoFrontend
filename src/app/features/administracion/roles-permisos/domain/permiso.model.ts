export interface Permiso {
  permisoId: number;
  codigo: string;
  nombre: string;
  accion: string | null;
  esSensible: boolean;
  requiereMotivo: boolean;
  moduloCodigo: string;
  moduloNombre: string;
  estado: boolean;
}
