/** @file Pruebas de extracción segura de identidad de sesión. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sessionDescriptor } from './session-validation.js';

describe('sessionDescriptor', () => {
  it('extrae una sesión completa', () => assert.deepEqual(
    sessionDescriptor({ sub: 'usuario', jti: 'sesion', roles: ['STUDENT'] }),
    { userId: 'usuario', sessionId: 'sesion', roles: ['STUDENT'] },
  ));
  it('rechaza JWT antiguos sin jti', () => assert.equal(sessionDescriptor({ sub: 'usuario' }), null));
  it('rechaza payload sin usuario', () => assert.equal(sessionDescriptor({ jti: 'sesion' }), null));
});
