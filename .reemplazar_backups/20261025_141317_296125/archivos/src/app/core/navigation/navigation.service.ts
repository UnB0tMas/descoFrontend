import { computed, inject, Injectable } from '@angular/core';

import { AccessStore } from '../access/access.store';
import { AccessModule } from '../access/models/access-module.model';
import { NavigationItem } from './navigation-item.model';
import { ConveniosModulesStore } from '../../features/convenios/state/convenios-modules.store';
import { UotContextStore } from '../../features/uot/state/uot-context.store';

interface FrontendEntry {
  id: number;
  code: string;
  label: string;
  route: string;
  icon: string;
  order: number;
  permission: string;
  group: 'ADMIN' | 'COMERCIAL';
}

const FRONTEND_ENTRIES: readonly FrontendEntry[] = [
  { id: -6101, code: 'CAMPANIAS', label: 'Campañas', route: '/gestion-comercial/campanias', icon: 'calendar-days', order: 10, permission: 'CAMPANIAS_LISTAR', group: 'COMERCIAL' },
  { id: -6102, code: 'PARTICIPANTES', label: 'Participantes', route: '/gestion-comercial/participantes', icon: 'user-group', order: 20, permission: 'PARTICIPANTES_LISTAR', group: 'COMERCIAL' },
  { id: -6103, code: 'OPERATIVOS', label: 'Operativos', route: '/gestion-comercial/operativos', icon: 'truck', order: 30, permission: 'OPERATIVOS_LISTAR', group: 'COMERCIAL' },
  { id: -6104, code: 'ENTREGAS', label: 'Entregas', route: '/gestion-comercial/entregas', icon: 'boxes-stacked', order: 40, permission: 'ENTREGAS_LISTAR', group: 'COMERCIAL' },
  { id: -6105, code: 'JABAS', label: 'Jabas', route: '/gestion-comercial/jabas', icon: 'box', order: 50, permission: 'JABAS_LISTAR', group: 'COMERCIAL' },
  { id: -6106, code: 'PRECIOS', label: 'Precios', route: '/gestion-comercial/precios', icon: 'coins', order: 60, permission: 'PRECIOS_LISTAR', group: 'COMERCIAL' },
];

const SPECIAL_ENTRIES: readonly FrontendEntry[] = [
  { id: -7100, code: 'APAPPSS_SOCIOS_PREDIOS', label: 'Socios y predios', route: '/convenios/apappss', icon: 'map', order: 5, permission: 'APAPPSS_SOCIOS_LISTAR', group: 'COMERCIAL' },
  { id: -7101, code: 'CAMPANIAS', label: 'Campañas de venta', route: '/gestion-comercial/campanias', icon: 'calendar-days', order: 10, permission: 'CAMPANIAS_LISTAR', group: 'COMERCIAL' },
  { id: -7102, code: 'PARTICIPANTES', label: 'Participantes', route: '/gestion-comercial/participantes', icon: 'users', order: 20, permission: 'PARTICIPANTES_LISTAR', group: 'COMERCIAL' },
  { id: -7103, code: 'OPERATIVOS', label: 'Operativos', route: '/gestion-comercial/operativos', icon: 'truck', order: 30, permission: 'OPERATIVOS_LISTAR', group: 'COMERCIAL' },
  { id: -7104, code: 'ENTREGAS', label: 'Acopio y entregas', route: '/gestion-comercial/entregas', icon: 'boxes', order: 40, permission: 'ENTREGAS_LISTAR', group: 'COMERCIAL' },
  { id: -7105, code: 'JABAS', label: 'Jabas', route: '/gestion-comercial/jabas', icon: 'box', order: 50, permission: 'JABAS_LISTAR', group: 'COMERCIAL' },
  { id: -7106, code: 'PRECIOS', label: 'Precios', route: '/gestion-comercial/precios', icon: 'coins', order: 60, permission: 'PRECIOS_LISTAR', group: 'COMERCIAL' },
  { id: -7107, code: 'INCIDENCIAS', label: 'Incidencias', route: '/gestion-comercial/incidencias', icon: 'triangle-exclamation', order: 70, permission: 'INCIDENCIAS_LISTAR', group: 'COMERCIAL' },
  { id: -7108, code: 'AJUSTES', label: 'Ajustes de precios', route: '/gestion-comercial/ajustes', icon: 'scale-balanced', order: 80, permission: 'AJUSTES_LISTAR', group: 'COMERCIAL' },
  { id: -7109, code: 'GASTOS', label: 'Gastos', route: '/finanzas/gastos', icon: 'receipt', order: 90, permission: 'GASTOS_LISTAR', group: 'COMERCIAL' },
  { id: -7110, code: 'LIQUIDACIONES', label: 'Liquidaciones', route: '/finanzas/liquidaciones', icon: 'file-invoice', order: 100, permission: 'LIQUIDACIONES_LISTAR', group: 'COMERCIAL' },
  { id: -7111, code: 'PAGOS', label: 'Pagos a socios', route: '/finanzas/pagos', icon: 'wallet', order: 110, permission: 'PAGOS_LISTAR', group: 'COMERCIAL' },
  { id: -7112, code: 'COBROS', label: 'Cobros', route: '/finanzas/cobros', icon: 'hand-coins', order: 120, permission: 'COBROS_LISTAR', group: 'COMERCIAL' },
];

