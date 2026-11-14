import { ChangeDetectionStrategy, Component, Input, ViewChild } from '@angular/core';
import { Observable, map } from 'rxjs';
import { EntityRegistrationModalComponent, EntityDraft, EntityLookupData } from './entity-registration-modal';
import { PersonOwnerChoice, PersonOwnerInput } from './person-owner-picker';

/** Compatibilidad de Fundos/Predios: toda la interfaz y la búsqueda son el único modal compartido. */
@Component({
  selector:'app-person-registration-modal', standalone:true,
  imports:[EntityRegistrationModalComponent],
  templateUrl:'./person-registration-modal.html',
  changeDetection:ChangeDetectionStrategy.OnPush,
})
export class PersonRegistrationModalComponent {
  @Input({required:true}) findPerson!: (type:string, document:string)=>Observable<readonly PersonOwnerChoice[]>;
  @Input({required:true}) savePerson!: (data:PersonOwnerInput)=>Observable<number>;
  @ViewChild(EntityRegistrationModalComponent) private entityModal!: EntityRegistrationModalComponent;

  async open(type='DNI', document='', mode:'manual'|'lookup'='manual'):Promise<PersonOwnerChoice|null> {
    const lookup={person:null as PersonOwnerChoice|null};
    const result=await this.entityModal.open({
      eyebrow:'Gestión técnica',
      title:mode==='lookup'?'Identificar persona':'Registrar persona',
      saveLabel:'Guardar persona',
      documents:[{value:'DNI',label:'DNI'},{value:'CE',label:'Carné de extranjería'},
        {value:'PASAPORTE',label:'Pasaporte'}],
      startDocument:{type,number:document},
      requireDistrictForManual:true,
      lookupLocal:(t,d)=>this.findPerson(t,d).pipe(map(people=>{
        lookup.person=people.find(p=>p.tipoDocumento===t && p.numeroDocumento===d)??null;
        const person=lookup.person;
        return person ? {
          roleId:person.personaId,entityId:person.personaId,
          data:{tipoDocumento:person.tipoDocumento,numeroDocumento:person.numeroDocumento},
        } satisfies EntityLookupData : null;
      })),
      save:(draft:EntityDraft)=>this.savePerson({
        tipoDocumento:draft.tipoDocumento,numeroDocumento:draft.numeroDocumento,
        nombres:draft.nombres,apellidoPaterno:draft.apellidoPaterno,
        apellidoMaterno:draft.apellidoMaterno||undefined,
        fechaNacimiento:draft.fechaNacimiento||undefined,
        telefono:draft.telefono||undefined,correo:draft.correo||undefined,
        distritoCodigo:draft.distritoCodigo,
        centroPobladoId:draft.centroPobladoId||undefined,
        referencia:draft.referencia||undefined,
      }),
    });
    if (!result || !result.data || result.id<=0) return null;
    const data=result.data;
    return {
      personaId:result.id,
      tipoDocumento:data.tipoDocumento,
      numeroDocumento:data.numeroDocumento,
      nombreCompleto:lookup.person?.personaId===result.id ? lookup.person.nombreCompleto :
        [data.nombres,data.apellidoPaterno,data.apellidoMaterno].filter(Boolean).join(' ').trim(),
    };
  }
}
