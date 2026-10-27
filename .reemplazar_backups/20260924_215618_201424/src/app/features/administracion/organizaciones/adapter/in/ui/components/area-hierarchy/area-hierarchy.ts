import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuilding, faSitemap } from '@fortawesome/free-solid-svg-icons';

import { Area } from '../../../../../domain/area.model';

interface AreaTreeNode {
  area: Area;
  children: readonly AreaTreeNode[];
}

@Component({
  selector: 'app-area-hierarchy',
  standalone: true,
  imports: [NgTemplateOutlet, FaIconComponent],
  templateUrl: './area-hierarchy.html',
  styleUrl: './area-hierarchy.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaHierarchyComponent {
  readonly companyName = input('Organización');
  readonly companyRuc = input<string | null>(null);
  readonly areas = input<readonly Area[]>([]);

  readonly companyIcon = faBuilding;
  readonly areaIcon = faSitemap;

  readonly roots = computed<readonly AreaTreeNode[]>(() => {
    const items = this.areas().filter((area) => area.estado);
    const byParent = new Map<number | null, Area[]>();
    const activeIds = new Set(items.map((area) => area.areaId));

    for (const area of items) {
      const parentId = area.areaPadreId && activeIds.has(area.areaPadreId)
        ? area.areaPadreId
        : null;
      const children = byParent.get(parentId) ?? [];
      children.push(area);
      byParent.set(parentId, children);
    }

    const build = (parentId: number | null, visited: ReadonlySet<number>): AreaTreeNode[] =>
      (byParent.get(parentId) ?? [])
        .filter((area) => !visited.has(area.areaId))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((area) => {
          const nextVisited = new Set(visited);
          nextVisited.add(area.areaId);
          return {
            area,
            children: build(area.areaId, nextVisited),
          };
        });

    return build(null, new Set<number>());
  });
}
