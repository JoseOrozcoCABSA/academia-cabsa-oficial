/**
 * @file Capa HTTP del gateway: sondas propias y reenvío por servicio.
 *
 * Ojo con el formato: las respuestas de {@link GatewayController.health} no usan
 * el sobre `{ success, data }` de los microservicios, sino una forma propia.
 *
 * @see services/gateway.service.ts Lógica de proxy y sondeo.
 */

import type { Request, RequestHandler, Response } from 'express';
import gatewayService from '#services/gateway.service';
import type { ServiceKey } from '#config/services';

/** Manejadores del gateway. */
export class GatewayController {
  /**
   * `GET /health` — Sonda del gateway en sí.
   *
   * Responde siempre 200 y no consulta a los microservicios: sólo confirma que
   * el proceso está vivo. Para el estado del conjunto, {@link servicesHealth}.
   */
  health = async (_request: Request, response: Response): Promise<void> => {
    response.json({
      service: 'academia-api-gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  };

  /** `GET /services` — Catálogo de servicios con su prefijo y su destino. */
  catalog = async (_request: Request, response: Response): Promise<void> => {
    response.json({
      success: true,
      data: gatewayService.catalog(),
    });
  };

  /**
   * `GET /services/health` — Estado agregado de los seis servicios.
   *
   * Devuelve **207 Multi-Status** cuando alguno falla, y 200 sólo si todos
   * responden. Un monitor que sólo acepte 200 marcará el gateway como caído en
   * cuanto un servicio se degrade, aunque el gateway funcione.
   */
  servicesHealth = async (
    _request: Request,
    response: Response,
  ): Promise<void> => {
    const result = await gatewayService.health();
    response.status(result.status === 'ok' ? 200 : 207).json({
      success: result.status === 'ok',
      data: result,
    });
  };

  /**
   * Crea el manejador de reenvío de un servicio concreto.
   *
   * Es una fábrica, no un manejador: se invoca al declarar la ruta
   * (`router.use('/api/users', controller.forward('users'))`).
   */
  forward = (service: ServiceKey): RequestHandler =>
    async (request, response): Promise<void> => {
      await gatewayService.proxy(service, request, response);
    };
}

/** Instancia única lista para montar en las rutas. */
export default new GatewayController();
