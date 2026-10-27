import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

import { BreadcrumbItem } from './navigation-item.model';

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  build(snapshot: ActivatedRouteSnapshot): readonly BreadcrumbItem[] {
    const result: BreadcrumbItem[] = [];
    let current: ActivatedRouteSnapshot | null = snapshot.root;
    let url = '';

    while (current) {
      const segment = current.url.map((part) => part.path).join('/');

      if (segment) {
        url += `/${segment}`;
      }

      const label = current.data['breadcrumb'] as string | undefined;

      if (label) {
        result.push({
          label,
          url: url || '/',
        });
      }

      current = current.firstChild;
    }

    return result;
  }
}
