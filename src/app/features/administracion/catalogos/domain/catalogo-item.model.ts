export interface CatalogoItem {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  estado: boolean;
  cantidadUso: number;
  enUso: boolean;
}

export interface CatalogoItemCreate {
  catalogo: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
}

export interface CatalogoItemUpdate {
  catalogo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
}
