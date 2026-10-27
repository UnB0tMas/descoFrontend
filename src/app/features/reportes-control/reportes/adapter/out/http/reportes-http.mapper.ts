import { inject, Injectable } from '@angular/core';
import { AdminApiMapper } from '../../../../../administracion/shared/admin-api.mapper';
import { Reporte, ReporteDatos } from '../../../domain/reporte.model';
@Injectable()
export class ReportesHttpMapper {
    private readonly api = inject(AdminApiMapper);
    catalog(response: unknown): readonly Reporte[] {
        return this.api.array(this.api.data<unknown>(response)).map((value) => {
            const item = this.api.record(value);
            return {
                codigo: this.api.string(item['codigo']),
                nombre: this.api.string(item['nombre']),
                grupo: this.api.nullableString(item['grupo']),
                descripcion: this.api.nullableString(item['descripcion']),
            };
        });
    }
    data(response: unknown): ReporteDatos {
        const data = this.api.record(this.api.data<unknown>(response));
        const rows: Record<string, unknown>[] = this.api
            .array(data['filas'])
            .map((value) => this.api.record(value));
        const columns: string[] = Array.from(new Set<string>(rows.flatMap((row) => Object.keys(row))));
        return {
            reporte: this.api.string(data['reporte']),
            secciones: [
                { codigo: 'RESULTADOS', titulo: 'Resultados', columnas: columns, filas: rows },
            ],
        };
    }
    toCsv(data: ReporteDatos): Blob {
        const rows: readonly Record<string, unknown>[] = data.secciones.flatMap((section) => section.filas);
        const columns: string[] = Array.from(new Set<string>(data.secciones.flatMap((section) => [...section.columnas])));
        const quote = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [
            columns.map(quote).join(','),
            ...rows.map((row) => columns.map((column) => quote(row[column])).join(',')),
        ].join('\n');
        return new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    }
}
