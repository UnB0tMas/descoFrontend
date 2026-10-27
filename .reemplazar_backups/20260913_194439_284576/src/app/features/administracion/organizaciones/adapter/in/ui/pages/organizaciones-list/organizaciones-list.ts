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
import { finalize } from 'rxjs';

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
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
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
  readonly uot = inject(UotContextStore);

  readonly activeTab = signal<OrganizationTab>('organizations');
  readonly areaView = signal<AreaView>('hierarchy');
  readonly organizationsLoading = signal(false);
  readonly areasLoading = signal(false);
  readonly detailLoadingId = signal<number | null>(null);
  readonly disablingOrganizationId = signal<number | null>(null);
  readonly disablingAreaId = signal<number | null>(null);
  readonly organizationsError = signal<string | null>(null);
  readonly areasError = signal<string | null>(null);
  readonly referencesLoading = signal(false);
  readonly referencesError = signal<string | null>(null);
  readonly referenceAreas = signal<readonly Area[]>([]);

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

  readonly hasSpecificUot = computed(
    () => this.uot.modo() === 'ESPECIFICA' && (this.uot.selectedId() ?? 0) > 0,
  );
  readonly uotName = computed(() => this.uot.selected()?.nombre ?? 'UOT no seleccionada');
  readonly hierarchyAreas = computed(() =>
    this.referenceAreas().filter((area) => area.estado),
  );

  ngOnInit(): void {
    if (!this.hasSpecificUot()) return;
    this.loadReferences();
    this.loadOrganizations(1);
    this.loadAreas(1);
  }

  setTab(tab: OrganizationTab): void {
    this.activeTab.set(tab);
  }

  setAreaView(view: AreaView): void {
    this.areaView.set(view);
  }

  loadReferences(): void {
    if (!this.hasSpecificUot()) return;
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    loadAllAdminPages((page, size) => this.listUseCase.areas(page, size))
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (items) => this.referenceAreas.set(items.filter((area) => area.estado)),
        error: (error) => {
          this.referenceAreas.set([]);
          this.referencesError.set(mapOpenApiError(error).message);
        },
      });
  }

  loadOrganizations(
    page = this.organizations().page,
    size = this.organizations().size,
  ): void {
    if (!this.hasSpecificUot()) return;
    this.organizationsLoading.set(true);
    this.organizationsError.set(null);

    this.listUseCase
      .execute(page, size)
      .pipe(finalize(() => this.organizationsLoading.set(false)))
      .subscribe({
        next: (result) => this.organizations.set(result),
        error: (error) => this.organizationsError.set(mapOpenApiError(error).message),
      });
  }

  loadAreas(
    page = this.areas().page,
    size = this.areas().size,
  ): void {
    if (!this.hasSpecificUot()) return;
    this.areasLoading.set(true);
    this.areasError.set(null);

    this.listUseCase
      .areas(page, size)
      .pipe(finalize(() => this.areasLoading.set(false)))
      .subscribe({
        next: (result) => this.areas.set(result),
        error: (error) => this.areasError.set(mapOpenApiError(error).message),
      });
  }

  async createCompany(): Promise<void> {
    if (!this.requireSpecificUot()) return;
    const result = await this.formModal.openCompany();
    if (result.saved) this.refreshOrganizations();
  }

  async createAssociation(): Promise<void> {
    if (!this.requireSpecificUot()) return;
    const result = await this.formModal.openAssociation();
    if (result.saved) this.refreshOrganizations();
  }

  editOrganization(company: Empresa): void {
    if (!this.requireSpecificUot() || this.detailLoadingId()) return;
    this.detailLoadingId.set(company.empresaId);
    this.listUseCase.detail(company.empresaId)
      .pipe(finalize(() => this.detailLoadingId.set(null)))
      .subscribe({
        next: (detail) => void this.openOrganizationEditor(detail),
        error: (error) => this.toast.error('No se pudo abrir la organización', mapOpenApiError(error).message),
      });
  }

  private async openOrganizationEditor(detail: OrganizacionDetalle): Promise<void> {
    const result = detail.organizacion.esAsociacion
      ? await this.formModal.openAssociation(detail)
      : await this.formModal.openCompany(detail);
    if (result.saved) this.refreshOrganizations();
  }

  viewOrganization(company: Empresa): void {
    if (!this.requireSpecificUot() || this.detailLoadingId()) return;
    this.detailLoadingId.set(company.empresaId);
    this.listUseCase.detail(company.empresaId)
      .pipe(finalize(() => this.detailLoadingId.set(null)))
      .subscribe({
        next: (detail) => void this.formModal.openView(detail),
        error: (error) => this.toast.error('No se pudo abrir la organización', mapOpenApiError(error).message),
      });
  }

  async disableOrganization(company: Empresa): Promise<void> {
    if (!this.requireSpecificUot() || this.disablingOrganizationId()) return;
    const confirmation = await this.confirmDialog.show({
      title: company.esAsociacion ? 'Retirar asociación de la UOT' : 'Retirar empresa de la UOT',
      message: `Se retirará el vínculo de ${company.razonSocial} con ${this.uotName()}. El historial se conservará.`,
      tone: 'danger',
      confirmLabel: 'Retirar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo del retiro.',
      minimumReasonLength: 5,
      maximumReasonLength: 300,
    });
    if (!confirmation.confirmed || !confirmation.reason) return;

    this.disablingOrganizationId.set(company.empresaId);
    this.disableOrganizationUseCase.execute(company.empresaId, confirmation.reason)
      .pipe(finalize(() => this.disablingOrganizationId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Organización retirada de la UOT');
          this.refreshOrganizations();
        },
        error: (error) => this.toast.error('No se pudo retirar la organización', mapOpenApiError(error).message),
      });
  }

  async createArea(): Promise<void> {
    if (!this.requireSpecificUot() || !this.canUseReferences()) return;
    const result = await this.formModal.openArea({ areas: this.referenceAreas() });
    if (result.saved) this.refreshAreas(true);
  }

  async editArea(area: Area): Promise<void> {
    if (!this.requireSpecificUot() || !this.canUseReferences()) return;
    const result = await this.formModal.openArea({ areas: this.referenceAreas() }, area);
    if (result.saved) this.refreshAreas(false);
  }

  async disableArea(area: Area): Promise<void> {
    if (!this.requireSpecificUot() || this.disablingAreaId()) return;
    const confirmation = await this.confirmDialog.show({
      title: 'Deshabilitar área',
      message: 'También se cerrarán sus subáreas y asignaciones activas dentro de esta UOT.',
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
    this.disableAreaUseCase.execute(area.areaId, confirmation.reason)
      .pipe(finalize(() => this.disablingAreaId.set(null)))
      .subscribe({
        next: () => {
          this.toast.success('Área deshabilitada');
          this.refreshAreas(false);
        },
        error: (error) => this.toast.error('No se pudo deshabilitar el área', mapOpenApiError(error).message),
      });
  }

  private requireSpecificUot(): boolean {
    if (this.hasSpecificUot()) return true;
    this.toast.info('Selecciona una UOT', 'Esta operación requiere trabajar dentro de una UOT específica.');
    return false;
  }

  private canUseReferences(): boolean {
    if (this.referencesLoading()) return false;
    if (this.referencesError()) {
      this.toast.error('No se pudieron cargar las áreas', this.referencesError()!);
      return false;
    }
    return true;
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
