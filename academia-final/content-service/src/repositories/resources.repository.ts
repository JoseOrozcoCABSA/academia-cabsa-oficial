/**
 * @file Repositorio CRUD genérico: única puerta de acceso a datos del servicio.
 *
 * Concentra aquí las garantías que de otro modo habría que repetir en cada
 * repositorio: aislamiento entre microservicios, protección contra asignación
 * masiva, exigencia de condición `where` en escrituras y bloqueo de vistas.
 *
 * Primera pieza de la tríada genérica del proyecto
 * (`ResourcesController` → `ResourcesService` → `ResourcesRepository`).
 *
 * @see models/index.ts        Registro de tablas que este servicio administra.
 * @see resources.service.ts   Capa que lo consume.
 */

import type {
  FindOptions,
  Model,
  WhereOptions,
} from 'sequelize';
import resources, { type ResourceDefinition } from '#models';
import { AppError } from '#utils/errors';

/**
 * Parámetros de paginación, orden y filtrado para {@link ResourcesRepository.list}.
 *
 * `limit` y `offset` se esperan ya normalizados por `utils/pagination`; este
 * repositorio no les aplica topes ni valores por defecto.
 */
export interface ListOptions {
  limit: number;
  offset: number;
  orderBy?: string;
  orderDirection: 'ASC' | 'DESC';
  where: Record<string, unknown>;
}

/**
 * Repositorio CRUD genérico sobre cualquier modelo registrado en `#models`.
 *
 * Es la base del acceso a datos de todo el servicio: en lugar de escribir un
 * repositorio por tabla, cada archivo `<entidad>.repository.ts` exporta una
 * instancia de esta clase fijada a su tabla:
 *
 * ```ts
 * export default new ResourcesRepository('usuarios_cuentas');
 * ```
 *
 * La instancia exportada por defecto al final de este archivo NO fija tabla, y
 * es la que usa el endpoint genérico `/data/:resource`, donde el recurso llega
 * en la URL.
 *
 * Garantías de seguridad que aporta la clase, y que conviene no eludir:
 * - sólo permite operar sobre tablas declaradas en `#models` (aísla el
 *   servicio: pedir una tabla de otro microservicio devuelve 404);
 * - descarta las columnas desconocidas antes de escribir, evitando la
 *   asignación masiva de campos no previstos;
 * - exige una condición `where` no vacía en `update` y `remove`, de modo que
 *   un filtro mal armado no pueda afectar a toda la tabla;
 * - rechaza la escritura sobre vistas.
 */
/**
 * Columnas que el CRUD genérico nunca devuelve ni escribe, en ninguna tabla.
 *
 * Son secretos: el hash de la contraseña y los distintos tokens de un solo uso.
 * Antes salían tal cual en `GET /data/usuarios_cuentas`, porque la única
 * «protección contra asignación masiva» que había descartaba las claves que no
 * eran columnas, no las que no debían tocarse.
 *
 * El filtrado es por nombre de columna y se aplica a todas las tablas del
 * servicio, de modo que una tabla nueva con una columna así queda cubierta sin
 * tener que acordarse de registrarla.
 */
const SECRET_COLUMNS = new Set([
  'password_hash',
  'token',
  'token_hash',
  'code_hash',
  'reset_token',
]);

/**
 * Columnas que no se pueden escribir en tablas concretas.
 *
 * `usuarios_roles.code` y `usuarios_permisos.code` son las cadenas que
 * `authorizationForUser` firma dentro del token y que `allowRoles` compara.
 * Poder reescribirlas por el CRUD genérico convierte cualquier rol en
 * administrador sin tocar la asignación de roles.
 */
const GUARDED_COLUMNS_BY_TABLE: Record<string, readonly string[]> = {
  usuarios_roles: ['code', 'is_system'],
  usuarios_permisos: ['code'],
};

export class ResourcesRepository {
  /** Tabla a la que queda fijada la instancia, o `null` si se decide por llamada. */
  private readonly defaultResource: string | null;

  /**
   * @param defaultResource Nombre de tabla al que se fija la instancia. Si se
   *   omite, cada método debe recibir el recurso como primer argumento.
   */
  constructor(defaultResource: string | null = null) {
    this.defaultResource = defaultResource;
  }

