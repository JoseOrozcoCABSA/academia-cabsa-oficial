/**
 * @file Servicio de `whatsapp`.
 *
 * Instancia de `ResourcesService` sin comportamiento propio: aporta el
 * capa de negocio; hoy reenvía al repositorio sin lógica añadida.
 *
 * Si esta entidad necesitara reglas propias, el lugar para añadirlas es su
 * servicio, no este archivo.
 *
 * @see services/resources.service.ts Comportamiento heredado.
 */

import repository from '#repositories/whatsapp.repository';
import { ResourcesService } from '#services/resources.service';

/** Instancia de `ResourcesService` lista para usar. */
export default new ResourcesService(repository);
