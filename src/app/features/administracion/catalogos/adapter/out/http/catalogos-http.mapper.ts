import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../shared/admin-api.mapper';
import { CatalogoItem } from '../../../domain/catalogo-item.model';

@Injectable()
export class CatalogosHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.item(row), size);
  }

  createdId(response: unknown): number {
    const row = this.api.record(this.api.data<unknown>(response));
    return this.api.number(row['id']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private item(row: Record<string, unknown>): CatalogoItem {
    const description = this.api.nullableString(row['descripcion']);

    return {
      id: this.api.number(row['id']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      descripcion: description,
      categoria: this.categoryFromDescription(description),
      estado: this.api.boolean(row['estado']),
      cantidadUso: this.api.number(row['cantidadUso']),
      enUso: this.api.boolean(row['enUso']),
    };
  }

  private categoryFromDescription(description: string | null): string | null {
    if (!description) {
      return null;
    }

    const match = /^Categor[ií]a:\s*(.+)$/i.exec(description.trim());
    return match?.[1]?.trim().toUpperCase() || null;
  }
}
