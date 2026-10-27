import { Injectable, computed, signal } from '@angular/core';

import { Sort } from '../models/sort.model';
import {
  ListQueryState,
  createDefaultListQueryState,
} from './list-query-state.model';

@Injectable()
export class ListQueryStateService<TFilters extends Record<string, unknown>> {
  private initialFilters = {} as TFilters;
  private initialSize = 20;

  private readonly stateSignal = signal<ListQueryState<TFilters>>(
    createDefaultListQueryState(this.initialFilters, this.initialSize),
  );

  readonly state = this.stateSignal.asReadonly();
  readonly page = computed(() => this.stateSignal().page);
  readonly size = computed(() => this.stateSignal().size);
  readonly filters = computed(() => this.stateSignal().filters);
  readonly sort = computed(() => this.stateSignal().sort);

  initialize(filters: TFilters, size = 20): void {
    this.initialFilters = { ...filters };
    this.initialSize = size;
    this.stateSignal.set(
      createDefaultListQueryState({ ...filters }, size),
    );
  }

  setFilters(filters: TFilters): void {
    this.stateSignal.update((current) => ({
      ...current,
      page: 1,
      filters: { ...filters },
    }));
  }

  patchFilters(filters: Partial<TFilters>): void {
    this.stateSignal.update((current) => ({
      ...current,
      page: 1,
      filters: {
        ...current.filters,
        ...filters,
      },
    }));
  }

  setPage(page: number): void {
    this.stateSignal.update((current) => ({
      ...current,
      page: Math.max(1, page),
    }));
  }

  setSize(size: number): void {
    this.stateSignal.update((current) => ({
      ...current,
      page: 1,
      size: Math.max(1, size),
    }));
  }

  setSort(sort: Sort | null): void {
    this.stateSignal.update((current) => ({
      ...current,
      page: 1,
      sort,
    }));
  }

  reset(): void {
    this.stateSignal.set(
      createDefaultListQueryState(
        { ...this.initialFilters },
        this.initialSize,
      ),
    );
  }
}
