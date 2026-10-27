import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './paginator.html',
  styleUrl: './paginator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
  @Input() page = 1;
  @Input() size = 20;
  @Input() totalRecords = 0;
  @Input() totalPages = 0;
  @Input() pageSizes: readonly number[] = [10, 20, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() sizeChange = new EventEmitter<number>();

  readonly previousIcon = faArrowLeft;
  readonly nextIcon = faArrowRight;

  get firstRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.page - 1) * this.size + 1;
  }

  get lastRecord(): number {
    return Math.min(this.page * this.size, this.totalRecords);
  }

  get visiblePages(): readonly number[] {
    if (this.totalPages <= 0) {
      return [];
    }

    const start = Math.max(1, Math.min(this.page - 2, this.totalPages - 4));
    const end = Math.min(this.totalPages, start + 4);

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start + index,
    );
  }

  goTo(targetPage: number): void {
    if (
      targetPage < 1 ||
      targetPage > this.totalPages ||
      targetPage === this.page
    ) {
      return;
    }

    this.pageChange.emit(targetPage);
  }

  changeSize(value: string): void {
    const nextSize = Number(value);

    if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === this.size) {
      return;
    }

    this.sizeChange.emit(nextSize);
  }
}
