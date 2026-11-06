import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { finalize, forkJoin } from 'rxjs';

import {
  GeographyItem,
} from '../../../core/reference-data/reference-data.model';
import { ReferenceDataService } from '../../../core/reference-data/reference-data.service';

export interface GeographySelection {
  departmentCode: string;
  provinceCode: string;
  districtCode: string;
  populationCenterId: number | null;
}

@Component({
  selector: 'app-geography-cascade',
  standalone: true,
  templateUrl: './geography-cascade.html',
  styleUrl: './geography-cascade.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeographyCascadeComponent implements OnInit, OnChanges {
  @Input() districtCode = '';
  @Input() populationCenterId: number | null = null;
  @Input() disabled = false;
  @Input() locationLocked = false;
  @Input() populationCenterLocked = false;
  @Input() populationCenterOnly = false;

  @Output() readonly selectionChange =
    new EventEmitter<GeographySelection>();

  private readonly references = inject(ReferenceDataService);
  private initialized = false;
  private synchronizationVersion = 0;
  private retryAction: (() => void) | null = null;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly departments = signal<readonly GeographyItem[]>([]);
  readonly provinces = signal<readonly GeographyItem[]>([]);
  readonly districts = signal<readonly GeographyItem[]>([]);
  readonly populationCenters = signal<readonly GeographyItem[]>([]);

  readonly selectedDepartment = signal('');
  readonly selectedProvince = signal('');
  readonly selectedDistrict = signal('');
  readonly selectedPopulationCenter = signal<number | null>(null);

  ngOnInit(): void {
    this.initialized = true;
    this.synchronizeFromInputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.initialized &&
      (changes['districtCode'] || changes['populationCenterId'])
    ) {
      this.synchronizeFromInputs();
    }
  }

  changeDepartment(value: string): void {
    const departmentCode = value.trim();

    this.selectedDepartment.set(departmentCode);
    this.selectedProvince.set('');
    this.selectedDistrict.set('');
    this.selectedPopulationCenter.set(null);
    this.provinces.set([]);
    this.districts.set([]);
    this.populationCenters.set([]);
    this.emitSelection();

    if (!departmentCode) {
      this.retryAction = null;
      this.errorMessage.set(null);
      return;
    }

    this.loadProvinces(departmentCode);
  }

  changeProvince(value: string): void {
    const provinceCode = value.trim();

    this.selectedProvince.set(provinceCode);
    this.selectedDistrict.set('');
    this.selectedPopulationCenter.set(null);
    this.districts.set([]);
    this.populationCenters.set([]);
    this.emitSelection();

    if (!provinceCode) {
      this.retryAction = null;
      this.errorMessage.set(null);
      return;
    }

    this.loadDistricts(provinceCode);
  }

  changeDistrict(value: string): void {
    const districtCode = value.trim();

    this.selectedDistrict.set(districtCode);
    this.selectedPopulationCenter.set(null);
    this.populationCenters.set([]);
    this.emitSelection();

    if (!districtCode) {
      this.retryAction = null;
      this.errorMessage.set(null);
      return;
    }

    this.loadPopulationCenters(districtCode);
  }

  changePopulationCenter(value: string): void {
    const numeric = Number(value);

    this.selectedPopulationCenter.set(
      Number.isFinite(numeric) && numeric > 0
        ? numeric
        : null,
    );

    this.emitSelection();
  }

  retryLoad(): void {
    if (this.loading()) {
      return;
    }

    const action = this.retryAction;

    if (action) {
      action();
      return;
    }

    this.synchronizeFromInputs();
  }

  private loadProvinces(departmentCode: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.retryAction = () => this.loadProvinces(departmentCode);

    this.references
      .provinces(departmentCode)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.provinces.set(items);
          this.retryAction = null;
        },
        error: () => {
          this.provinces.set([]);
          this.errorMessage.set(
            'No se pudieron cargar las provincias.',
          );
        },
      });
  }

  private loadDistricts(provinceCode: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.retryAction = () => this.loadDistricts(provinceCode);

    this.references
      .districts(provinceCode)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.districts.set(items);
          this.retryAction = null;
        },
        error: () => {
          this.districts.set([]);
          this.errorMessage.set(
            'No se pudieron cargar los distritos.',
          );
        },
      });
  }

  private loadPopulationCenters(districtCode: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.retryAction = () =>
      this.loadPopulationCenters(districtCode);

    this.references
      .populationCenters(districtCode)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.populationCenters.set(items);
          this.retryAction = null;
        },
        error: () => {
          this.populationCenters.set([]);
          this.errorMessage.set(
            'No se pudieron cargar los centros poblados.',
          );
        },
      });
  }

  private synchronizeFromInputs(): void {
    const version = ++this.synchronizationVersion;
    const districtCode = (this.districtCode ?? '').trim();
    const departmentCode = districtCode.length >= 2
      ? districtCode.slice(0, 2)
      : '';
    const provinceCode = districtCode.length >= 4
      ? districtCode.slice(0, 4)
      : '';
    const populationCenterId =
      this.populationCenterId && this.populationCenterId > 0
        ? this.populationCenterId
        : null;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.retryAction = () => this.synchronizeFromInputs();

    if (!districtCode) {
      this.selectedDepartment.set('');
      this.selectedProvince.set('');
      this.selectedDistrict.set('');
      this.selectedPopulationCenter.set(null);
      this.provinces.set([]);
      this.districts.set([]);
      this.populationCenters.set([]);

      this.references
        .departments()
        .pipe(finalize(() => {
          if (version === this.synchronizationVersion) {
            this.loading.set(false);
          }
        }))
        .subscribe({
          next: (items) => {
            if (version !== this.synchronizationVersion) {
              return;
            }

            this.departments.set(items);
            this.retryAction = null;
          },
          error: () => {
            if (version !== this.synchronizationVersion) {
              return;
            }

            this.departments.set([]);
            this.errorMessage.set(
              'No se pudo cargar la ubicación.',
            );
          },
        });

      return;
    }

    /*
     * Conservamos la selección proveniente de la entidad mientras se
     * recargan las opciones. Ante una falla temporal no se borra del
     * formulario el distrito que ya estaba guardado.
     */
    this.selectedDepartment.set(departmentCode);
    this.selectedProvince.set(provinceCode);
    this.selectedDistrict.set(districtCode);
    this.selectedPopulationCenter.set(populationCenterId);

    forkJoin({
      departments: this.references.departments(),
      provinces: this.references.provinces(departmentCode),
      districts: this.references.districts(provinceCode),
      populationCenters:
        this.references.populationCenters(districtCode),
    })
      .pipe(finalize(() => {
        if (version === this.synchronizationVersion) {
          this.loading.set(false);
        }
      }))
      .subscribe({
        next: (result) => {
          if (version !== this.synchronizationVersion) {
            return;
          }

          this.departments.set(result.departments);
          this.provinces.set(result.provinces);
          this.districts.set(result.districts);
          this.populationCenters.set(result.populationCenters);
          this.retryAction = null;
        },
        error: () => {
          if (version !== this.synchronizationVersion) {
            return;
          }

          this.errorMessage.set(
            'No se pudo cargar la ubicación seleccionada.',
          );
        },
      });
  }

  private emitSelection(): void {
    this.selectionChange.emit({
      departmentCode: this.selectedDepartment(),
      provinceCode: this.selectedProvince(),
      districtCode: this.selectedDistrict(),
      populationCenterId:
        this.selectedPopulationCenter(),
    });
  }
}
