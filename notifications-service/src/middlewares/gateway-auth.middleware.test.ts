/** @file Pruebas de comparación de la credencial del gateway. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validInternalKey } from './gateway-auth.middleware.js';

describe('validInternalKey', () => {
  it('acepta únicamente la clave completa', () => assert.equal(validInternalKey('clave-segura', 'clave-segura'), true));
  it('rechaza claves distintas o de otra longitud', () => {
    assert.equal(validInternalKey('clave-falsa', 'clave-segura'), false);
    assert.equal(validInternalKey('corta', 'clave-segura'), false);
  });
  it('falla cerrado sin configuración', () => assert.equal(validInternalKey('clave', undefined), false));
});
