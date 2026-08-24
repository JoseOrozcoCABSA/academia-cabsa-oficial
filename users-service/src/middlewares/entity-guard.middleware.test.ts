/**
 * @file Pruebas del guardián de los routers de entidad.
 *
 * Cubren el fallo que motivó el archivo: los routers de entidad servían el CRUD
 * completo —incluida la tabla de cuentas— sin ninguna comprobación, de modo que
 * cualquier portador de un token válido llegaba a ellos. Aquí se comprueba que
 * ahora exigen rol administrativo y, en el caso del catálogo, que la lectura
 * pública siga funcionando.
 *
 * El módulo se carga con `import()` dinámico después de fijar el entorno, porque
 * `config/env` valida las variables obligatorias al importarse y un `import`
 * estático se evaluaría antes de que las pruebas puedan definirlas.
 */

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Secreto de pruebas; `config/env` exige al menos 32 caracteres. */
const JWT_SECRET = 'secreto-de-pruebas-con-32-caracteres-o-mas';

let requireAdministrator: RequestHandler;
let guardEntityWrites: RequestHandler;

before(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.INTERNAL_SERVICE_KEY = 'clave-interna-de-pruebas-con-32-caracteres';
  process.env.DB_PASSWORD = 'contrasena-de-pruebas';
  const guard = await import('./entity-guard.middleware.js');
  requireAdministrator = guard.requireAdministrator;
  guardEntityWrites = guard.guardEntityWrites;
});

/** Petición mínima con las piezas que leen los middlewares. */
const requestWith = (method: string, token?: string): Request => ({
  method,
  headers: token ? { authorization: `Bearer ${token}` } : {},
} as unknown as Request);

/** Respuesta de descarte; ninguno de estos middlewares escribe en ella. */
const response = {} as Response;

/** Firma un token con los roles indicados. */
const tokenFor = (roles: string[]): string =>
  jwt.sign({ sub: 'u-1', roles }, JWT_SECRET, { expiresIn: '5m' });

/**
 * Ejecuta un middleware y devuelve el resultado como `'pasa'` o el código del
 * error con el que rechazó.
 */
const outcomeOf = (
  middleware: RequestHandler,
  request: Request,
): Promise<string> => new Promise((resolve) => {
  const next: NextFunction = (error?: unknown) => {
    if (!error) {
      resolve('pasa');
      return;
    }
    const failure = error as { code?: string };
    resolve(failure.code ?? 'ERROR_SIN_CODIGO');
  };
  void middleware(request, response, next);
});

describe('requireAdministrator', () => {
  it('deja pasar a un administrador', async () => {
    assert.equal(
      await outcomeOf(requireAdministrator, requestWith('GET', tokenFor(['ADMIN']))),
      'pasa',
    );
  });

  it('admite las tres grafías de rol administrativo', async () => {
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'administrator']) {
      assert.equal(
        await outcomeOf(requireAdministrator, requestWith('GET', tokenFor([role]))),
        'pasa',
        `el rol ${role} debería pasar`,
      );
    }
  });

  it('rechaza a un alumno autenticado: es el fallo que se corrigió', async () => {
    assert.equal(
      await outcomeOf(requireAdministrator, requestWith('GET', tokenFor(['STUDENT']))),
      'ROLE_FORBIDDEN',
    );
  });

  it('rechaza la lectura, no sólo la escritura', async () => {
    for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) {
      assert.equal(
        await outcomeOf(requireAdministrator, requestWith(method, tokenFor(['STUDENT']))),
        'ROLE_FORBIDDEN',
        `${method} debería quedar bloqueado`,
      );
    }
  });

  it('exige token', async () => {
    assert.equal(
      await outcomeOf(requireAdministrator, requestWith('GET')),
      'TOKEN_REQUIRED',
    );
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const forged = jwt.sign({ sub: 'u-1', roles: ['ADMIN'] }, 'otro-secreto-distinto-de-32-caracteres');
    assert.equal(
      await outcomeOf(requireAdministrator, requestWith('GET', forged)),
      'INVALID_TOKEN',
    );
  });

  it('rechaza un token sin roles', async () => {
    assert.equal(
      await outcomeOf(requireAdministrator, requestWith('GET', tokenFor([]))),
      'ROLE_FORBIDDEN',
    );
  });

  it('no confunde un rol parecido con uno administrativo', async () => {
    for (const role of ['admin', 'ADMINISTRATOR', 'super_admin']) {
      assert.equal(
        await outcomeOf(requireAdministrator, requestWith('GET', tokenFor([role]))),
        'ROLE_FORBIDDEN',
        `la comparación es sensible a mayúsculas: ${role} no debe pasar`,
      );
    }
  });
});

describe('guardEntityWrites', () => {
  it('deja leer el catálogo sin token', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      assert.equal(
        await outcomeOf(guardEntityWrites, requestWith(method)),
        'pasa',
        `${method} debería seguir siendo público`,
      );
    }
  });

  it('exige token para escribir', async () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      assert.equal(
        await outcomeOf(guardEntityWrites, requestWith(method)),
        'TOKEN_REQUIRED',
        `${method} no debería admitirse sin token`,
      );
    }
  });

  it('rechaza la escritura de un alumno autenticado', async () => {
    assert.equal(
      await outcomeOf(guardEntityWrites, requestWith('DELETE', tokenFor(['STUDENT']))),
      'ROLE_FORBIDDEN',
    );
  });

  it('admite la escritura de un administrador', async () => {
    assert.equal(
      await outcomeOf(guardEntityWrites, requestWith('POST', tokenFor(['ADMIN']))),
      'pasa',
    );
  });
});
