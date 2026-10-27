import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faPen, faPlus, faTruck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ActualizarKilometrajeUseCase } from '../../../../../application/use-case/actualizar-kilometraje.use-case';
import { CrearBienUseCase } from '../../../../../application/use-case/crear-bien.use-case';
import { CrearSuministroUseCase } from '../../../../../application/use-case/crear-suministro.use-case';
import { EditarBienUseCase } from '../../../../../application/use-case/editar-bien.use-case';
import { EditarSuministroUseCase } from '../../../../../application/use-case/editar-suministro.use-case';
import { RegistrarMovimientoSuministroUseCase } from '../../../../../application/use-case/registrar-movimiento-suministro.use-case';
import { RegistrarVehiculoUseCase } from '../../../../../application/use-case/registrar-vehiculo.use-case';
import { BienInventario } from '../../../../../domain/bien-inventario.model';
import { TipoMovimientoSuministro } from '../../../../../domain/movimiento-suministro.model';
import { Suministro } from '../../../../../domain/suministro.model';
type RecursoFormMode = 'createAsset' | 'editAsset' | 'vehicle' | 'mileage' | 'createSupply' | 'editSupply' | 'movement';
interface FormOptions {
    companies?: readonly AdminSelectOption[];
    assetTypes?: readonly AdminSelectOption[];
    asset?: BienInventario | null;
    supply?: Suministro | null;
}
@Component({ selector: 'app-recurso-form', standalone: true, imports: [NgTemplateOutlet, ReactiveFormsModule, FaIconComponent], templateUrl: './recurso-form.html', styleUrl: './recurso-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class RecursoFormComponent {
    @ViewChild('dialog', { static: true })
    private readonly dialogRef!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly createAsset = inject(CrearBienUseCase);
    private readonly updateAsset = inject(EditarBienUseCase);
    private readonly registerVehicle = inject(RegistrarVehiculoUseCase);
    private readonly updateMileage = inject(ActualizarKilometrajeUseCase);
    private readonly createSupply = inject(CrearSuministroUseCase);
    private readonly updateSupply = inject(EditarSuministroUseCase);
    private readonly movement = inject(RegistrarMovimientoSuministroUseCase);
    private readonly toast = inject(ToastService);
    readonly mode = signal<RecursoFormMode>('createAsset');
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly asset = signal<BienInventario | null>(null);
    readonly supply = signal<Suministro | null>(null);
    readonly companies = signal<readonly AdminSelectOption[]>([]);
    readonly assetTypes = signal<readonly AdminSelectOption[]>([]);
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly addIcon = faPlus;
    readonly editIcon = faPen;
    readonly vehicleIcon = faTruck;
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly assetForm = this.fb.nonNullable.group({ empresaId: [0, [Validators.required, Validators.min(1)]], tipoBienId: [0, [Validators.required, Validators.min(1)]], codigoPatrimonial: ['', [Validators.required, Validators.maxLength(80)]], nombre: ['', [Validators.required, Validators.maxLength(150)]], marca: ['', [Validators.maxLength(80)]], modelo: ['', [Validators.maxLength(80)]], serie: ['', [Validators.maxLength(100)]], estadoBien: ['DISPONIBLE', [Validators.required]] });
    readonly vehicleForm = this.fb.nonNullable.group({ placa: ['', [Validators.required, Validators.maxLength(20)]], tipoVehiculo: ['', [Validators.required, Validators.maxLength(40)]], kilometrajeKm: [0, [Validators.required, Validators.min(0)]] });
    readonly supplyForm = this.fb.nonNullable.group({ codigo: ['', [Validators.required, Validators.maxLength(50)]], nombre: ['', [Validators.required, Validators.maxLength(150)]], unidadMedida: ['', [Validators.required, Validators.maxLength(30)]], stockInicial: [0, [Validators.required, Validators.min(0)]] });
    readonly movementForm = this.fb.nonNullable.group({ tipoMovimiento: ['ENTRADA', [Validators.required]], cantidad: [0, [Validators.required, Validators.min(.001)]], documentoReferencia: ['', [Validators.maxLength(100)]], observacion: ['', [Validators.maxLength(500)]] });
    open(mode: RecursoFormMode, options: FormOptions = {}): Promise<AdminModalResult> { this.mode.set(mode); this.asset.set(options.asset ?? null); this.supply.set(options.supply ?? null); this.companies.set(options.companies ?? []); this.assetTypes.set(options.assetTypes ?? []); this.errorMessage.set(null); const a = options.asset; const s = options.supply; this.assetForm.reset({ empresaId: a?.empresaId ?? options.companies?.[0]?.value ?? 0, tipoBienId: a?.tipoBienId ?? options.assetTypes?.[0]?.value ?? 0, codigoPatrimonial: a?.codigoPatrimonial ?? '', nombre: a?.nombre ?? '', marca: a?.marca ?? '', modelo: a?.modelo ?? '', serie: a?.serie ?? '', estadoBien: a?.estadoBien ?? 'DISPONIBLE' }); this.vehicleForm.reset({ placa: a?.placa ?? '', tipoVehiculo: a?.tipoVehiculo ?? '', kilometrajeKm: a?.kilometrajeKm ?? 0 }); this.supplyForm.reset({ codigo: s?.codigo ?? '', nombre: s?.nombre ?? '', unidadMedida: s?.unidadMedida ?? '', stockInicial: s?.stock ?? 0 }); this.movementForm.reset({ tipoMovimiento: 'ENTRADA', cantidad: 0, documentoReferencia: '', observacion: '' }); this.dialogRef.nativeElement.showModal(); return new Promise(r => this.resolver = r); }
    close(): void { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    title(): string { const mode: RecursoFormMode = this.mode(); return ({ createAsset: 'Registrar bien', editAsset: 'Editar bien', vehicle: 'Registrar vehículo', mileage: 'Actualizar kilometraje', createSupply: 'Registrar suministro', editSupply: 'Editar suministro', movement: 'Registrar movimiento' } as Record<RecursoFormMode, string>)[mode]; }
    save(): void {
        if (this.saving())
            return;
        let op: Observable<unknown> | null = null;
        let success = 'Operación completada';
        const m = this.mode();
        if (m === 'createAsset' || m === 'editAsset') {
            this.assetForm.markAllAsTouched();
            if (this.assetForm.invalid)
                return;
            const v = this.assetForm.getRawValue();
            op = m === 'createAsset' ? this.createAsset.execute({ empresaId: Number(v.empresaId), tipoBienId: Number(v.tipoBienId), codigoPatrimonial: v.codigoPatrimonial.trim().toUpperCase(), nombre: v.nombre.trim(), marca: v.marca.trim() || undefined, modelo: v.modelo.trim() || undefined, serie: v.serie.trim() || undefined }) : this.updateAsset.execute(this.asset()!.bienInventarioId, { nombre: v.nombre.trim(), marca: v.marca.trim() || undefined, modelo: v.modelo.trim() || undefined, serie: v.serie.trim() || undefined, estadoBien: v.estadoBien });
            success = m === 'createAsset' ? 'Bien registrado' : 'Bien actualizado';
        }
        else if (m === 'vehicle' || m === 'mileage') {
            this.vehicleForm.markAllAsTouched();
            if (this.vehicleForm.invalid || !this.asset())
                return;
            const v = this.vehicleForm.getRawValue();
            op = m === 'vehicle' ? this.registerVehicle.execute(this.asset()!.bienInventarioId, { placa: v.placa.trim().toUpperCase(), tipoVehiculo: v.tipoVehiculo.trim().toUpperCase(), kilometrajeKm: Number(v.kilometrajeKm) }) : this.updateMileage.execute(this.asset()!.bienInventarioId, { kilometrajeKm: Number(v.kilometrajeKm) });
            success = m === 'vehicle' ? 'Vehículo registrado' : 'Kilometraje actualizado';
        }
        else if (m === 'createSupply' || m === 'editSupply') {
            this.supplyForm.markAllAsTouched();
            if (this.supplyForm.invalid)
                return;
            const v = this.supplyForm.getRawValue();
            op = m === 'createSupply' ? this.createSupply.execute({ codigo: v.codigo.trim().toUpperCase(), nombre: v.nombre.trim(), unidadMedida: v.unidadMedida.trim().toUpperCase(), stockInicial: Number(v.stockInicial) }) : this.updateSupply.execute(this.supply()!.suministroId, { nombre: v.nombre.trim(), unidadMedida: v.unidadMedida.trim().toUpperCase() });
            success = m === 'createSupply' ? 'Suministro registrado' : 'Suministro actualizado';
        }
        else {
            this.movementForm.markAllAsTouched();
            if (this.movementForm.invalid || !this.supply())
                return;
            const v = this.movementForm.getRawValue();
            op = this.movement.execute(this.supply()!.suministroId, { tipoMovimiento: v.tipoMovimiento as TipoMovimientoSuministro, cantidad: Number(v.cantidad), documentoReferencia: v.documentoReferencia.trim() || undefined, observacion: v.observacion.trim() || undefined });
            success = 'Movimiento registrado';
        }
        this.saving.set(true);
        this.errorMessage.set(null);
        op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(success); this.finish({ saved: true, value: null }); }, error: e => this.errorMessage.set(mapOpenApiError(e).message) });
    }
    private finish(r: AdminModalResult): void { if (this.dialogRef.nativeElement.open)
        this.dialogRef.nativeElement.close(); this.resolver?.(r); this.resolver = null; }
}
