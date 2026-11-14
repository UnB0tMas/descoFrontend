/** Calibres expresados en gramos enteros, con ambos extremos inclusivos en BD. */
export interface CampaignCalibreRange {
  variedadPaltaId: number;
  gramosDesde: number;
  gramosHasta: number | null;
}

/** 120 g+ seguido de 180 g+ -> 120-179 g y 180 g+. No modifica entradas. */
export function closeOpenCalibreRanges<T extends CampaignCalibreRange>(grades: readonly T[]): T[] {
  return grades.map(grade => {
    if (grade.gramosHasta !== null) return { ...grade };
    const next = grades
      .filter(item => item.variedadPaltaId === grade.variedadPaltaId && item.gramosDesde > grade.gramosDesde)
      .reduce<number | null>((min, item) => min === null ? item.gramosDesde : Math.min(min, item.gramosDesde), null);
    return { ...grade, gramosHasta: next === null ? null : next - 1 };
  });
}

export function calibreRangeText(from: number, to: number | null | undefined): string {
  // SQL Server omite el campo de JSON cuando gramos_hasta es NULL.
  // Por tanto, undefined también significa un calibre abierto (180 g+).
  if (!Number.isFinite(from)) return 'Rango no disponible';
  return to == null ? `${from} g+` : `${from}–${to} g`;
}
