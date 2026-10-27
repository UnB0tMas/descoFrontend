import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faPen,
  faRotate,
  faTriangleExclamation,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ResourceAssetDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetDetailResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { LocalFilePanelComponent } from '../../../../../../../../shared/files/local-file-panel/local-file-panel';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { RecursoFormComponent } from '../recurso-form/recurso-form';

@Component({
  selector: 'app-recurso-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    ErrorStateComponent,
    LoadingStateComponent,
    LocalFilePanelComponent,
    PageHeaderComponent,
    RecursoFormComponent,
  ],
  templateUrl: './recurso-detail.html',
  styleUrl: './recurso-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursoDetailPage implements OnInit {
  @ViewChild(RecursoFormComponent) private form!: RecursoFormComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResourceApiService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<ResourceAssetDetailResponse | null>(null);

  readonly pageIcon = faWrench;
  readonly backIcon = faArrowLeft;
  readonly editIcon = faPen;
  readonly refreshIcon = faRotate;
  readonly stateIcon = faWrench;
  readonly incidentIcon = faTriangleExclamation;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage.set('El identificador del bien no es válido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .getAsset(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          if (!detail?.bien) {
            this.errorMessage.set('No se encontró el bien solicitado.');
            return;
          }
          this.detail.set(detail);
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  async edit(): Promise<void> {
    const item = this.detail()?.bien;
    if (!item) return;
    const result = await this.form.openEdit(item);
    if (result.saved) this.load();
  }

  async changeState(): Promise<void> {
    const item = this.detail()?.bien;
    if (!item) return;
    const result = await this.form.openState(item);
    if (result.saved) this.load();
  }

  async reportIncident(): Promise<void> {
    const item = this.detail()?.bien;
    if (!item) return;
    const result = await this.form.openIncident(item);
    if (result.saved) this.load();
  }

  fileIds(): readonly number[] {
    const detail = this.detail();
    if (!detail) return [];
    return detail.archivosImagen ?? [];
  }
}
