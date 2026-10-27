export interface Area {
  areaId: number;
  empresaId: number;
  empresa: string;
  areaPadreId: number | null;
  areaPadre: string | null;
  codigo: string;
  nombre: string;
  estado: boolean;
}

export interface AreaCreate {
  empresaId: number;
  areaPadreId?: number;
  codigo: string;
  nombre: string;
}

export interface AreaUpdate {
  areaPadreId?: number;
  nombre: string;
}
