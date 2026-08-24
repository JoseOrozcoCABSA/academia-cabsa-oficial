/**
 * @file Capa HTTP de los informes de analitica.
 *
 * Expone la serie diaria de eventos construida por el servicio del panel.
 *
 * @see services/dashboard.service.ts Implementacion compartida.
 */

import type { Request, Response } from 'express';
import service from '#services/dashboard.service';
import { ok } from '#utils/response';

/** Capa HTTP de los informes de analitica. */
export class ReportsController {
  /** `GET /reports/events` — actividad diaria de los ultimos siete dias. */
  events = async (_request: Request, response: Response): Promise<void> => {
    ok(response, await service.eventsReport());
  };
}

/** Instancia de `ReportsController` lista para usar. */
export default new ReportsController();
