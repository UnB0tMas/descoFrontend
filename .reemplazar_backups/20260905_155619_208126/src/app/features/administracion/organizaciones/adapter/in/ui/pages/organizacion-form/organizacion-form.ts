import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuilding, faFloppyDisk, faSitemap, faUserGroup, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import { buildSystemCode } from '../../../../../../shared/admin-code.util';
import { AdminModalResult, AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { CrearAreaUseCase } from '../../../../../application/use-case/crear-area.use-case';
import { CrearAsociacionUseCase } from '../../../../../application/use-case/crear-asociacion.use-case';
import { CrearEmpresaUseCase } from '../../../../../application/use-case/crear-empresa.use-case';
import { EditarAreaUseCase } from '../../../../../application/use-case/editar-area.use-case';
import { EditarAsociacionUseCase } from '../../../../../application/use-case/editar-asociacion.use-case';
import { EditarEmpresaUseCase } from '../../../../../application/use-case/editar-empresa.use-case';
import { Area } from '../../../../../domain/area.model';
import { Empresa, OrganizacionDetalle } from '../../../../../domain/empresa.model';

type OrganizationFormKind = 'company' | 'association' | 'area' | 'view';
interface AreaModalOptions {
  companies: readonly AdminSelectOption[];
  areas: readonly Area[];
}

@Component({
  selector: 'app-organizacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
  ],
  templateUrl: './organizacion-form.html',
  styleUrl: './organizacion-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizacionFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly createCompanyUseCase = inject(CrearEmpresaUseCase);
  private readonly updateCompanyUseCase = inject(EditarEmpresaUseCase);
  private readonly createAssociationUseCase = inject(CrearAsociacionUseCase);
  private readonly updateAssociationUseCase = inject(EditarAsociacionUseCase);
  private readonly createAreaUseCase = inject(CrearAreaUseCase);
  private readonly updateAreaUseCase = inject(EditarAreaUseCase);
  private readonly toast = inject(ToastService);

  readonly kind = signal<OrganizationFormKind>('company');
  readonly saving = signal(false);
  readonly currentCompany = signal<Empresa | null>(null);
  readonly currentArea = signal<Area | null>(null);
  readonly detail = signal<OrganizacionDetalle | null>(null);
  readonly companyOptions = signal<readonly AdminSelectOption[]>([]);
  readonly areaOptions = signal<readonly Area[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);

  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly companyIcon = faBuilding;
  readonly associationIcon = faUserGroup;
  readonly areaIcon = faSitemap;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly companyForm = this.fb.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
    nombreComercial: ['', [Validators.maxLength(160)]],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    centroPobladoId: [0],
    referencia: ['', [Validators.maxLength(300)]],
    fechaConstitucion: [''],
    numeroPartida: ['', [Validators.maxLength(50)]],
  });

  readonly areaForm = this.fb.nonNullable.group({
    empresaId: [0, [Validators.required, Validators.min(1)]],
    areaPadreId: [0],
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
  });

  openCompany(detail: OrganizacionDetalle | null = null): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('company');
    this.detail.set(detail);
    this.currentCompany.set(detail?.organizacion ?? null);
    this.resetCompanyForm(detail);
    return this.show();
  }

  openAssociation(detail: OrganizacionDetalle | null = null): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('association');
    this.detail.set(detail);
    this.currentCompany.set(detail?.organizacion ?? null);
    this.resetCompanyForm(detail);
    return this.show();
  }

  openArea(options: AreaModalOptions, area: Area | null = null): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('area');
    this.currentArea.set(area);
    this.companyOptions.set(options.companies);
    this.areaOptions.set(options.areas);
    this.areaForm.reset({
      empresaId: area?.empresaId ?? options.companies[0]?.value ?? 0,
      areaPadreId: area?.areaPadreId ?? 0,
      codigo: area?.codigo ?? '',
      nombre: area?.nombre ?? '',
    });
    this.areaForm.controls.empresaId[area ? 'disable' : 'enable']({ emitEvent: false });
    this.areaForm.controls.codigo[area ? 'disable' : 'enable']({ emitEvent: false });
    return this.show();
  }

  openView(detail: OrganizacionDetalle): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('view');
    this.detail.set(detail);
    this.currentCompany.set(detail.organizacion);
    return this.show();
  }

  setGeography(selection: GeographySelection): void {
    this.companyForm.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.companyForm.controls.distritoCodigo.markAsTouched();
  }

  save(): void {
    if (this.kind() === 'view') {
      this.close();
      return;
    }
    if (this.kind() === 'area') {
      this.saveArea();
      return;
    }
    this.saveOrganization();
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  areasForSelectedCompany(): readonly Area[] {
    const companyId = this.areaForm.getRawValue().empresaId;
    const currentAreaId = this.currentArea()?.areaId ?? null;
    return this.areaOptions().filter(
      (area) =>
        area.empresaId === companyId &&
        area.areaId !== currentAreaId &&
        area.estado,
    );
  }

  title(): string {
    if (this.kind() === 'view') return 'Detalle de organización';
    const editing = Boolean(this.kind() === 'area' ? this.currentArea() : this.currentCompany());
    if (this.kind() === 'association') return editing ? 'Editar asociación' : 'Registrar asociación';
    if (this.kind() === 'area') return editing ? 'Editar área' : 'Registrar área';
    return editing ? 'Editar empresa' : 'Registrar empresa';
  }

  icon() {
    if (this.kind() === 'association') return this.associationIcon;
    if (this.kind() === 'area') return this.areaIcon;
    return this.companyIcon;
  }

  private resetCompanyForm(detail: OrganizacionDetalle | null): void {
    const company = detail?.organizacion ?? null;
    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(detail?.centroPobladoId ?? null);

    this.companyForm.reset({
      ruc: company?.ruc ?? '',
      razonSocial: company?.razonSocial ?? '',
      nombreComercial: company?.nombreComercial ?? '',
      telefono: company?.telefono ?? '',
      correo: company?.correo ?? '',
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      fechaConstitucion: company?.fechaConstitucion ?? '',
      numeroPartida: company?.numeroPartida ?? '',
    });
    this.companyForm.controls.ruc[company ? 'disable' : 'enable']({ emitEvent: false });
  }

  private saveOrganization(): void {
    this.companyForm.markAllAsTouched();
    if (this.companyForm.invalid || this.saving()) return;

    const values = this.companyForm.getRawValue();
    const current = this.currentCompany();
    const association = this.kind() === 'association';

    this.saving.set(true);
    this.errorMessage.set(null);

    const common = {
      razonSocial: values.razonSocial.trim(),
      nombreComercial: values.nombreComercial.trim() || undefined,
      telefono: values.telefono.trim() || undefined,
      correo: values.correo.trim() || undefined,
      ubicacion: {
        distritoCodigo: values.distritoCodigo.trim(),
        centroPobladoId:
          Number(values.centroPobladoId) > 0
            ? Number(values.centroPobladoId)
            : undefined,
        referencia: values.referencia.trim() || undefined,
      },
    };

    const operation: Observable<unknown> = association
      ? current
        ? this.updateAssociationUseCase.execute(current.empresaId, {
            ...common,
            fechaConstitucion: values.fechaConstitucion || undefined,
            numeroPartida: values.numeroPartida.trim() || undefined,
          })
        : this.createAssociationUseCase.execute({
            ruc: values.ruc.trim(),
            ...common,
            fechaConstitucion: values.fechaConstitucion || undefined,
            numeroPartida: values.numeroPartida.trim() || undefined,
          })
      : current
        ? this.updateCompanyUseCase.execute(current.empresaId, common)
        : this.createCompanyUseCase.execute({ ruc: values.ruc.trim(), ...common });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            association
              ? current ? 'Asociación actualizada' : 'Asociación registrada'
              : current ? 'Empresa actualizada' : 'Empresa registrada',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo guardar la organización', message);
        },
      });
  }

  private saveArea(): void {
    const current = this.currentArea();

    if (!current) {
      const values = this.areaForm.getRawValue();
      this.areaForm.controls.codigo.setValue(
        buildSystemCode(`AREA_${Number(values.empresaId)}`, values.nombre, 30),
        { emitEvent: false },
      );
    }

    this.areaForm.markAllAsTouched();
    if (this.areaForm.invalid || this.saving()) return;

    const values = this.areaForm.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    const areaPadreId = Number(values.areaPadreId) > 0
      ? Number(values.areaPadreId)
      : undefined;

    const operation: Observable<unknown> = current
      ? this.updateAreaUseCase.execute(current.areaId, {
          areaPadreId,
          nombre: values.nombre.trim(),
        })
      : this.createAreaUseCase.execute({
          empresaId: Number(values.empresaId),
          areaPadreId,
          codigo: values.codigo.trim().toUpperCase(),
          nombre: values.nombre.trim(),
        });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(current ? 'Área actualizada' : 'Área registrada');
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error('No se pudo guardar el área', message);
        },
      });
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private resetState(): void {
    this.errorMessage.set(null);
    this.currentCompany.set(null);
    this.currentArea.set(null);
    this.detail.set(null);
    this.companyOptions.set([]);
    this.areaOptions.set([]);
    this.initialDistrictCode.set('');
    this.initialPopulationCenterId.set(null);
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.resetState();
  }
}
