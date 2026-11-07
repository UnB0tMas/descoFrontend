import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { InventarioVehiculosHttpMapper } from './inventario-vehiculos-http.mapper';
import { AdminApiMapper } from '../../../../../administracion/shared/admin-api.mapper';

describe('InventarioVehiculosHttpMapper', () => {
  let mapper: InventarioVehiculosHttpMapper;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), AdminApiMapper, InventarioVehiculosHttpMapper] });
    mapper = TestBed.inject(InventarioVehiculosHttpMapper);
  });

  it('recognizes the current API vehicle without a legacy flag or plate', () => {
    const detail = mapper.detail({ exitoso: true, datos: {
      bienInventarioId: 9, tipoBienId: 4, tipoVehiculo: 'CAMIONETA',
      placa: null, kilometrajeKm: 0, color: 'Blanco', estado: true,
    }});
    expect(detail.vehiculo).toBeTrue();
    expect(detail.placa).toBeNull();
    expect(detail.kilometrajeKm).toBe(0);
    expect(detail.color).toBe('Blanco');
  });
});
