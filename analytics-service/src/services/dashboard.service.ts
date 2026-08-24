/**
 * @file Servicio del panel de analitica.
 *
 * @see repositories/dashboard.repository.ts Consulta real.
 */

import repository from '#repositories/dashboard.repository';

/** Envoltorio fino sobre el repositorio; no anade reglas. */
export class DashboardService {
  /** Metricas agregadas del panel. */
  summary() {
    return repository.summary();
  }

  /** Navegación de visitantes que todavía no tienen una cuenta identificada. */
  publicVisitors() {
    return repository.publicVisitors();
  }

  /** Informe diario de eventos de los ultimos siete dias. */
  eventsReport() {
    return repository.eventsReport();
  }
}

/** Instancia de `DashboardService` lista para usar. */
export default new DashboardService();
