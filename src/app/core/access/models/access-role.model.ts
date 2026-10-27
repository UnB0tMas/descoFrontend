export interface AccessRole {
  rolId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  requiereSegundoFactor: boolean;
}
