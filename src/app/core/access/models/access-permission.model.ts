export interface AccessPermission {
  permisoId: number | null;
  moduloId: number | null;
  codigoModulo: string | null;
  codigo: string;
  nombre: string | null;
  descripcion: string | null;
  accion: string | null;
  sensible: boolean;
  requiereMotivo: boolean;
}
