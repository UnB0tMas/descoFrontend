import { claveRecursoE2, verificarDisponibilidadE2 } from './salida-operativa-stock';
import { RecursoOpcionE2 } from './salida-operativa.model';

const material = (tecnico:number, comercial:number): RecursoOpcionE2 => ({
  id:7, tipo:'CONSUMIBLE', nombre:'Tijera podadora', unidad:'und',
  disponible:tecnico+comercial, disponibleTecnico:tecnico, disponibleComercial:comercial,
});

describe('salida operativa E2 - disponibilidad', () => {
  it('admite suministros técnicos suficientes', () => {
    expect(verificarDisponibilidadE2(material(2,0),1).valido).toBeTrue();
    expect(verificarDisponibilidadE2(material(2,0),1).trasladoComercial).toBeFalse();
  });
  it('permite usar existencias comerciales y marca el traslado para aprobación', () => {
    const estado=verificarDisponibilidadE2(material(0,4),3);
    expect(estado.valido).toBeTrue();
    expect(estado.trasladoComercial).toBeTrue();
  });
  it('rechaza stock cero o insuficiente', () => {
    expect(verificarDisponibilidadE2(material(0,0),1).valido).toBeFalse();
    expect(verificarDisponibilidadE2(material(1,1),3).valido).toBeFalse();
  });
  it('para vehículo exige disponibilidad y cantidad unitaria', () => {
    const camion:RecursoOpcionE2={id:8,tipo:'VEHICULO',nombre:'Vehículo',disponible:0};
    expect(verificarDisponibilidadE2(camion,1).valido).toBeFalse();
    camion.disponible=1;
    expect(verificarDisponibilidadE2(camion,2).valido).toBeFalse();
    expect(verificarDisponibilidadE2(camion,1).valido).toBeTrue();
  });
  it('usa claves diferenciadas por tipo', () => {
    expect(claveRecursoE2(material(1,1))).not.toBe(claveRecursoE2({tipo:'VEHICULO',id:7}));
  });
});
