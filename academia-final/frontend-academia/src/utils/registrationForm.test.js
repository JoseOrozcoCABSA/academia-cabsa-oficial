/**
 * @file Pruebas de las reglas puras del formulario de alta.
 *
 * Lo que se cubre es la limpieza de campos dependientes. Es el punto donde el
 * formulario puede quedar en un estado imposible —una colonia que ya no
 * pertenece al código postal, un municipio que no es de la región elegida— y el
 * backend lo rechazaría con 422 sin que el usuario entienda por qué.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  POSTAL_PROMPT,
  applyFieldChange,
  fieldValueFrom,
  initialRegistrationForm,
  isPostalCodeComplete,
  postalStatusFor,
  sanitizePostalCode,
} from './registrationForm.js';

/** Formulario con domicilio ya resuelto. */
const withAddress = {
  ...initialRegistrationForm,
  fomaqroMember: 'no',
  postalCode: '76000',
  colonyId: '12',
};

/** Formulario con pertenencia a FOMAQRO ya capturada. */
const withFomaqro = {
  ...initialRegistrationForm,
  fomaqroMember: 'yes',
  rfc: 'PEPA800101AB1',
  regionId: '1',
  fomaqroMunicipalityId: '003',
};

describe('sanitizePostalCode', () => {
  it('descarta lo que no sea dígito', () => {
    assert.equal(sanitizePostalCode('76-0 0a0'), '76000');
  });

  it('corta a cinco caracteres', () => {
    assert.equal(sanitizePostalCode('7600012345'), '76000');
  });

  it('tolera ausencia de valor', () => {
    assert.equal(sanitizePostalCode(undefined), '');
    assert.equal(sanitizePostalCode(null), '');
  });
});

describe('isPostalCodeComplete', () => {
  it('exige cinco dígitos', () => {
    assert.equal(isPostalCodeComplete('7600'), false);
    assert.equal(isPostalCodeComplete('76000'), true);
  });

  it('cuenta sólo los dígitos', () => {
    assert.equal(isPostalCodeComplete('76-00'), false);
    assert.equal(isPostalCodeComplete('76-000'), true);
  });
});

describe('applyFieldChange', () => {
  it('no muta el formulario recibido', () => {
    const before = { ...withAddress };
    applyFieldChange(withAddress, 'postalCode', '76010');
    assert.deepEqual(withAddress, before);
  });

  it('cambiar el código postal borra la colonia', () => {
    const next = applyFieldChange(withAddress, 'postalCode', '76010');
    assert.equal(next.postalCode, '76010');
    assert.equal(next.colonyId, '');
  });

  it('normaliza el código postal al cambiarlo', () => {
    const next = applyFieldChange(withAddress, 'postalCode', '76-0 1a0');
    assert.equal(next.postalCode, '76010');
  });

  it('cambiar la región borra el municipio FOMAQRO', () => {
    const next = applyFieldChange(withFomaqro, 'regionId', '2');
    assert.equal(next.regionId, '2');
    assert.equal(next.fomaqroMunicipalityId, '');
  });

  it('responder que sí a FOMAQRO descarta el domicilio', () => {
    const next = applyFieldChange(withAddress, 'fomaqroMember', 'yes');
    assert.equal(next.postalCode, '');
    assert.equal(next.colonyId, '');
  });

  it('responder que no a FOMAQRO descarta RFC, región y municipio', () => {
    const next = applyFieldChange(withFomaqro, 'fomaqroMember', 'no');
    assert.equal(next.rfc, '');
    assert.equal(next.regionId, '');
    assert.equal(next.fomaqroMunicipalityId, '');
  });

  it('cambiar de rama y volver no reaparece el dato anterior', () => {
    const toFomaqro = applyFieldChange(withAddress, 'fomaqroMember', 'yes');
    const backToAddress = applyFieldChange(toFomaqro, 'fomaqroMember', 'no');
    assert.equal(backToAddress.postalCode, '');
    assert.equal(backToAddress.colonyId, '');
    assert.equal(backToAddress.rfc, '');
  });

  it('un campo sin dependientes sólo se actualiza a sí mismo', () => {
    const next = applyFieldChange(withAddress, 'fullName', 'Ana Pérez');
    assert.equal(next.fullName, 'Ana Pérez');
    assert.equal(next.postalCode, '76000');
    assert.equal(next.colonyId, '12');
  });

  it('acepta el valor booleano de los términos', () => {
    const next = applyFieldChange(initialRegistrationForm, 'terms', true);
    assert.equal(next.terms, true);
  });
});

describe('fieldValueFrom', () => {
  it('lee `checked` en una casilla de verificación', () => {
    assert.equal(fieldValueFrom({ target: { type: 'checkbox', checked: true } }), true);
  });

  it('lee `value` en el resto de los campos', () => {
    assert.equal(fieldValueFrom({ target: { type: 'text', value: 'ana' } }), 'ana');
  });
});

describe('postalStatusFor', () => {
  it('pide confirmar cuando sólo hay una colonia', () => {
    assert.match(postalStatusFor([{ id: 1 }]), /Confirma la colonia/);
  });

  it('indica cuántas hay cuando son varias', () => {
    assert.match(postalStatusFor([{ id: 1 }, { id: 2 }, { id: 3 }]), /3 colonias/);
  });
});

describe('POSTAL_PROMPT', () => {
  it('es el mensaje inicial mientras falta el código', () => {
    assert.match(POSTAL_PROMPT, /cinco d[íi]gitos/);
  });
});
