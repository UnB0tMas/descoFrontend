export interface AccessModule {
  moduloId: number;
  moduloPadreId: number | null;
  codigo: string;
  nombre: string;
  orden: number;
  ruta: string | null;
  icono: string | null;
  visibleMenu: boolean;
  grupo: boolean;
}