  /**
   * Resuelve contra qué tabla se va a operar.
   *
   * Atención al orden de precedencia: si la instancia fue creada con una tabla
   * fija, ésta **gana** sobre el argumento recibido. Es intencional — impide
   * que una petición al endpoint de una entidad concreta se redirija a otra
   * tabla manipulando los parámetros.
   *
   * @throws {AppError} 400 `RESOURCE_REQUIRED` si no hay tabla fija ni argumento.
   */
  private resourceName(resource?: string): string {
    const name = this.defaultResource ?? resource;
    if (!name) {
      throw new AppError('Recurso requerido', 400, 'RESOURCE_REQUIRED');
    }
    return name;
  }

  /**
   * Obtiene la definición (modelo Sequelize, tipo de tabla y claves primarias)
   * del recurso.
   *
   * Es la frontera del microservicio: `#models` sólo registra las tablas que
   * este servicio administra, así que pedir una ajena falla aquí.
   *
   * @throws {AppError} 404 `RESOURCE_NOT_FOUND` si la tabla no pertenece al servicio.
   */
  definition(resource?: string): ResourceDefinition {
    const name = this.resourceName(resource);
    const definition = resources[name];
    if (!definition) {
      throw new AppError(
        `El recurso ${name} no pertenece a este servicio`,
        404,
        'RESOURCE_NOT_FOUND',
      );
    }
    return definition;
  }

  /**
   * Lista los recursos que expone el servicio con sus metadatos.
   *
   * Alimenta el endpoint `/resources`, que el frontend de administración usa
   * para construir sus pantallas de forma genérica: de ahí saca las columnas
   * de cada tabla y si es de sólo lectura.
   */
  catalog(): Array<Record<string, unknown>> {
    return Object.values(resources).map((definition) => ({
      resource: definition.tableName,
      type: definition.tableType,
      readOnly: definition.tableType === 'VIEW',
      primaryKeys: definition.primaryKeys,
      // Las columnas secretas no se anuncian: el catálogo describe lo que el
      // CRUD genérico sirve, y esas ya no salen en ninguna lectura.
      columns: Object.keys(definition.model.rawAttributes)
        .filter((column) => !SECRET_COLUMNS.has(column)),
    }));
  }

  /**
   * Consulta paginada.
   *
   * @returns El resultado de `findAndCountAll`: `{ count, rows }`, donde
   *   `count` es el total sin paginar, necesario para calcular las páginas.
   */
  async list(resource: string | undefined, options: ListOptions) {
    const definition = this.definition(resource);
    const query: FindOptions = {
      limit: options.limit,
      offset: options.offset,
      where: options.where as WhereOptions,
      attributes: { exclude: this.hiddenColumns(definition) },
    };
    if (options.orderBy) {
      query.order = [[options.orderBy, options.orderDirection]];
    }
    return definition.model.findAndCountAll(query);
  }

  /**
   * Devuelve un único registro que cumpla la condición.
   *
   * A diferencia del `findOne` de Sequelize, aquí la ausencia de resultado es
   * un error y no `null`: así los servicios que lo llaman no tienen que
   * comprobarlo antes de usar el registro.
   *
   * @throws {AppError} 400 `WHERE_REQUIRED` si la condición viene vacía.
   * @throws {AppError} 404 `RECORD_NOT_FOUND` si no hay coincidencias.
   */
  async findOne(
    resource: string | undefined,
    where: Record<string, unknown>,
  ): Promise<Model> {
    this.requireWhere(where);
    const definition = this.definition(resource);
    const item = await definition.model.findOne({
      where: where as WhereOptions,
      attributes: { exclude: this.hiddenColumns(definition) },
    });
    if (!item) {
      throw new AppError('Registro no encontrado', 404, 'RECORD_NOT_FOUND');
    }
    return item;
  }

