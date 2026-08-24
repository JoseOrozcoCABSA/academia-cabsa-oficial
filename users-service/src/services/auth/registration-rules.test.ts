/**
 * @file Pruebas de las reglas puras del alta de cuentas.
 *
 * Cubren el orden de las validaciones —que es contrato, porque el formulario
 * muestra el primer error que recibe— y los casos límite que antes sólo se
 * podían ejercitar levantando el servicio contra MySQL.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../utils/errors.js';
import {
  assertAddressRequest,
  assertFomaqroAnswer,
  assertFomaqroMembership,
  assertRegistrationIdentity,
  normalizeEmail,
  resolveAddress,
  resolveFullName,
  splitName,
  type PostalAddressLike,
  type RegisterInput,
} from './registration-rules.js';

/** Alta mínima válida; cada prueba altera sólo el campo que le interesa. */
const validInput: RegisterInput = {
  fullName: 'Ana María Pérez',
  email: '  ANA@CABSA.MX ',
  username: 'ana.perez',
  password: 'contrasena8',
  passwordConfirmation: 'contrasena8',
  terms: true,
  fomaqroMember: 'no',
  postalCode: '76000',
  colonyId: 12,
};

/** Ejecuta `fn` y devuelve el código del {@link AppError} que lanzó. */
const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof AppError, 'se esperaba un AppError');
    return error.code;
  }
  return assert.fail('se esperaba que lanzara');
};

/** Igual que {@link codeOf}, pero devuelve también el estado HTTP. */
const failureOf = (fn: () => unknown): { code: string; status: number } => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof AppError, 'se esperaba un AppError');
    return { code: error.code, status: error.status };
  }
  return assert.fail('se esperaba que lanzara');
};

describe('normalizeEmail', () => {
  it('recorta espacios y pasa a minúsculas', () => {
    assert.equal(normalizeEmail('  ANA@CABSA.MX '), 'ana@cabsa.mx');
  });

  it('devuelve cadena vacía cuando no hay valor', () => {
    assert.equal(normalizeEmail(undefined), '');
  });
});

describe('resolveFullName', () => {
  it('prefiere fullName cuando viene', () => {
    assert.equal(
      resolveFullName({ fullName: 'Ana Pérez', firstName: 'Otro' }),
      'Ana Pérez',
    );
  });

  it('compone el nombre con firstName y lastName si falta fullName', () => {
    assert.equal(
      resolveFullName({ firstName: 'Ana', lastName: 'Pérez' }),
      'Ana Pérez',
    );
  });

  it('ignora las partes ausentes al componer', () => {
    assert.equal(resolveFullName({ firstName: 'Ana' }), 'Ana');
  });
});

describe('splitName', () => {
  it('usa la primera palabra como nombre y el resto como apellidos', () => {
    assert.deepEqual(splitName('Ana María Pérez', {}), {
      firstName: 'Ana',
      lastName: 'María Pérez',
    });
  });

  it('respeta lo que el cliente mandó explícitamente', () => {
    assert.deepEqual(
      splitName('Ana María Pérez', { firstName: 'Ana María', lastName: 'Pérez' }),
      { firstName: 'Ana María', lastName: 'Pérez' },
    );
  });

  it('deja los apellidos en null cuando el nombre es de una sola palabra', () => {
    assert.deepEqual(splitName('Ana', {}), { firstName: 'Ana', lastName: null });
  });
});

describe('assertRegistrationIdentity', () => {
  it('normaliza correo y usuario a minúsculas', () => {
    const identity = assertRegistrationIdentity({
      ...validInput,
      username: 'Ana.Perez',
    });
    assert.equal(identity.email, 'ana@cabsa.mx');
    assert.equal(identity.username, 'ana.perez');
    assert.equal(identity.fullName, 'Ana María Pérez');
  });

  it('exige nombre completo', () => {
    assert.equal(
      codeOf(() => assertRegistrationIdentity({ ...validInput, fullName: '  ' })),
      'INVALID_REGISTRATION',
    );
  });

  it('rechaza un nombre de más de 120 caracteres', () => {
    assert.equal(
      codeOf(() =>
        assertRegistrationIdentity({ ...validInput, fullName: 'a'.repeat(121) })),
      'INVALID_REGISTRATION',
    );
  });

  it('rechaza un correo con forma inválida', () => {
    assert.equal(
      codeOf(() => assertRegistrationIdentity({ ...validInput, email: 'ana@cabsa' })),
      'INVALID_REGISTRATION',
    );
  });

  it('exige contraseña de al menos ocho caracteres', () => {
    assert.equal(
      codeOf(() =>
        assertRegistrationIdentity({
          ...validInput,
          password: 'corta7',
          passwordConfirmation: 'corta7',
        })),
      'INVALID_REGISTRATION',
    );
  });

  it('distingue la confirmación que no coincide', () => {
    assert.equal(
      codeOf(() =>
        assertRegistrationIdentity({
          ...validInput,
          passwordConfirmation: 'otracosa8',
        })),
      'PASSWORD_CONFIRMATION_MISMATCH',
    );
  });

  it('exige aceptar los términos de forma explícita', () => {
    assert.equal(
      codeOf(() => assertRegistrationIdentity({ ...validInput, terms: undefined })),
      'TERMS_REQUIRED',
    );
  });

  it('rechaza un usuario con caracteres no admitidos', () => {
    assert.equal(
      codeOf(() => assertRegistrationIdentity({ ...validInput, username: 'ana pérez' })),
      'INVALID_USERNAME',
    );
  });

  it('rechaza un usuario de menos de tres caracteres', () => {
    assert.equal(
      codeOf(() => assertRegistrationIdentity({ ...validInput, username: 'an' })),
      'INVALID_USERNAME',
    );
  });

  it('valida el nombre antes que el correo', () => {
    assert.equal(
      codeOf(() =>
        assertRegistrationIdentity({ ...validInput, fullName: '', email: 'malo' })),
      'INVALID_REGISTRATION',
    );
  });

  it('valida los términos antes que el nombre de usuario', () => {
    assert.equal(
      codeOf(() =>
        assertRegistrationIdentity({
          ...validInput,
          terms: false,
          username: 'no válido',
        })),
      'TERMS_REQUIRED',
    );
  });
});

