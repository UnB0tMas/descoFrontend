import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal, } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faEye, faFloppyDisk, faKey, faLock, faPen, faPlus, faRotate, faShieldHalved, faXmark, } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { normalizeOptionalText, normalizeText, notBlankValidator, optionalNotBlankValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { buildSystemCode } from '../../../../../../shared/admin-code.util';
import { closeAnimatedDialog, openAnimatedDialog } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { CrearRolUseCase } from '../../../../../application/use-case/crear-rol.use-case';
import { DeshabilitarRolUseCase } from '../../../../../application/use-case/deshabilitar-rol.use-case';
import { EditarRolUseCase } from '../../../../../application/use-case/editar-rol.use-case';
import { ListarRolesUseCase } from '../../../../../application/use-case/listar-roles.use-case';
import { Rol } from '../../../../../domain/rol.model';
@Component({
    selector: 'app-roles-list-page',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        FaIconComponent,
        PermissionDirective,
        LoadingStateComponent,
        ErrorStateComponent,
        EmptyStateComponent,
        PaginatorComponent,
        ActionConfirmDialogComponent,
        FormErrorComponent,
        PageHeaderComponent,
    ],
    templateUrl: './roles-list.html',
    styleUrl: './roles-list.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListPage implements OnInit {
    @ViewChild('roleDialog', { static: true })
    private readonly roleDialog!: ElementRef<HTMLDialogElement>;
    @ViewChild(ActionConfirmDialogComponent)
    private confirmDialog!: ActionConfirmDialogComponent;
    private readonly fb = inject(FormBuilder);
    private readonly listUseCase = inject(ListarRolesUseCase);
    private readonly createUseCase = inject(CrearRolUseCase);
    private readonly updateUseCase = inject(EditarRolUseCase);
    private readonly disableUseCase = inject(DeshabilitarRolUseCase);
    private readonly toast = inject(ToastService);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly disablingId = signal<number | null>(null);
    readonly errorMessage = signal<string | null>(null);
    readonly modalError = signal<string | null>(null);
    readonly currentRole = signal<Rol | null>(null);
    readonly result = signal<PageResult<Rol>>(emptyPageResult(20));
    readonly pageIcon = faShieldHalved;
    readonly addIcon = faPlus;
    readonly viewIcon = faEye;
    readonly editIcon = faPen;
    readonly permissionsIcon = faKey;
    readonly disableIcon = faBan;
    readonly refreshIcon = faRotate;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly lockIcon = faLock;
    readonly form = this.fb.nonNullable.group({
        codigo: ['', [Validators.required, Validators.maxLength(40)]],
        nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(100)]],
        descripcion: ['', [optionalNotBlankValidator, Validators.maxLength(200)]],
        requiereSegundoFactor: [false],
    });
    ngOnInit(): void {
        this.load(1);
    }
    load(page = this.result().page, size = this.result().size): void {
        this.loading.set(true);
        this.errorMessage.set(null);
        this.listUseCase
            .execute(page, size)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
            next: (result) => this.result.set(result),
            error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
        });
    }
    openCreate(): void {
        this.currentRole.set(null);
        this.modalError.set(null);
        this.form.reset({
            codigo: '',
            nombre: '',
            descripcion: '',
            requiereSegundoFactor: false,
        });
        this.form.controls.codigo.enable({ emitEvent: false });
        openAnimatedDialog(this.roleDialog.nativeElement);
    }
    openEdit(role: Rol): void {
        if (role.esSistema) {
            return;
        }
        this.currentRole.set(role);
        this.modalError.set(null);
        this.form.reset({
            codigo: role.codigo,
            nombre: role.nombre,
            descripcion: role.descripcion ?? '',
            requiereSegundoFactor: role.requiereSegundoFactor,
        });
        this.form.controls.codigo.disable({ emitEvent: false });
        openAnimatedDialog(this.roleDialog.nativeElement);
    }
    closeModal(): void {
        if (this.saving()) {
            return;
        }
        closeAnimatedDialog(this.roleDialog.nativeElement, () => {
            this.currentRole.set(null);
            this.modalError.set(null);
        });
    }
    save(): void {
        const current = this.currentRole();

        if (!current) {
            this.form.controls.codigo.setValue(buildSystemCode('ROL', this.form.controls.nombre.value, 40), {
                emitEvent: false,
            });
        }

        this.form.markAllAsTouched();

        if (this.form.invalid || this.saving()) {
            return;
        }

        const values = this.form.getRawValue();
        this.saving.set(true);
        this.modalError.set(null);
        const operation: Observable<unknown> = current
            ? this.updateUseCase.execute(current.rolId, {
                nombre: normalizeText(values.nombre),
                descripcion: normalizeOptionalText(values.descripcion),
                requiereSegundoFactor: values.requiereSegundoFactor,
            })
            : this.createUseCase.execute({
                codigo: values.codigo.trim().toUpperCase(),
                nombre: normalizeText(values.nombre),
                descripcion: normalizeOptionalText(values.descripcion),
                requiereSegundoFactor: values.requiereSegundoFactor,
            });
        operation
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
            next: () => {
                this.toast.success(current ? 'Rol actualizado' : 'Rol registrado');
                this.closeModal();
                this.load(current ? this.result().page : 1);
            },
            error: (error) => this.modalError.set(mapOpenApiError(error).message),
        });
    }
    async disable(role: Rol): Promise<void> {
        if (role.esSistema || this.disablingId()) {
            return;
        }
        const confirmation = await this.confirmDialog.show({
            title: 'Deshabilitar rol',
            message: `El rol "${role.nombre}" se deshabilitará y sus asignaciones activas serán retiradas.`,
            tone: 'danger',
            confirmLabel: 'Deshabilitar',
            cancelLabel: 'Cancelar',
            requiresReason: true,
            reasonLabel: 'Motivo',
            reasonPlaceholder: 'Indica el motivo de la deshabilitación.',
            minimumReasonLength: 5,
        });
        if (!confirmation.confirmed || !confirmation.reason) {
            return;
        }
        this.disablingId.set(role.rolId);
        this.disableUseCase
            .execute(role.rolId, confirmation.reason)
            .pipe(finalize(() => this.disablingId.set(null)))
            .subscribe({
            next: () => {
                this.toast.success('Rol deshabilitado');
                this.load();
            },
            error: (error) => this.toast.error('No se pudo deshabilitar el rol', mapOpenApiError(error).message),
        });
    }
}