  /**
   * Busca por clave primaria simple.
   *
   * @throws {AppError} 400 `COMPOSITE_KEY_REQUIRED` si la tabla tiene clave
   *   compuesta; en ese caso hay que usar {@link findOne} con el objeto de
   *   claves (es lo que hace la ruta `/record`).
   * @throws {AppError} 404 `RECORD_NOT_FOUND` si no existe el registro.
   */
  async findById(resource: string | undefined, id: string): Promise<Model> {
    const definition = this.definition(resource);
    if (definition.primaryKeys.length !== 1) {
      throw new AppError(
        'Use /record con las claves del registro',
        400,
        'COMPOSITE_KEY_REQUIRED',
      );
    }
    return this.findOne(resource, { [definition.primaryKeys[0]]: id });
  }

  /**
   * Inserta un registro.
   *
   * Los campos que no existan como columna se descartan en silencio
   * ({@link cleanData}), así que enviar datos de más no provoca error: hay que
   * validar antes lo que sea obligatorio.
   *
   * @throws {AppError} 405 `READ_ONLY_RESOURCE` si el recurso es una vista.
   */
  async create(
    resource: string | undefined,
    data: Record<string, unknown>,
  ): Promise<Model> {
    const definition = this.writable(resource);
    return definition.model.create(this.createData(definition, data));
  }