describe('assertFomaqroAnswer', () => {
  it('acepta yes y no', () => {
    assert.equal(assertFomaqroAnswer({ fomaqroMember: 'yes' }), 'yes');
    assert.equal(assertFomaqroAnswer({ fomaqroMember: 'no' }), 'no');
  });

  it('exige una respuesta explícita', () => {
    assert.equal(codeOf(() => assertFomaqroAnswer({})), 'FOMAQRO_ANSWER_REQUIRED');
  });
});

describe('assertFomaqroMembership', () => {
  /** Región 1, municipio 003 (Arroyo Seco), del catálogo en código. */
  const membership = {
    rfc: 'PEPA800101AB1',
    regionId: '1',
    fomaqroMunicipalityId: '003',
  };

  it('normaliza el RFC quitando separadores y subiendo a mayúsculas', () => {
    const result = assertFomaqroMembership({ ...membership, rfc: 'pepa-800101 ab1' });
    assert.equal(result.rfc, 'PEPA800101AB1');
  });

  it('fija el estado a Querétaro por ser un fondo estatal', () => {
    const result = assertFomaqroMembership(membership);
    assert.equal(result.stateCode, '22');
    assert.equal(result.state, 'Querétaro');
  });

  it('resuelve el municipio contra el catálogo', () => {
    const result = assertFomaqroMembership(membership);
    assert.equal(result.municipalityCode, '003');
    assert.equal(result.municipality, 'Arroyo Seco');
  });

  it('rechaza un RFC con forma inválida con 422', () => {
    assert.deepEqual(
      failureOf(() => assertFomaqroMembership({ ...membership, rfc: 'XX1' })),
      { code: 'INVALID_RFC', status: 422 },
    );
  });

  it('rechaza una región inexistente', () => {
    assert.equal(
      codeOf(() => assertFomaqroMembership({ ...membership, regionId: '99' })),
      'INVALID_FOMAQRO_REGION',
    );
  });

  it('rechaza un municipio que no pertenece a la región', () => {
    assert.equal(
      codeOf(() =>
        assertFomaqroMembership({ ...membership, fomaqroMunicipalityId: '999' })),
      'INVALID_FOMAQRO_REGION',
    );
  });
});

describe('assertAddressRequest', () => {
  it('descarta lo que no sea dígito del código postal', () => {
    const result = assertAddressRequest({ postalCode: '76-000', colonyId: '12' });
    assert.deepEqual(result, { postalCode: '76000', colonyId: 12 });
  });

  it('exige cinco dígitos', () => {
    assert.equal(
      codeOf(() => assertAddressRequest({ postalCode: '760', colonyId: 12 })),
      'ADDRESS_REQUIRED',
    );
  });

  it('exige colonia', () => {
    assert.equal(
      codeOf(() => assertAddressRequest({ postalCode: '76000' })),
      'ADDRESS_REQUIRED',
    );
  });
});

describe('resolveAddress', () => {
  const records: PostalAddressLike[] = [
    {
      colony_id: 12,
      colony: 'Centro',
      municipality_code: '014',
      municipality: 'Querétaro',
      state_code: '22',
      state: 'Querétaro',
    },
    {
      colony_id: 13,
      colony: 'Álamos',
      municipality_code: '014',
      municipality: 'Querétaro',
      state_code: '22',
      state: 'Querétaro',
    },
  ];

  it('devuelve la colonia elegida con su municipio y estado', () => {
    assert.deepEqual(resolveAddress(records, '76000', 13), {
      postalCode: '76000',
      colony: 'Álamos',
      municipalityCode: '014',
      municipality: 'Querétaro',
      stateCode: '22',
      state: 'Querétaro',
    });
  });

  it('rechaza con 422 una colonia que no pertenece al código postal', () => {
    assert.deepEqual(
      failureOf(() => resolveAddress(records, '76000', 99)),
      { code: 'INVALID_ADDRESS', status: 422 },
    );
  });

  it('rechaza cuando el catálogo no devolvió filas', () => {
    assert.equal(codeOf(() => resolveAddress([], '76000', 12)), 'INVALID_ADDRESS');
  });
});
