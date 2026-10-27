import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faLayerGroup, faPen, faPlus, faXmark, } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { normalizeOptionalText, normalizeText, notBlankValidator, optionalNotBlankValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { buildSystemCode } from '../../../../../../shared/admin-code.util';
import { AdminModalResult } from '../../../../../../shared/admin-modal.types';
import { CrearItemCatalogoUseCase } from '../../../../../application/use-case/crear-item-catalogo.use-case';
import { EditarItemCatalogoUseCase } from '../../../../../application/use-case/editar-item-catalogo.use-case';
import { Catalogo } from '../../../../../domain/catalogo.model';
import { CatalogoItem } from '../../../../../domain/catalogo-item.model';
@Component({
    selector: 'app-catalogo-detail',
    standalone: true,
    imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
    templateUrl: './catalogo-detail.html',
    styleUrl: './catalogo-detail.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoDetailComponent {
    @ViewChild('dialog', { static: true })
    private readonly dialogRef!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly createUseCase = inject(CrearItemCatalogoUseCase);
    private readonly updateUseCase = inject(EditarItemCatalogoUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly catalog = signal<Catalogo | null>(null);
    readonly current = signal<CatalogoItem | null>(null);
    readonly errorMessage = signal<string | null>(null);
    readonly closeIcon = faXmark;
    readonly addIcon = faPlus;
    readonly editIcon = faPen;
    readonly saveIcon = faFloppyDisk;
    readonly catalogIcon = faLayerGroup;
    private resolver: ((result: AdminModalResult<CatalogoItem>) => void) | null = null;
    readonly form = this.fb.nonNullable.group({
        codigo: ['', [Validators.required, Validators.maxLength(40)]],
        nombre: ['', [Validators.required, notBlankValidator, Validators.maxLength(150)]],
        descripcion: ['', [optionalNotBlankValidator, Validators.maxLength(300)]],
        categoria: [''],
    });
    open(catalog: Catalogo, item: CatalogoItem | null = null): Promise<AdminModalResult<CatalogoItem>> {
        this.catalog.set(catalog);
        this.current.set(item);
        this.errorMessage.set(null);
        this.form.reset({
            codigo: item?.codigo ?? '',
            nombre: item?.nombre ?? '',
            descripcion: catalog.codigo === 'PROBLEMA_FITOSANITARIO'
                ? ''
                : item?.descripcion ?? '',
            categoria: item?.categoria ?? '',
        });
        this.form.controls.codigo[item ? 'disable' : 'enable']({
            emitEvent: false,
        });
        if (catalog.requiereCategoria) {
            this.form.controls.categoria.setValidators([Validators.required]);
        }
        else {
            this.form.controls.categoria.clearValidators();
        }
        this.form.controls.categoria.updateValueAndValidity({
            emitEvent: false,
        });
        this.dialogRef.nativeElement.showModal();
        return new Promise((resolve) => {
            this.resolver = resolve;
        });
    }
    save(): void {
        const catalog = this.catalog();
        const current = this.current();

        if (catalog && !current) {
            this.form.controls.codigo.setValue(buildSystemCode(catalog.codigo, this.form.controls.nombre.value, 40), {
                emitEvent: false,
            });
        }

        this.form.markAllAsTouched();

        if (!catalog || this.form.invalid || this.saving()) {
            return;
        }
        const raw = this.form.getRawValue();
        this.errorMessage.set(null);
        this.saving.set(true);
        const operation: Observable<unknown> = current
            ? this.updateUseCase.execute(current.id, {
                catalogo: catalog.codigo,
                nombre: normalizeText(raw.nombre),
                descripcion: normalizeOptionalText(raw.descripcion),
                categoria: raw.categoria.trim() || undefined,
            })
            : this.createUseCase.execute({
                catalogo: catalog.codigo,
                codigo: raw.codigo.trim().toUpperCase(),
                nombre: normalizeText(raw.nombre),
                descripcion: normalizeOptionalText(raw.descripcion),
                categoria: raw.categoria.trim().toUpperCase() || undefined,
            });
        operation
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
            next: () => {
                this.toast.success(current ? 'Valor actualizado' : 'Valor registrado');
                this.finish({
                    saved: true,
                    value: current,
                });
            },
            error: (error) => {
                this.errorMessage.set(mapOpenApiError(error).message);
            },
        });
    }
    close(): void {
        if (this.saving()) {
            return;
        }
        this.finish({ saved: false, value: null });
    }
    private finish(result: AdminModalResult<CatalogoItem>): void {
        if (this.dialogRef.nativeElement.open) {
            this.dialogRef.nativeElement.close();
        }
        this.resolver?.(result);
        this.resolver = null;
        this.catalog.set(null);
        this.current.set(null);
        this.errorMessage.set(null);
    }
}