  /**
   * Actualiza todos los registros que cumplan la condición.
   *
   * @returns `affected`, el número de filas modificadas.
   * @throws {AppError} 405 `READ_ONLY_RESOURCE` si el recurso es una vista.
   * @throws {AppError} 400 `WHERE_REQUIRED` si la condición viene vacía — esta
   *   comprobación es la que evita actualizar la tabla completa por accidente.
   * @throws {AppError} 404 `RECORD_NOT_FOUND` si no se modificó ninguna fila.
   */
  async update(
    resource: string | undefined,
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<{ affected: number }> {
    const definition = this.writable(resource);
    this.requireWhere(where);
    const [affected] = await definition.model.update(
      this.updateData(definition, data),
      { where: where as WhereOptions },
    );
    if (!affected) {
      throw new AppError('Registro no encontrado', 404, 'RECORD_NOT_FOUND');
    }
    return { affected };
  }

  /**
   * Actualiza un registro por clave primaria simple.
   *
   * @throws {AppError} 400 `COMPOSITE_KEY_REQUIRED` si la tabla tiene clave
   *   compuesta; usar entonces {@link update} con el objeto `where`.
   */
  async updateById(
    resource: string | undefined,
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ affected: number }> {
    const definition = this.definition(resource);
    if (definition.primaryKeys.length !== 1) {
      throw new AppError(
        'Use actualización con objeto where',
        400,
        'COMPOSITE_KEY_REQUIRED',
      );
    }
    return this.update(resource, { [definition.primaryKeys[0]]: id }, data);
  }

  /**
   * Borra físicamente los registros que cumplan la condición.
   *
   * No hay borrado lógico: la fila desaparece de la tabla.
   *
   * @returns `affected`, el número de filas eliminadas.
   * @throws {AppError} 405 `READ_ONLY_RESOURCE` si el recurso es una vista.
   * @throws {AppError} 400 `WHERE_REQUIRED` si la condición viene vacía.
   * @throws {AppError} 404 `RECORD_NOT_FOUND` si no se eliminó ninguna fila.
   */
  async remove(
    resource: string | undefined,
    where: Record<string, unknown>,
  ): Promise<{ affected: number }> {
    const definition = this.writable(resource);
    this.requireWhere(where);
    const affected = await definition.model.destroy({
      where: where as WhereOptions,
    });
    if (!affected) {
      throw new AppError('Registro no encontrado', 404, 'RECORD_NOT_FOUND');
    }
    return { affected };
  }

  /**
   * Borra un registro por clave primaria simple.
   *
   * @throws {AppError} 400 `COMPOSITE_KEY_REQUIRED` si la tabla tiene clave
   *   compuesta; usar entonces {@link remove} con el objeto `where`.
   */
  async removeById(
    resource: string | undefined,
    id: string,
  ): Promise<{ affected: number }> {
    const definition = this.definition(resource);
    if (definition.primaryKeys.length !== 1) {
      throw new AppError(
        'Use eliminación con objeto where',
        400,
        'COMPOSITE_KEY_REQUIRED',
      );
    }
    return this.remove(resource, { [definition.primaryKeys[0]]: id });
  }

  /**
   * Igual que {@link definition}, pero rechazando los recursos de sólo lectura.
   *
   * Lo usan las tres operaciones de escritura. Las vistas (`tableType === 'VIEW'`)
   * se pueden listar y consultar, pero no modificar.
   *
   * @throws {AppError} 405 `READ_ONLY_RESOURCE` si el recurso es una vista.
   */
  private writable(resource?: string): ResourceDefinition {
    const definition = this.definition(resource);
    if (definition.tableType === 'VIEW') {
      throw new AppError(
        'Las vistas son de solo lectura',
        405,
        'READ_ONLY_RESOURCE',
      );
    }
    return definition;
  }

  /**
   * Filtra el payload dejando sólo las claves que son columnas reales del modelo.
   *
   * Es la protección contra asignación masiva: aunque el cliente mande campos
   * que no le corresponden, nunca llegan al `INSERT` ni al `UPDATE`. El
   * descarte es silencioso y deliberado, para que añadir campos al formulario
   * no rompa la petición.
   */
  private cleanData(
    definition: ResourceDefinition,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const allowed = new Set(Object.keys(definition.model.rawAttributes));
    const guarded = this.guardedColumns(definition);
    return Object.fromEntries(
      Object.entries(data).filter(
        ([key]) => allowed.has(key) && !guarded.has(key),
      ),
    );
  }

  /**
   * Columnas que esta tabla no admite escribir.
   *
   * Une los secretos comunes a todo el servicio con los vetos propios de la
   * tabla. Como {@link cleanData}, el descarte es silencioso: mandar una de
   * estas columnas no da error, simplemente no se aplica.
   */
  private guardedColumns(definition: ResourceDefinition): Set<string> {
    return new Set([
      ...SECRET_COLUMNS,
      ...(GUARDED_COLUMNS_BY_TABLE[definition.tableName] ?? []),
    ]);
  }

  /**
   * Columnas que no deben salir en las lecturas de esta tabla.
   *
   * Se calcula contra el modelo para no pedirle a Sequelize que excluya una
   * columna inexistente, que sería un error de consulta.
   */
  private hiddenColumns(definition: ResourceDefinition): string[] {
    return Object.keys(definition.model.rawAttributes).filter(
      (column) => SECRET_COLUMNS.has(column),
    );
  }

  private createData(definition: ResourceDefinition, data: Record<string, unknown>) {
    const clean = this.cleanData(definition, data);
    const now = new Date();
    if ('created_at' in definition.model.rawAttributes) clean.created_at = now;
    if ('updated_at' in definition.model.rawAttributes) clean.updated_at = now;
    return clean;
  }

  /**
   * Prepara los campos de una actualización.
   *
   * Descarta la fecha de alta y las claves primarias. Reescribir la clave
   * primaria dejaba la fila huérfana respecto de las tablas que la referencian
   * —asignaciones de rol, membresías, inscripciones— o permitía ocupar un
   * identificador ajeno.
   */
  private updateData(definition: ResourceDefinition, data: Record<string, unknown>) {
    const clean = this.cleanData(definition, data);
    delete clean.created_at;
    for (const primaryKey of definition.primaryKeys) delete clean[primaryKey];
    if ('updated_at' in definition.model.rawAttributes) clean.updated_at = new Date();
    return clean;
  }

  /**
   * Exige una condición de filtrado no vacía.
   *
   * Sin esta comprobación, un `where` que llegara vacío o indefinido haría que
   * Sequelize aplicara la operación a **todas** las filas de la tabla.
   *
   * @throws {AppError} 400 `WHERE_REQUIRED`.
   */
  private requireWhere(where: Record<string, unknown>): void {
    if (!where || !Object.keys(where).length) {
      throw new AppError(
        'Se requiere una condición where no vacía',
        400,
        'WHERE_REQUIRED',
      );
    }
  }
}

/**
 * Instancia sin tabla fija: el recurso llega por llamada.
 *
 * Es la que respalda el endpoint genérico `/data/:resource`. Para una entidad
 * concreta, crear una instancia propia con su tabla en lugar de reutilizar ésta.
 */
export default new ResourcesRepository();
