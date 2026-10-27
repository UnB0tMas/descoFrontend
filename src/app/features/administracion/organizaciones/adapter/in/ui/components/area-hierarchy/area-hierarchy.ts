import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuilding, faSitemap } from '@fortawesome/free-solid-svg-icons';

import { Area } from '../../../../../domain/area.model';

interface AreaTreeNode {
  area: Area;
  children: readonly AreaTreeNode[];
}

interface AreaUotGroup {
  uotId: number;
  uotCodigo: string;
  uotNombre: string;
  roots: readonly AreaTreeNode[];
  totalAreas: number;
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
  @ViewChild('viewport', { static: true })
  private readonly viewportRef!: ElementRef<HTMLDivElement>;

  readonly companyName = input('Todas mis UOT');
  readonly companyRuc = input<string | null>(null);
  readonly areas = input<readonly Area[]>([]);

  readonly companyIcon = faBuilding;
  readonly areaIcon = faSitemap;
  readonly panning = signal(false);

  private pointerId: number | null = null;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private scrollStartLeft = 0;
  private scrollStartTop = 0;

  readonly groups = computed<readonly AreaUotGroup[]>(() => {
    const activeAreas = this.areas().filter((area) => area.estado);
    const byUot = new Map<number, Area[]>();

    for (const area of activeAreas) {
      const bucket = byUot.get(area.uotId) ?? [];
      bucket.push(area);
      byUot.set(area.uotId, bucket);
    }

    return Array.from(byUot.entries())
      .map(([uotId, items]) => ({
        uotId,
        uotCodigo: items[0]?.uotCodigo ?? '',
        uotNombre: items[0]?.uotNombre ?? this.companyName(),
        roots: this.buildTree(items),
        totalAreas: items.length,
      }))
      .sort((left, right) =>
        left.uotNombre.localeCompare(right.uotNombre),
      );
  });

  centerViewport(): void {
    const viewport = this.viewportRef.nativeElement;
    const left = Math.max(
      0,
      (viewport.scrollWidth - viewport.clientWidth) / 2,
    );

    viewport.scrollTo({
      left,
      top: 0,
      behavior: 'smooth',
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"]',
      )
    ) {
      return;
    }

    const viewport = this.viewportRef.nativeElement;

    this.pointerId = event.pointerId;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.scrollStartLeft = viewport.scrollLeft;
    this.scrollStartTop = viewport.scrollTop;
    this.panning.set(true);

    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  onPointerMove(event: PointerEvent): void {
    if (
      !this.panning() ||
      this.pointerId !== event.pointerId
    ) {
      return;
    }

    const viewport = this.viewportRef.nativeElement;
    viewport.scrollLeft =
      this.scrollStartLeft - (event.clientX - this.pointerStartX);
    viewport.scrollTop =
      this.scrollStartTop - (event.clientY - this.pointerStartY);
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) {
      return;
    }

    const viewport = this.viewportRef.nativeElement;

    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    this.pointerId = null;
    this.panning.set(false);
  }

  private buildTree(items: readonly Area[]): readonly AreaTreeNode[] {
    const activeIds = new Set(items.map((area) => area.areaId));
    const byParent = new Map<number | null, Area[]>();

    for (const area of items) {
      const parentId =
        area.areaPadreId !== null &&
        activeIds.has(area.areaPadreId)
          ? area.areaPadreId
          : null;

      const children = byParent.get(parentId) ?? [];
      children.push(area);
      byParent.set(parentId, children);
    }

    const build = (
      parentId: number | null,
      visited: ReadonlySet<number>,
    ): AreaTreeNode[] =>
      (byParent.get(parentId) ?? [])
        .filter((area) => !visited.has(area.areaId))
        .sort((left, right) =>
          left.nombre.localeCompare(right.nombre),
        )
        .map((area) => {
          const nextVisited = new Set(visited);
          nextVisited.add(area.areaId);

          return {
            area,
            children: build(area.areaId, nextVisited),
          };
        });

    return build(null, new Set<number>());
  }
}