const ROUTES: Readonly<Record<string, string>> = {
  INICIO: '/inicio',
  DASHBOARD: '/inicio',
  ORGANIZACIONES: '/administracion/organizaciones',
  ROLES: '/administracion/roles-permisos',
  ROLES_PERMISOS: '/administracion/roles-permisos',
  CATALOGOS: '/administracion/catalogos',
  TIPOS_BIEN: '/administracion/catalogos',
  EMPLEADOS: '/administracion/empleados',
  USUARIOS: '/administracion/usuarios',
  UOT: '/administracion/uot',
  DOCUMENTOS: '/documentos-evidencias',
  EVIDENCIAS: '/documentos-evidencias',
  INVENTARIO: '/recursos/inventario-vehiculos',
  PRODUCTOS: '/recursos/productos',
  ALMACENES: '/recursos/almacenes',
  RECURSOS: '/recursos/programados',
  RECURSOS_PROGRAMADOS: '/recursos/programados',
  PRODUCTORES: '/gestion-tecnica/productores',
  PREDIOS: '/gestion-tecnica/predios',
  CULTIVOS: '/gestion-tecnica/parcelas-cultivos',
  CENSOS: '/gestion-tecnica/censos',
  SALIDAS: '/gestion-tecnica/salidas',
  VISITAS: '/gestion-tecnica/visitas',
  EVALUACIONES: '/gestion-tecnica/evaluaciones',
  SANIDAD: '/gestion-tecnica/sanidad',
  PRODUCCION: '/gestion-tecnica/produccion',
  CAMPANIAS: '/gestion-comercial/campanias',
  PARTICIPANTES: '/gestion-comercial/participantes',
  OPERATIVOS: '/gestion-comercial/operativos',
  ENTREGAS: '/gestion-comercial/entregas',
  JABAS: '/gestion-comercial/jabas',
  PRECIOS: '/gestion-comercial/precios',
  POS: '/pos',
  VENTAS: '/pos',
  INCIDENCIAS: '/gestion-comercial/incidencias',
  AJUSTES_PRECIO: '/gestion-comercial/ajustes',
  AJUSTES: '/gestion-comercial/ajustes',
  GASTOS: '/finanzas/gastos',
  LIQUIDACIONES: '/finanzas/liquidaciones',
  PAGOS: '/finanzas/pagos',
  COBROS: '/finanzas/cobros',
  REPORTES: '/reportes',
  AUDITORIA: '/auditoria',
};

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly accessStore = inject(AccessStore);
  private readonly convenios = inject(ConveniosModulesStore);
  private readonly uot = inject(UotContextStore);

  readonly items = computed(() => {
    const modules = this.accessStore.modules();
    const all = this.withFrontendEntries(this.buildTree(modules));
    const isSpecial = (code: string) => code === 'PRODUCTORES' || SPECIAL_ENTRIES.some((entry) => entry.code === code);
    const strip = (nodes: readonly NavigationItem[]): NavigationItem[] => nodes
      .filter((node) => !isSpecial(node.code))
      .map((node) => ({ ...node, children: strip(node.children) }))
      .filter((node) => node.route !== null || node.children.length > 0);
    const ordinary = strip(all);
    // Convenios son funciones opcionales; nunca se muestran solo por el rol.
    if (this.uot.isSpecific() && this.convenios.has('COMERCIALIZACION_ASOCIATIVA')) {
      const granted = SPECIAL_ENTRIES.filter((entry) =>
        entry.code === 'APAPPSS_SOCIOS_PREDIOS'
          ? (this.hasPermission('APAPPSS_SOCIOS_LISTAR') && this.hasPermission('PRODUCTORES_LISTAR')) ||
            (this.hasPermission('APAPPSS_PREDIOS_LISTAR') && this.hasPermission('PREDIOS_LISTAR'))
          : this.hasPermission(entry.permission),
      );
      if (granted.length > 0) {
        ordinary.push({
          id: -7000, code: 'APAPPSS', label: 'APAPPSS', route: null,
          icon: 'handshake', order: 75,
          children: granted.map((entry) => this.entryNode(entry)),
        });
      }
    }
    if (this.uot.isSpecific() && this.hasPermission('ORGANIZACIONES_LISTAR')) {
      // Administración de convenios no requiere que exista un modulo especial activo.
      const admin = ordinary.find((item) => item.code.toUpperCase().includes('ADMIN'));
      const node = {
        id: -7002, code: 'CONVENIOS_ADMIN', label: 'Convenios y módulos',
        route: '/administracion/convenios', icon: 'handshake', order: 30, children: [],
      };
      if (admin) admin.children = [...admin.children, node];
      else ordinary.push(node);
    }
    return ordinary.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  });

  private buildTree(modules: readonly AccessModule[]): readonly NavigationItem[] {
    const moduleById = new Map(modules.map((module) => [module.moduloId, module] as const));
    const includedIds = new Set<number>();

    for (const module of modules) {
      if (!module.visibleMenu) continue;
      includedIds.add(module.moduloId);
      let parentId = module.moduloPadreId;
      while (parentId !== null) {
        const parent = moduleById.get(parentId);
        if (!parent || includedIds.has(parent.moduloId)) break;
        includedIds.add(parent.moduloId);
        parentId = parent.moduloPadreId;
      }
    }

    const byParent = new Map<number | null, AccessModule[]>();
    for (const module of modules.filter((item) => includedIds.has(item.moduloId))) {
      const key = module.moduloPadreId !== null && includedIds.has(module.moduloPadreId)
        ? module.moduloPadreId
        : null;
      const bucket = byParent.get(key) ?? [];
      bucket.push(module);
      byParent.set(key, bucket);
    }

    const build = (parentId: number | null): NavigationItem[] =>
      (byParent.get(parentId) ?? [])
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
        .map((module) => ({
          id: module.moduloId,
          code: module.codigo,
          label: module.nombre,
          route: this.normalizedRoute(module),
          icon: module.icono,
          order: module.orden,
          children: build(module.moduloId),
        }));

    return build(null);
  }

  private withFrontendEntries(items: readonly NavigationItem[]): readonly NavigationItem[] {
    let result = [...items];
    for (const entry of FRONTEND_ENTRIES) {
      if (!this.hasPermission(entry.permission) || this.containsCode(result, entry.code)) continue;
      result = this.insertEntry(result, entry);
    }
    return result;
  }

  private insertEntry(items: readonly NavigationItem[], entry: FrontendEntry): NavigationItem[] {
    const groupMatcher = entry.group === 'ADMIN'
      ? (code: string) => code.includes('ADMIN')
      : (code: string) => code.includes('COMERCIAL');
    let inserted = false;

    const visit = (nodes: readonly NavigationItem[]): NavigationItem[] => nodes.map((node) => {
      let children = visit(node.children);
      if (!inserted && groupMatcher(node.code.trim().toUpperCase())) {
        children = [...children, this.entryNode(entry)].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
        inserted = true;
      }
      return { ...node, children };
    });

    const decorated = visit(items);
    return inserted
      ? decorated
      : [...decorated, this.entryNode(entry)].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }

  private entryNode(entry: FrontendEntry): NavigationItem {
    return { id: entry.id, code: entry.code, label: entry.label, route: entry.route, icon: entry.icon, order: entry.order, children: [] };
  }

  private containsCode(items: readonly NavigationItem[], code: string): boolean {
    const normalized = code.trim().toUpperCase();
    return items.some((item) => item.code.trim().toUpperCase() === normalized || this.containsCode(item.children, normalized));
  }

  private hasPermission(code: string): boolean {
    const normalized = code.trim().toUpperCase();
    return this.accessStore.permissions().some((permission) => permission.codigo.trim().toUpperCase() === normalized);
  }

  private normalizedRoute(module: AccessModule): string | null {
    if (!module.visibleMenu) return null;
    const code = module.codigo.trim().toUpperCase();
    return ROUTES[code] ?? module.ruta;
  }
}
