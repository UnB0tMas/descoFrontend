import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';

import { PermissionService } from './permission.service';

type PermissionMode = 'all' | 'any';

@Directive({
  selector: '[appPermission]',
  standalone: true,
})
export class PermissionDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  private permissions: readonly string[] = [];
  private mode: PermissionMode = 'all';
  private rendered = false;

  @Input()
  set appPermission(value: string | readonly string[]) {
    this.permissions =
      typeof value === 'string' ? [value] : [...(value ?? [])];
    this.render();
  }

  @Input()
  set appPermissionMode(value: PermissionMode) {
    this.mode = value ?? 'all';
    this.render();
  }

  private render(): void {
    const allowed =
      this.permissions.length === 0 ||
      (this.mode === 'any'
        ? this.permissionService.hasAny(this.permissions)
        : this.permissionService.hasAll(this.permissions));

    if (allowed && !this.rendered) {
      this.container.clear();
      this.container.createEmbeddedView(this.template);
      this.rendered = true;
      return;
    }

    if (!allowed && this.rendered) {
      this.container.clear();
      this.rendered = false;
    }
  }
}
