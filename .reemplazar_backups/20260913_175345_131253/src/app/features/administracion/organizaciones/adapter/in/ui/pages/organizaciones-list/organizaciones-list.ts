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
  faBan,
  faBuilding,
  faEye,
  faPen,
  faPlus,
  faRotate,
  faSitemap,
  faTable,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { DeshabilitarAreaUseCase } from '../../../../../application/use-case/deshabilitar-area.use-case';
import { DeshabilitarOrganizacionUseCase } from '../../../../../application/use-case/deshabilitar-organizacion.use-case';
import { ListarOrganizacionesUseCase } from '../../../../../application/use-case/listar-organizaciones.use-case';
import { Area } from '../../../../../domain/area.model';
import { Empresa, OrganizacionDetalle } from '../../../../../domain/empresa.model';
import { AreaHierarchyComponent } from '../../components/area-hierarchy/area-hierarchy';
import { OrganizacionFormComponent } from '../organizacion-form/organizacion-form';

type OrganizationTab = 'organizations' | 'areas';
type AreaView = 'hierarchy' | 'table';

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
    ActionConfirmDialogComponent,
    PageHeaderComponent,
    AreaHierarchyComponent,
    OrganizacionFormComponent,
  ],
  templateUrl: './organizaciones-list.html',
  styleUrl: './organizaciones-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizacionesListPage implements OnInit {
  @ViewChild(OrganizacionFormComponent)
  private formModal!: OrganizacionFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirmDialog!: ActionConfirmDialogComponent;

  private readonly listUseCase = inject(ListarOrganizacionesUseCase);
  private readonly disableOrganizationUseCase = inject(DeshabilitarOrganizacionUseCase);
  private readonly disableAreaUseCase = inject(DeshabilitarAreaUseCase);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<OrganizationTab>('organizations');
  readonly areaView = signal<AreaView>('hierarchy');
  readonly organizationsLoading = signal(true);
  readonly areasLoading = signal(false);
  readonly detailLoadingId = signal<number | null>(null);
  readonly disablingOrganizationId = signal<number | null>(null);
  readonly disablingAreaId = signal<number | null>(null);
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
  readonly tableIcon = faTable;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly disableIcon = faBan;
  readonly refreshIcon = faRotate;

  readonly companyOptions = computed<readonly AdminSelectOption[]>(() =>
    this.referenceOrganizations()
      .filter((company) => company.estado)
      .map((company) => ({
        value: company.empresaId,
        label: company.razonSocial,
        description: company.ruc,
      })),
  );

  readonly hierarchyOrganization = computed(() => {
    const companyId = this.areaCompanyFilter();
    return this.referenceOrganizations().find(
      (company) => company.empresaId === companyId && company.estado,
    ) ?? null;
  });

  readonly hierarchyAreas = computed(() => {
    const companyId = this.hierarchyOrganization()?.empresaId;
    return companyId
      ? this.referenceAreas().filter(
          (area) => area.empresaId === companyId && area.estado,
        )
      : [];
  });

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
          const activeOrganizations = organizations.filter((company) => company.estado);
          this.referenceOrganizations.set(organizations);
          this.referenceAreas.set(areas.filter((area) => area.estado));

          const selectedId = this.areaCompanyFilter();
          if (
            this.areaView() === 'hierarchy'
            && !activeOrganizations.some((company) => company.empresaId === selectedId)
          ) {
            this.areaCompanyFilter.set(activeOrganizations[0]?.empresaId ?? null);
          }
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
    if (tab === 'areas') {
      this.ensureHierarchyOrganization();
    }
  }

  setAreaView(view: AreaView): void {
    this.areaView.set(view);
    if (view === 'hierarchy') {
      this.ensureHierarchyOrganization();
    }
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
    if (this.areaView() === 'hierarchy') {
      this.ensureHierarchyOrganization();
    }
    this.loadAreas(1);
  }

  async createCompany(): Promise<void> {
    const result = await this.formModal.openCompany();
    if (result.saved) this.refreshOrganizations();
  }

  async createAssociation(): Promise<void> {
    const result = await this.formModal.openAssociation();
    if (result.saved) this.refreshOrganizations();
  }

  editOrganization(company: Empresa): void {
    if (this.detailLoadingId()) return;

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

  private async openOrganizationEditor(detail: OrganizacionDetalle): Promise<void> {
    const result = detail.organizacion.esAsociacion
      ? await this.formModal.openAssociation(detail)
      : await this.formModal.openCompany(detail);
    if (result.saved) this.refreshOrganizations();
  }

  viewOrganization(company: Empresa): void {
    if (this.detailLoadingId()) return;

    this.detailLoadingId.set(company.empresaId);
    this.listUseCase
      .detail(company.empresaId)
      .pipe(finalize(() => this.detailLoadingId.set(null)))
      .subscribe({
        next: (detail) => void this.formModal.openView(detail),
        error: (error) =>
          this.toast.error(
            'No se pudo abrir la organización',
            mapOpenApiError(error).message,
          ),
      });
  }

  async disableOrganization(company: Empresa): Promise<void> {
    if (this.disablingOrganizationId()) return;

    const confirmation = await this.confirmDialog.show({
      title: company.esAsociacion ? 'Deshabilitar asociación' : 'Deshabilitar empresa',
      message: 'Se cerrarán áreas, asignaciones, empleados y accesos vinculados. El historial se conservará.',
      tone: 'danger',
      confirmLabel: 'Deshabilitar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo de la deshabilitación.',
      minimumReasonLength: 5,
      maximumReasonLength: 300,
    });

    if (!confirmation.confirmed || !confirmation.reason) return;

    this.disablingOrganizationId.set(company.empresaId);
    this.disableOrganizationUseCase
      .execute(company.empresaId, confirmation.reason)
      .pipe(finalize(() => this.disablingOrganizationId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Organización deshabilitada');
          this.refreshOrganizations();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo deshabilitar la organización',
            mapOpenApiError(error).message,
          ),
      });
  }

  async createArea(): Promise<void> {
    if (!this.canUseReferences()) return;

    const companies = this.companyOptions();
    if (companies.length === 0) {
      this.toast.info('Falta una organización', 'Registra una organización antes de crear áreas.');
      return;
    }

    const result = await this.formModal.openArea({
      companies,
      areas: this.referenceAreas(),
    });

    if (result.saved) this.refreshAreas(true);
  }

  async editArea(area: Area): Promise<void> {
    if (!this.canUseReferences()) return;

    const result = await this.formModal.openArea(
      { companies: this.companyOptions(), areas: this.referenceAreas() },
      area,
    );

    if (result.saved) this.refreshAreas(false);
  }

  async disableArea(area: Area): Promise<void> {
    if (this.disablingAreaId()) return;

    const confirmation = await this.confirmDialog.show({
      title: 'Deshabilitar área',
      message: 'También se deshabilitarán sus subáreas y se cerrarán sus asignaciones activas.',
      tone: 'danger',
      confirmLabel: 'Deshabilitar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo de la deshabilitación.',
      minimumReasonLength: 5,
      maximumReasonLength: 300,
    });

    if (!confirmation.confirmed || !confirmation.reason) return;

    this.disablingAreaId.set(area.areaId);
    this.disableAreaUseCase
      .execute(area.areaId, confirmation.reason)
      .pipe(finalize(() => this.disablingAreaId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Área deshabilitada');
          this.refreshAreas(false);
        },
        error: (error) =>
          this.toast.error('No se pudo deshabilitar el área', mapOpenApiError(error).message),
      });
  }

  private canUseReferences(): boolean {
    if (this.referencesLoading()) return false;
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las opciones', this.referencesError()!);
      return false;
    }
    return true;
  }

  private ensureHierarchyOrganization(): void {
    const current = this.areaCompanyFilter();
    const active = this.referenceOrganizations().filter((company) => company.estado);
    if (!active.some((company) => company.empresaId === current)) {
      this.areaCompanyFilter.set(active[0]?.empresaId ?? null);
    }
  }

  private refreshOrganizations(): void {
    this.loadReferences();
    this.loadOrganizations(1);
    this.loadAreas(1);
  }

  private refreshAreas(firstPage: boolean): void {
    this.loadReferences();
    this.loadAreas(firstPage ? 1 : this.areas().page);
  }
}
