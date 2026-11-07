import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ResourceDatePipe } from './resource-date.pipe';

describe('ResourceDatePipe', () => {
  let pipe: ResourceDatePipe;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    pipe = TestBed.runInInjectionContext(() => new ResourceDatePipe());
  });

  it('shows UTC audit fields in Peru for both API date representations', () => {
    expect(pipe.transform('2026-11-06T17:13:38Z')).toBe('06/11/2026 12:13');
    expect(pipe.transform('2026-11-06T17:13:38')).toBe('06/11/2026 12:13');
  });

  it('keeps date-only acquisition dates on their original day', () => {
    expect(pipe.transform('2026-11-06', 'dd/MM/yyyy')).toBe('06/11/2026');
    expect(pipe.transform(null)).toBeNull();
  });
});
