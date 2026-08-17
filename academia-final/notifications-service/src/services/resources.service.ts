/**
 * @file Capa de servicio del CRUD genérico.
 *
 * Segunda pieza de la tríada genérica
 * (`ResourcesController` → `ResourcesService` → `ResourcesRepository`).
 * Hoy es un reenvío al repositorio; su valor está en dar el punto donde
 * insertar reglas de negocio por entidad sin tocar el controlador.
 *
 * @see resources.repository.ts  Donde viven las garantías de datos.
 * @see resources.controller.ts  Capa que lo consume.
 */

import type { Model } from 'sequelize';
import repository, {
  ResourcesRepository,
  type ListOptions,
} from '#repositories/resources.repository';

/**
 * Capa de servicio del CRUD genérico.
 *
 * Hoy delega cada operación en {@link ResourcesRepository} sin añadir lógica:
 * es deliberadamente una capa fina. Existe por dos razones concretas y no por
 * simetría con el resto de las capas:
 *
 * 1. Da un punto único donde meter reglas de negocio cuando una entidad las
 *    necesite, sin que el controlador tenga que cambiar de dependencia. Los
 *    servicios propios (`auth.service`, `profile.service`) ya lo aprovechan.
 * 2. El repositorio se inyecta por constructor, lo que permite fijar la tabla
 *    aquí y sustituirlo por un doble en las pruebas.
 *
 * Al ser un reenvío, los errores que documenta el repositorio
 * (`RESOURCE_NOT_FOUND`, `WHERE_REQUIRED`, `READ_ONLY_RESOURCE`,
 * `RECORD_NOT_FOUND`, `COMPOSITE_KEY_REQUIRED`) suben tal cual hasta el
 * middleware de errores: aquí no se capturan ni se traducen.
 */
export class ResourcesService {
  private readonly repository: ResourcesRepository;

  /**
   * @param dataRepository Repositorio a usar. Por defecto, la instancia sin
   *   tabla fija; para una entidad concreta se le pasa una ya fijada:
   *   `new ResourcesService(new ResourcesRepository('usuarios_cuentas'))`.
   */
  constructor(dataRepository: ResourcesRepository = repository) {
    this.repository = dataRepository;
  }

  /** Metadatos de los recursos del servicio. Ver `ResourcesRepository.catalog`. */
  catalog(): Array<Record<string, unknown>> {
    return this.repository.catalog();
  }

  /** Consulta paginada. Devuelve `{ count, rows }`, con `count` sin paginar. */
  list(resource: string | undefined, options: ListOptions) {
    return this.repository.list(resource, options);
  }

  /** Un registro por condición libre. Lanza 404 si no existe. */
  findOne(resource: string | undefined, where: Record<string, unknown>) {
    return this.repository.findOne(resource, where);
  }

  /** Un registro por clave primaria simple. Lanza 400 si la clave es compuesta. */
  findById(resource: string | undefined, id: string): Promise<Model> {
    return this.repository.findById(resource, id);
  }

  /** Inserta un registro. Las columnas desconocidas se descartan en silencio. */
  create(resource: string | undefined, data: Record<string, unknown>) {
    return this.repository.create(resource, data);
  }

  /** Actualiza por condición. Exige `where` no vacío para no tocar la tabla entera. */
  update(
    resource: string | undefined,
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ) {
    return this.repository.update(resource, where, data);
  }

  /** Actualiza por clave primaria simple. */
  updateById(
    resource: string | undefined,
    id: string,
    data: Record<string, unknown>,
  ) {
    return this.repository.updateById(resource, id, data);
  }

  /** Borra físicamente por condición. No hay borrado lógico. */
  remove(resource: string | undefined, where: Record<string, unknown>) {
    return this.repository.remove(resource, where);
  }

  /** Borra físicamente por clave primaria simple. */
  removeById(resource: string | undefined, id: string) {
    return this.repository.removeById(resource, id);
  }
}

/** Instancia sin tabla fija, para el endpoint genérico `/data/:resource`. */
export default new ResourcesService();
