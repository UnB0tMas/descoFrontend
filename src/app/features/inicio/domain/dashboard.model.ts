import { AccesoRapido } from './acceso-rapido.model';
import { AlertaDashboard } from './alerta.model';
import { DashboardChart } from './grafico-dashboard.model';
import { Indicador } from './indicador.model';

export interface DashboardPeriod {
  desde: string;
  hasta: string;
}

export interface Dashboard {
  periodo: DashboardPeriod;
  indicadores: readonly Indicador[];
  graficos: readonly DashboardChart[];
  alertas: readonly AlertaDashboard[];
  accesosRapidos: readonly AccesoRapido[];
}

export const EMPTY_DASHBOARD: Dashboard = {
  periodo: {
    desde: '',
    hasta: '',
  },
  indicadores: [],
  graficos: [],
  alertas: [],
  accesosRapidos: [],
};
