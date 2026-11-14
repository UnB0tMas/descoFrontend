import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faFloppyDisk,
  faReceipt,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, Observable } from 'rxjs';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { CrearGastoUseCase } from '../../../../../application/use-case/crear-gasto.use-case';
import { EditarGastoUseCase } from '../../../../../application/use-case/editar-gasto.use-case';
import { Gasto } from '../../../../../domain/gasto.model';
import { EvidencePanelComponent } from '../../../../../../../documentos-evidencias/adapter/in/ui/components/evidence-panel/evidence-panel';
import { EvidenciaContexto } from '../../../../../../../documentos-evidencias/domain/evidencia-contexto.model';

interface CatalogOption {
  value: number;
  label: string;
  code: string;
}

export interface GastoFormResult {
  saved: boolean;
  id?: number;
  reglaCodigo?: string;
  concepto?: string;
  importe?: number;
}

@Component({
  selector: 'app-gasto-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, EvidencePanelComponent],
  templateUrl: './gasto-form.html',
  styleUrl: './gasto-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GastoFormComponent {
  @ViewChild('dialog', { static: true })
  private dialog!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly create = inject(CrearGastoUseCase);
  private readonly update = inject(EditarGastoUseCase);
  private readonly refs = inject(ReferenceDataService);
  private readonly toast = inject(ToastService);

  private resolver: ((r: GastoFormResult) => void) | null = null;

  readonly current = signal<Gasto | null>(null);
  readonly contextoComprobantes = computed<EvidenciaContexto | null>(() => this.current()?.gastoCampaniaId ? { tipo:'GASTO', id:this.current()!.gastoCampaniaId } : null);
  readonly saving = signal(false);
  readonly referencesLoading = signal(false);
  readonly modoE5Igualitario=signal(false);
  readonly error = signal<string | null>(null);
  readonly expenseTypes = signal<readonly CatalogOption[]>([]);
  readonly buscadorTipo = signal('');
  readonly reglaSeleccionada = signal(0);
  readonly tiposFiltrados = computed(() => {
    const q = this.buscadorTipo().trim().toLocaleLowerCase();
    return this.expenseTypes().filter(x=> !q || x.label.toLocaleLowerCase().includes(q));
  });
  readonly distributionRules = signal<readonly CatalogOption[]>([]);
  readonly reglaDescripcion = computed(() => {
    const regla = this.distributionRules().find(x => x.value === this.reglaSeleccionada())?.code.toUpperCase();
    switch(regla) {
      case 'IGUAL': case 'DI-0000001': return 'El gasto se divide por igual entre los socios con ventas confirmadas.';
      case 'PESO_ACEPTADO': return 'El gasto se reparte según los kilos aceptados de cada socio.';
      case 'VENTA_BRUTA': return 'El gasto se reparte según el valor bruto vendido (kg × precio base) de cada socio.';
      case 'MANUAL': return 'Después de registrar el gasto, selecciona los socios y sus importes en Distribuir gasto.';
      default: return 'Selecciona cómo se distribuirá este gasto entre los socios.';
    }
  });

  readonly pageIcon = faReceipt;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;

  readonly form = this.fb.nonNullable.group({
    campaniaVentaId: [0, [Validators.required, Validators.min(1)]],
    operativoVentaId: [0],
    tipoGastoId: [0, [Validators.required, Validators.min(1)]],
    reglaProrrateoId: [0, [Validators.required, Validators.min(1)]],
    fecha: ['', Validators.required],
    concepto: ['', [Validators.required, Validators.maxLength(250)]],
    importe: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['PEN', [Validators.required, Validators.maxLength(3)]],
  });

  constructor(){
    this.form.controls.reglaProrrateoId.valueChanges.subscribe(value => this.reglaSeleccionada.set(Number(value)));
    this.form.controls.tipoGastoId.valueChanges.subscribe(() => this.actualizarConceptoAutomatico());
  }

  private actualizarConceptoAutomatico(): void {
    if (!this.modoE5Igualitario()) return;
    const id = Number(this.form.controls.tipoGastoId.value);
    const tipo = this.expenseTypes().find(item => item.value === id);
    this.form.controls.concepto.setValue(tipo?.label.trim() ?? '', { emitEvent: false });
  }

  private fechaLocal(): string {
    const hoy = new Date();
    return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  open(x?: Gasto, campaniaPreseleccionada?: number): Promise<GastoFormResult> {
    this.current.set(x ?? null);
    this.modoE5Igualitario.set(!!campaniaPreseleccionada);
    this.error.set(null);
    this.buscadorTipo.set('');
    this.reglaSeleccionada.set(x?.reglaProrrateoId ?? 0);

    this.form.reset({
      campaniaVentaId: x?.campaniaVentaId ?? campaniaPreseleccionada ?? 0,
      operativoVentaId: x?.operativoVentaId ?? 0,
      tipoGastoId: x?.tipoGastoId ?? 0,
      reglaProrrateoId: x?.reglaProrrateoId ?? 0,
      fecha: x?.fecha ?? this.fechaLocal(),
      concepto: x?.concepto ?? '',
      importe: x?.importe ?? 0,
      moneda: x?.moneda ?? 'PEN',
    });

    this.form.controls.campaniaVentaId.enable({ emitEvent: false });
    this.form.controls.tipoGastoId.disable({ emitEvent: false });
    this.form.controls.reglaProrrateoId.disable({ emitEvent: false });
    if (campaniaPreseleccionada) this.form.controls.campaniaVentaId.disable({ emitEvent: false });
    this.loadReferences();
    this.dialog.nativeElement.showModal();

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false });
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving() || this.referencesLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.modoE5Igualitario() && !this.distributionRules().some(
      r => this.esReglaIgualitaria(r) && r.value === this.form.getRawValue().reglaProrrateoId
    )) {
      this.error.set('No está disponible la distribución igualitaria.');
      return;
    }

    const v = this.form.getRawValue();
    const x = this.current();
    const tipoSeleccionado = this.expenseTypes().find(item => item.value === Number(v.tipoGastoId));
    if (this.modoE5Igualitario() && !tipoSeleccionado?.label.trim()) {
      this.error.set('Selecciona un tipo de gasto válido.');
      return;
    }
    const common = {
      tipoGastoId: Number(v.tipoGastoId),
      reglaProrrateoId: Number(v.reglaProrrateoId),
      fecha: v.fecha,
      concepto: this.modoE5Igualitario() ? tipoSeleccionado!.label.trim().slice(0, 250) : v.concepto.trim(),
      importe: Number(v.importe),
      moneda: v.moneda.trim().toUpperCase(),
    };

    if (x && x.tipoGastoId===common.tipoGastoId && x.reglaProrrateoId===common.reglaProrrateoId &&
        (x.fecha??'').slice(0,10)===common.fecha && x.concepto.trim()===common.concepto &&
        Number(x.importe)===common.importe && x.moneda.trim().toUpperCase()===common.moneda) {
      this.finish({ saved:false });
      return;
    }
    this.saving.set(true);

    const op: Observable<number | void> = x
      ? this.update.execute(x.gastoCampaniaId, common)
      : this.create.execute({
          ...common,
          campaniaVentaId: Number(v.campaniaVentaId),
          operativoVentaId:
            Number(v.operativoVentaId) > 0
              ? Number(v.operativoVentaId)
              : undefined,
        });

    op.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (id) => {
        this.toast.success(x ? 'Gasto actualizado' : 'Gasto registrado');
        this.finish({
          saved: true,
          id: typeof id === 'number' ? id : x?.gastoCampaniaId,
          reglaCodigo: this.distributionRules().some(r=>r.value===common.reglaProrrateoId && this.esReglaIgualitaria(r))?'IGUAL':undefined,
          concepto: common.concepto,
          importe: common.importe,
        });
      },
      error: (e) => {
        const message = mapOpenApiError(e).message;
        this.error.set(message);
        this.toast.error(
          x ? 'No se pudo actualizar el gasto' : 'No se pudo registrar el gasto',
          message,
        );
      },
    });
  }

  private esReglaIgualitaria(regla: CatalogOption): boolean {
    const codigo=regla.code.trim().toUpperCase();
    return codigo==='IGUAL' || /^DI-\d+$/.test(codigo) ||
      regla.label.toLocaleLowerCase().includes('igualitaria');
  }

  private loadReferences(): void {
    this.referencesLoading.set(true);

    forkJoin({
      types: this.refs.catalog('TIPO_GASTO'),
      rules: this.refs.catalog('REGLA_PRORRATEO'),
    })
      .pipe(finalize(() => {
        this.referencesLoading.set(false);
        this.form.controls.tipoGastoId.enable({ emitEvent: false });
        if (!this.modoE5Igualitario()) this.form.controls.reglaProrrateoId.enable({ emitEvent: false });
      }))
      .subscribe({
        next: ({ types, rules }) => {
          this.expenseTypes.set(
            types
              .map((item) => ({
                value: Number(item.id),
                label: item.label,
                code: item.code,
              }))
              .filter((item) => Number.isFinite(item.value) && item.value > 0),
          );
          this.actualizarConceptoAutomatico();

          const reglas=rules
            .map((item) => ({value:Number(item.id),label:item.label,code:item.code}))
            .filter((item) => Number.isFinite(item.value) && item.value > 0);
          const igual=reglas.find(x=>this.esReglaIgualitaria(x));
          this.distributionRules.set(reglas);
          if (this.modoE5Igualitario() && !igual) {
            this.error.set('No está disponible la distribución igualitaria.');
            this.form.controls.reglaProrrateoId.setValue(0);
            this.form.controls.reglaProrrateoId.disable({ emitEvent: false });
          } else if (igual && this.modoE5Igualitario()) {
            this.form.controls.reglaProrrateoId.setValue(igual.value);
            this.form.controls.reglaProrrateoId.disable({ emitEvent: false });
          } else if (igual && !this.current()) {
            this.form.controls.reglaProrrateoId.setValue(igual.value);
          }
        },
        error: () => {
          this.expenseTypes.set([]);
          this.distributionRules.set([]);
          this.error.set(
            'No se pudieron cargar las opciones necesarias para registrar el gasto.',
          );
        },
      });
  }

  private finish(r: GastoFormResult): void {
    if (this.dialog.nativeElement.open) {
      this.dialog.nativeElement.close();
    }

    this.resolver?.(r);
    this.resolver = null;
  }
}
