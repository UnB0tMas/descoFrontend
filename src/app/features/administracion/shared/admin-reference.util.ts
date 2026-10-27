import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { PageResult } from '../../../shared/models/page-result.model';

/**
 * Carga todas las páginas de una referencia administrativa usando el tamaño
 * máximo habitual del backend. Los formularios nunca deben obligar al usuario
 * a conocer un FK porque una referencia quedó fuera de la primera página.
 */
export function loadAllAdminPages<T>(
  loader: (page: number, size: number) => Observable<PageResult<T>>,
  pageSize = 100,
): Observable<readonly T[]> {
  return loader(1, pageSize).pipe(
    switchMap((first) => {
      const totalPages = Math.max(1, first.totalPages || 1);

      if (totalPages <= 1) {
        return of(first.items);
      }

      const remaining = Array.from(
        { length: totalPages - 1 },
        (_, index) => loader(index + 2, pageSize),
      );

      return forkJoin(remaining).pipe(
        map((pages) => [
          ...first.items,
          ...pages.flatMap((page) => page.items),
        ]),
      );
    }),
  );
}
