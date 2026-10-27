import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBuilding,
  faEye,
  faPen,
  faPlus,
  faRotate,
  faSitemap,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { ListarOrganizacionesUseCase } from '../../../../../application/use-case/listar-organizaciones.use-case';
import { Area } from '../../../../../domain/area.model';
import { Empresa, OrganizacionDetalle } from '../../../../../domain/empresa.model';
import { OrganizacionFormComponent } from '../organizacion-form/organizacion-form';

type OrganizationTab = 'organizations' | 'areas';

@Component({
  selector: 'app-organizaciones-list-page',
  standalone: true,
  imports: [
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginatorComponent,
    PageHeaderComponent,
    OrganizacionFormComponent,
  ],
  templateUrl: './organizaciones-list.html',
  styleUrl: './organizaciones-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizacionesListPage implements OnInit {
  @ViewChild(OrganizacionFormComponent)
  private formModal!: OrganizacionFormComponent;

  private readonly listUseCase = inject(ListarOrganizacionesUseCase);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<OrganizationTab>('organizations');
  readonly organizationsLoading = signal(true);
  readonly areasLoading = signal(false);
  readonly detailLoadingId = signal<number | null>(null);
  readonly organizationsError = signal<string | null>(null);
  readonly areasError = signal<string | null>(null);
  readonly referencesLoading = signal(true);
  readonly referencesError = signal<string | null>(null);
  readonly referenceOrganizations = signal<readonly Empresa[]>([]);
  readonly referenceAreas = signal<readonly Area[]>([]);
  readonly areaCompanyFilter = signal<number | null>(null);

  readonly organizations = signal<PageResult<Empresa>>(emptyPageResult(20));
  readonly areas = signal<PageResult<Area>>(emptyPageResult(20));

  readonly pageIcon = faBuilding;
  readonly companyIcon = faBuilding;
  readonly associationIcon = faUserGroup;
  readonly areaIcon = faSitemap;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly refreshIcon = faRotate;

  readonly companyOptions = computed<readonly AdminSelectOption[]>(() =>
    this.referenceOrganizations().filter((company) => company.estado).map((company) => ({
      value: company.empresaId,
      label: company.razonSocial,
      description: company.ruc,
    })),
  );

  ngOnInit(): void {
    this.loadReferences();
    this.loadOrganizations(1);
    this.loadAreas(1);
  }

  loadReferences(): void {
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    forkJoin({
      organizations: loadAllAdminPages((page, size) =>
        this.listUseCase.execute(page, size),
      ),
      areas: loadAllAdminPages((page, size) =>
        this.listUseCase.areas(page, size),
      ),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ organizations, areas }) => {
          this.referenceOrganizations.set(organizations);
          this.referenceAreas.set(areas.filter((area) => area.estado));
        },
        error: (error) => {
          this.referenceOrganizations.set([]);
          this.referenceAreas.set([]);
          this.referencesError.set(mapOpenApiError(error).message);
        },
      });
  }

  setTab(tab: OrganizationTab): void {
    this.activeTab.set(tab);
  }

  loadOrganizations(
    page = this.organizations().page,
    size = this.organizations().size,
  ): void {
    this.organizationsLoading.set(true);
    this.organizationsError.set(null);

    this.listUseCase
      .execute(page, size)
      .pipe(finalize(() => this.organizationsLoading.set(false)))
      .subscribe({
        next: (result) => this.organizations.set(result),
        error: (error) =>
          this.organizationsError.set(mapOpenApiError(error).message),
      });
  }

  loadAreas(
    page = this.areas().page,
    size = this.areas().size,
  ): void {
    this.areasLoading.set(true);
    this.areasError.set(null);

    this.listUseCase
      .areas(page, size, this.areaCompanyFilter() ?? undefined)
      .pipe(finalize(() => this.areasLoading.set(false)))
      .subscribe({
        next: (result) => this.areas.set(result),
        error: (error) =>
          this.areasError.set(mapOpenApiError(error).message),
      });
  }

  changeAreaCompany(value: string): void {
    const companyId = Number(value);
    this.areaCompanyFilter.set(
      Number.isFinite(companyId) && companyId > 0 ? companyId : null,
    );
    this.loadAreas(1);
  }

  async createCompany(): Promise<void> {
    const result = await this.formModal.openCompany();

    if (result.saved) {
      this.loadReferences();
      this.loadOrganizations(1);
    }
  }

  async createAssociation(): Promise<void> {
    const result = await this.formModal.openAssociation();

    if (result.saved) {
      this.loadReferences();
      this.loadOrganizations(1);
    }
  }

  editOrganization(company: Empresa): void {
    if (this.detailLoadingId()) {
      return;
    }

    this.detailLoadingId.set(company.empresaId);
    this.listUseCase
      .detail(company.empresaId)
      .pipe(finalize(() => this.detailLoadingId.set(null)))
      .subscribe({
        next: (detail) => void this.openOrganizationEditor(detail),
        error: (error) =>
          this.toast.error(
            'No se pudo abrir la organización',
            mapOpenApiError(error).message,
          ),
      });
  }

  private async openOrganizationEditor(
    detail: OrganizacionDetalle,
  ): Promise<void> {
    const result = detail.organizacion.esAsociacion
      ? await this.formModal.openAssociation(detail)
      : await this.formModal.openCompany(detail);

    if (result.saved) {
      this.loadReferences();
      this.loadOrganizations();
    }
  }

  async viewOrganization(company: Empresa): Promise<void> {
    if (this.detailLoadingId()) {
      return;
    }

    this.detailLoadingId.set(company.empresaId);

    this.listUseCase
      .detail(company.empresaId)
      .pipe(finalize(() => this.detailLoadingId.set(null)))
      .subscribe({
        next: (detail) => {
          void this.formModal.openView(detail);
        },
        error: (error) =>
          this.toast.error(
            'No se pudo abrir la organización',
            mapOpenApiError(error).message,
          ),
      });
  }

  async createArea(): Promise<void> {
    if (this.referencesLoading()) {
      return;
    }

    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las opciones', this.referencesError()!);
      return;
    }

    if (this.companyOptions().length === 0) {
      this.toast.info(
        'Falta una organización',
        'Registra una empresa o asociación antes de crear áreas.',
      );
      return;
    }

    const result = await this.formModal.openArea({
      companies: this.companyOptions(),
      areas: this.referenceAreas(),
    });

    if (result.saved) {
      this.loadReferences();
      this.loadAreas(1);
    }
  }

  async editArea(area: Area): Promise<void> {
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las opciones', this.referencesError()!);
      return;
    }

    const result = await this.formModal.openArea(
      {
        companies: this.companyOptions(),
        areas: this.referenceAreas(),
      },
      area,
    );

    if (result.saved) {
      this.loadReferences();
      this.loadAreas();
    }
  }
}
