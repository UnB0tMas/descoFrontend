export interface PageResult<T> {
  items: readonly T[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

export function emptyPageResult<T>(size = 20): PageResult<T> {
  return {
    items: [],
    page: 1,
    size,
    totalRecords: 0,
    totalPages: 0,
  };
}
