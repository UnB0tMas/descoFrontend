import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBoxesStacked,
  faBuilding,
  faChevronDown,
  faCircle,
  faClipboardList,
  faCoins,
  faFileShield,
  faFolderOpen,
  faGaugeHigh,
  faLeaf,
  faLocationDot,
  faMoneyBillTransfer,
  faRoute,
  faSeedling,
  faShop,
  faTruck,
  faUserGroup,
  faUsersGear,
} from '@fortawesome/free-solid-svg-icons';

import { NavigationItem } from '../../../core/navigation/navigation-item.model';

@Component({
  selector: 'app-sidebar-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FaIconComponent],
  templateUrl: './sidebar-item.html',
  styleUrl: './sidebar-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarItemComponent {
  @Input({ required: true }) item!: NavigationItem;
  @Input() collapsed = false;

  @Output() navigate = new EventEmitter<void>();
  @Output() requestExpand = new EventEmitter<void>();

  readonly expanded = signal(false);
  readonly chevronIcon = faChevronDown;
  readonly childIcon = faCircle;

  toggleGroup(): void {
    if (this.item.children.length === 0) {
      return;
    }

    if (this.collapsed) {
      this.requestExpand.emit();
      this.expanded.set(true);
      return;
    }

    this.expanded.update((value) => !value);
  }

  iconFor(item: NavigationItem): IconDefinition {
    const code = item.code.toUpperCase();

    if (code === 'INICIO') {
      return faGaugeHigh;
    }

    if (code.includes('GRP_TECNICA')) {
      return faSeedling;
    }

    if (code.includes('GRP_COMERCIAL')) {
      return faShop;
    }

    if (code.includes('GRP_FINANZAS')) {
      return faMoneyBillTransfer;
    }

    if (code.includes('GRP_RECURSOS')) {
      return faBoxesStacked;
    }

    if (code.includes('GRP_ADMIN')) {
      return faUsersGear;
    }

    if (code.includes('GRP_REPORTE')) {
      return faFileShield;
    }

    if (code.includes('PRODUCTOR') || code.includes('SOCIO')) {
      return faUserGroup;
    }

    if (code.includes('PREDIO')) {
      return faLocationDot;
    }

    if (
      code.includes('CULTIVO') ||
      code.includes('PRODUCCION') ||
      code.includes('SANIDAD')
    ) {
      return code.includes('SANIDAD') ? faLeaf : faSeedling;
    }

    if (
      code.includes('SALIDA') ||
      code.includes('VISITA') ||
      code.includes('OPERATIVO')
    ) {
      return faRoute;
    }

    if (
      code.includes('JABA') ||
      code.includes('INVENTARIO') ||
      code.includes('RECURSO')
    ) {
      return faBoxesStacked;
    }

    if (code.includes('ENTREGA')) {
      return faTruck;
    }

    if (
      code.includes('PAGO') ||
      code.includes('COBRO') ||
      code.includes('LIQUID')
    ) {
      return faMoneyBillTransfer;
    }

    if (code.includes('GASTO') || code.includes('AJUSTE')) {
      return faCoins;
    }

    if (code.includes('USUARIO') || code.includes('ROL')) {
      return faUsersGear;
    }

    if (code.includes('ORGANIZ')) {
      return faBuilding;
    }

    if (code.includes('REPORTE') || code.includes('AUDITOR')) {
      return faFileShield;
    }

    if (code.includes('CAMPANIA') || code.includes('PRECIO')) {
      return faShop;
    }

    if (code.includes('CENSO') || code.includes('EVALUACION')) {
      return faClipboardList;
    }

    return faFolderOpen;
  }
}
