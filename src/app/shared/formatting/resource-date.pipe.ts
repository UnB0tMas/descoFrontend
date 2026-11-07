import { DatePipe } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

/** SQL datetime2 audit fields have no offset but are stored as UTC. */
@Pipe({ name: 'resourceDate', standalone: true })
export class ResourceDatePipe implements PipeTransform {
  private readonly formatter = new DatePipe(inject(LOCALE_ID));

  transform(value: string | Date | null | undefined, format = 'dd/MM/yyyy HH:mm', timezone = '-0500'): string | null {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return this.formatter.transform(value, format);
    }
    const normalized = typeof value === 'string' && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
      ? value.replace(' ', 'T') + 'Z'
      : value;
    return this.formatter.transform(normalized, format, timezone);
  }
}
