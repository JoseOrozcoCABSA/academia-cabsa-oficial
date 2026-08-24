/**
 * @file Proxy inverso: reenvía la petición al microservicio y devuelve su
 * respuesta.
 *
 * Usa `fetch` nativo y transmite la respuesta como stream; las descargas no se
 * acumulan completas en la memoria del Gateway.
 *
 * @see config/services.ts Tabla de destinos.
 */

import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import env from '#config/env';
import {
  services,
  type ServiceDefinition,
  type ServiceKey,
} from '#config/services';
import { GatewayError } from '#utils/errors';

/**
 * Encabezados que no se reenvían al servicio destino.
 *
 * Son los de salto a salto (`hop-by-hop`) más los que describen el cuerpo o la
 * conexión concreta: reenviarlos rompería el proxy, porque describirían la
 * conexión con el cliente y no la nueva con el servicio.
 *
 * `x-internal-service-key` está aquí por un motivo distinto: es la credencial
 * con la que los endpoints internos de notificaciones autentican a quien les
 * llama. Si un cliente la manda, el gateway la copiaba tal cual junto con el
 * resto de las cabeceras. Hoy es inocua porque `/internal/*` no es alcanzable a
 * través del proxy, pero deja de serlo en cuanto alguien monte una ruta interna
 * bajo `/api`. La credencial debe nacer en el servidor, nunca llegar del
 * cliente.
 */
const skippedRequestHeaders = new Set([
  'host',
  'content-length',
  'connection',
  'transfer-encoding',
  'expect',
  'te',
  'upgrade',
  'proxy-connection',
  'x-internal-service-key',
]);

/**
 * Lista blanca de encabezados que se devuelven al cliente.
 *
 * Es una lista blanca, no negra: todo lo que no esté aquí **se descarta**. En
 * particular no pasan `Set-Cookie` ni `Authorization`, así que un servicio no
 * puede establecer cookies a través del gateway.
 */
const forwardedResponseHeaders = new Set([
  'content-type',
  'content-disposition',
  'cache-control',
  'etag',
  'last-modified',
]);

/** Reenvío y sondeo de los microservicios. */
export class GatewayService {
  /** Catálogo público de servicios, sin datos internos más allá de la URL destino. */
  catalog() {
    return Object.values(services).map((service) => ({
      key: service.key,
      name: service.name,
      gatewayPath: service.gatewayPath,
      target: service.baseUrl,
      description: service.description,
    }));
  }

  /**
   * Sondea los seis servicios en paralelo.
   *
   * @returns `status` global: `ok` sólo si los seis responden bien; `degraded`
   *   si alguno falla. Nunca lanza: un servicio caído se refleja en su entrada.
   */
  async health() {
    const results = await Promise.all(
      Object.values(services).map((service) => this.serviceHealth(service)),
    );
    return {
      status: results.every((result) => result.status === 'ok')
        ? 'ok'
        : 'degraded',
      services: results,
    };
  }

  /**
   * Reenvía la petición al servicio y copia su respuesta al cliente.
   *
   * La URL destino es `${baseUrl}/api${request.url}`. Como Express ya quitó el
   * prefijo al montar la ruta, `request.url` llega relativo.
   *
   * **Contrato con la aplicación:** el cuerpo debe llegar como `Buffer`, es
   * decir, la app tiene que usar un parser en crudo (`express.raw`) y no
   * `express.json()`. Si el cuerpo llega ya convertido a objeto, la condición
   * `Buffer.isBuffer` falla y la petición se reenvía **sin cuerpo**, en silencio.
   *
   * Añade `x-request-id` para poder correlacionar la traza entre gateway y
   * servicio, más los `x-forwarded-*` habituales.
   *
   * @throws {GatewayError} 504 `UPSTREAM_TIMEOUT` al agotarse el tiempo de
   *   espera; 503 `UPSTREAM_UNAVAILABLE` si no se pudo conectar.
   */
  async proxy(
    key: ServiceKey,
    request: Request,
    response: Response,
  ): Promise<void> {
    const service = services[key];
    const targetUrl = `${service.baseUrl}/api${request.url}`;
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (skippedRequestHeaders.has(name.toLowerCase()) || value === undefined) {
        continue;
      }
      headers.set(name, Array.isArray(value) ? value.join(',') : value);
    }
    headers.set('x-request-id', request.requestId);
    headers.set('x-forwarded-host', request.header('host') ?? 'localhost');
    headers.set('x-forwarded-proto', request.protocol);
    // Sustituye cualquier valor aportado por el cliente. Los servicios internos
    // reciben únicamente la dirección que Express ya validó según trust proxy.
    headers.set('x-forwarded-for', request.ip || request.socket.remoteAddress || '');
    headers.set('x-gateway-service', 'academia-api-gateway');
    headers.set('x-internal-service-key', env.internalServiceKey);

    const hasBody = !['GET', 'HEAD'].includes(request.method)
      && Buffer.isBuffer(request.body)
      && request.body.length > 0;

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        signal: AbortSignal.timeout(env.requestTimeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
      throw new GatewayError(
        timedOut
          ? `Tiempo de espera agotado para ${service.name}`
          : `${service.name} no está disponible`,
        timedOut ? 504 : 503,
        timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
        {
          service: service.name,
          target: service.baseUrl,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }

    for (const [name, value] of upstream.headers.entries()) {
      if (forwardedResponseHeaders.has(name.toLowerCase())) {
        response.setHeader(name, value);
      }
    }
    response.setHeader('X-Request-Id', request.requestId);
    response.setHeader('X-Gateway-Service', service.name);
    response.status(upstream.status);

    if (upstream.status === 204 || request.method === 'HEAD') {
      response.end();
      return;
    }
    if (!upstream.body) {
      response.end();
      return;
    }
    // Node y TypeScript mantienen definiciones ligeramente distintas del
    // ReadableStream de fetch. El cast solo cruza esa frontera de tipos; los
    // bytes continúan transmitiéndose sin almacenarse completos en memoria.
    await pipeline(Readable.fromWeb(upstream.body as any), response);
  }

  /**
   * Consulta el `/health` de un servicio.
   *
   * El tiempo de espera se acota a 3 s aunque el global sea mayor, para que la
   * sonda no se quede colgada. Distingue tres estados: `ok`, `error` (respondió
   * pero con código de fallo) y `unavailable` (no respondió).
   */
  private async serviceHealth(service: ServiceDefinition) {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${service.baseUrl}/health`, {
        signal: AbortSignal.timeout(Math.min(env.requestTimeoutMs, 3000)),
      });
      const data = response.ok ? await response.json() : null;
      return {
        key: service.key,
        name: service.name,
        status: response.ok ? 'ok' : 'error',
        httpStatus: response.status,
        latencyMs: Date.now() - startedAt,
        data,
      };
    } catch {
      return {
        key: service.key,
        name: service.name,
        status: 'unavailable',
        httpStatus: null,
        latencyMs: Date.now() - startedAt,
        data: null,
      };
    }
  }
}

/** Instancia única usada por el controlador. */
export default new GatewayService();
