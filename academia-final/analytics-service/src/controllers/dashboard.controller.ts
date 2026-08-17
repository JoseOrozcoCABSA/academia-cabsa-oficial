/**
 * @file Capa HTTP del resumen del panel de analitica.
 *
 * Una sola ruta, sin parametros: devuelve totales globales de la plataforma.
 *
 * @see services/dashboard.service.ts Origen de los datos.
 */

import type { Request, Response } from 'express';
import service from '#services/dashboard.service';
import { ok } from '#utils/response';

/** Capa HTTP del resumen de analitica. */
export class DashboardController {
  /**
   * `GET /dashboard/summary` — Metricas agregadas de la plataforma.
   *
   * No acepta parametros: devuelve totales globales, no filtrados por usuario ni
   * por fecha.
   */
  summary = async (_request: Request, response: Response): Promise<void> => {
    ok(response, await service.summary());
  };

  /** `GET /dashboard/public-visitors` — métricas anónimas y agregadas. */
  publicVisitors = async (_request: Request, response: Response): Promise<void> => {
    ok(response, await service.publicVisitors());
  };
}

/** Instancia de `DashboardController` lista para usar. */
export default new DashboardController();
