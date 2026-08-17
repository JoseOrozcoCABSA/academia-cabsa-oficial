/** @file Pruebas de comparación de roles vivos frente a los firmados. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sameRoles } from './session-validation.rules.js';

describe('sameRoles', () => {
  it('ignora el orden', () => assert.equal(sameRoles(['TEACHER', 'STUDENT'], 'STUDENT,TEACHER'), true));
  it('detecta un rol retirado', () => assert.equal(sameRoles(['ADMIN', 'STUDENT'], 'STUDENT'), false));
  it('detecta un rol agregado', () => assert.equal(sameRoles(['STUDENT'], 'ADMIN,STUDENT'), false));
  it('acepta dos conjuntos vacíos', () => assert.equal(sameRoles([], null), true));
});
