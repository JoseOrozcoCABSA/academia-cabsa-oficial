/**
 * @file Controlador CRUD genérico: capa HTTP del acceso a datos del servicio.
 *
 * Traduce peticiones de Express a llamadas de {@link ResourcesService} y
 * responde con el sobre uniforme de `utils/response`. No contiene reglas de
 * negocio: valida la forma del cuerpo y de los parámetros, y delega.
 *
 * Es la tercera pieza de la tríada genérica del proyecto
 * (`ResourcesController` → `ResourcesService` → `ResourcesRepository`). Cada
 * entidad se resuelve instanciándolo con su servicio y su tabla, en un archivo
 * de tres líneas:
 *
 * ```ts
 * export default new ResourcesController(service, 'usuarios_cuentas');
 * ```
 *
 * @see resources.service.ts    Capa intermedia a la que delega.
 * @see resources.repository.ts Donde viven las garantías de seguridad de datos.
 */

/** Tipos de Express. Sólo tipos: no añade nada al paquete compilado. */
import type { Request, Response } from 'express';
/**
 * Servicio de datos. Se importa la instancia por defecto (sin tabla fija) para
 * usarla como valor por omisión del constructor, y la clase para poder tiparlo.
 */
import service, { ResourcesService } from '#services/resources.service';
/** Formateadores de respuesta: `ok` para el sobre simple, `paginated` con metadatos de página. */
import { ok, paginated } from '#utils/response';
/** Normaliza `limit`/`offset` de la query, aplicando topes y valores por defecto. */
import { paginationFrom } from '#utils/pagination';
/** Error de dominio con código HTTP y clave estable, que el middleware de errores serializa. */
import { AppError } from '#utils/errors';

/**
 * Comprueba que un valor recibido del cliente sea un objeto JSON plano.
 *
 * Rechaza explícitamente los arreglos y `null`, que en JavaScript también son
 * de tipo `object`. Sin esta comprobación, un arreglo llegaría hasta Sequelize
 * y produciría un error de base de datos —un 500— en lugar de un 400 que
 * explica al cliente qué mandó mal.
 *
 * @param value Valor a validar, normalmente `request.body` o una de sus claves.
 * @param name Nombre del campo, sólo para el mensaje de error.
 * @returns El mismo valor, ya tipado como objeto.
 * @throws {AppError} 400 `INVALID_REQUEST` si no es un objeto plano.
 */
const objectValue = (
  value: unknown,
  name: string,
): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(
      `${name} debe ser un objeto JSON`,
      400,
      'INVALID_REQUEST',
    );
  }
  return value as Record<string, unknown>;
};

/**
 * Lee un parámetro de ruta quedándose siempre con un único valor.
 *
 * Express puede entregar un arreglo cuando el parámetro aparece repetido; este
 * ayudante toma el primero para que el resto del código trate con una cadena y
 * no tenga que comprobar el tipo en cada uso.
 */
const routeParam = (request: Request, name: string): string => {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Controlador REST genérico sobre cualquier recurso registrado en el servicio.
 *
 * Todos los métodos son propiedades con arrow function, no métodos de
 * prototipo. Es intencional: así conservan el `this` al pasarse como
 * referencia a las rutas (`router.get('/', controller.list)`) sin necesidad de
 * `.bind()`.
 *
 * Los errores no se capturan aquí. Suben por `next` hasta el middleware de
 * errores, que es el único punto donde se traducen a respuesta HTTP.
 */
export class ResourcesController {
  /** Servicio al que delega todas las operaciones. */
  private readonly service: ResourcesService;

  /**
   * Tabla a la que queda fijado el controlador, o `null` si el recurso llega
   * en la URL (`/data/:resource`).
   */
  private readonly fixedResource: string | null;

  /**
   * @param dataService Servicio de datos. Por defecto, la instancia genérica.
   * @param fixedResource Tabla fija de la entidad. Si se omite, el recurso se
   *   toma del parámetro de ruta `:resource`.
   */
  constructor(
    dataService: ResourcesService = service,
    fixedResource: string | null = null,
  ) {
    this.service = dataService;
    this.fixedResource = fixedResource;
  }

  /**
   * Determina sobre qué recurso opera la petición.
   *
   * La tabla fija tiene precedencia sobre el parámetro de la URL, de modo que
   * el endpoint de una entidad concreta no se puede desviar a otra tabla
   * manipulando la ruta.
   */
  private resource(request: Request): string {
    return this.fixedResource ?? routeParam(request, 'resource');
  }

  /**
   * `GET /resources` — Metadatos de los recursos que expone el servicio.
   *
   * El frontend de administración lo consume para construir sus pantallas de
   * forma genérica: de aquí obtiene las columnas y si el recurso es de sólo
   * lectura.
   *
   * @returns 200 con `{ count, resources }`.
   */
  catalog = async (_request: Request, response: Response): Promise<void> => {
    const data = this.service.catalog();
    ok(response, { count: data.length, resources: data });
  };

  /**
   * `GET /` — Listado paginado con filtros.
   *
   * Todo parámetro de la query que no sea de paginación u orden se interpreta
   * como filtro de igualdad sobre una columna. Es decir, `?status=ACTIVE`
   * filtra por `status`. Las claves reservadas (`limit`, `offset`, `orderBy`,
   * `orderDirection`) se excluyen del filtro.
   *
   * `orderDirection` sólo acepta `DESC`; cualquier otro valor, o su ausencia,
   * ordena ascendente. Una columna inexistente en `orderBy` la rechaza la base
   * de datos, no este método.
   *
   * @returns 200 con `{ data, pagination }`.
   */
  list = async (request: Request, response: Response): Promise<void> => {
    const pagination = paginationFrom(request.query);
    const reserved = new Set(['limit', 'offset', 'orderBy', 'orderDirection']);
    const where = Object.fromEntries(
      Object.entries(request.query).filter(([key]) => !reserved.has(key)),
    ) as Record<string, unknown>;
    const result = await this.service.list(this.resource(request), {
      ...pagination,
      where,
      orderBy: request.query.orderBy?.toString(),
      orderDirection:
        request.query.orderDirection?.toString().toUpperCase() === 'DESC'
          ? 'DESC'
          : 'ASC',
    });
    paginated(response, result, pagination);
  };

  /**
   * `GET /record` — Un registro localizado por la query completa.
   *
   * Es la vía para tablas con clave compuesta, donde {@link findById} no
   * sirve: aquí se pasan todas las claves como parámetros de consulta.
   *
   * @returns 200 con el registro.
   * @throws {AppError} 400 `WHERE_REQUIRED` si la query viene vacía; 404
   *   `RECORD_NOT_FOUND` si no hay coincidencia.
   */
  findOne = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await this.service.findOne(
        this.resource(request),
        request.query as Record<string, unknown>,
      ),
    );
  };

  /**
   * `GET /:id` — Un registro por clave primaria simple.
   *
   * @returns 200 con el registro.
   * @throws {AppError} 400 `COMPOSITE_KEY_REQUIRED` si la tabla tiene clave
   *   compuesta —usar entonces `/record`—; 404 `RECORD_NOT_FOUND` si no existe.
   */
  findById = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await this.service.findById(
        this.resource(request),
        routeParam(request, 'id'),
      ),
    );
  };

  /**
   * `POST /` — Crea un registro con el cuerpo de la petición.
   *
   * Las claves que no sean columnas reales se descartan en silencio en el
   * repositorio, así que enviar campos de más no falla. Lo obligatorio hay que
   * validarlo antes, con `validateBody` o en un servicio propio.
   *
   * @returns 201 con el registro creado.
   * @throws {AppError} 400 `INVALID_REQUEST` si el cuerpo no es un objeto; 405
   *   `READ_ONLY_RESOURCE` si el recurso es una vista.
   */
  create = async (request: Request, response: Response): Promise<void> => {
    ok(
      response,
      await this.service.create(
        this.resource(request),
        objectValue(request.body, 'body'),
      ),
      201,
    );
  };

  /**
   * `PATCH /` y `PUT /` — Actualización masiva por condición.
   *
   * El cuerpo debe traer dos objetos separados:
   * ```json
   * { "where": { "status": "PENDING" }, "data": { "status": "ACTIVE" } }
   * ```
   * Ambos se validan por separado, y el repositorio rechaza un `where` vacío
   * para que no se pueda actualizar la tabla completa.
   *
   * @returns 200 con `{ affected }`, el número de filas modificadas.
   * @throws {AppError} 400 `INVALID_REQUEST` si falta `where` o `data`, o no
   *   son objetos.
   */
  update = async (request: Request, response: Response): Promise<void> => {
    const body = objectValue(request.body, 'body');
    ok(
      response,
      await this.service.update(
        this.resource(request),
        objectValue(body.where, 'where'),
        objectValue(body.data, 'data'),
      ),
    );
  };

  /**
   * `PATCH /:id` y `PUT /:id` — Actualiza un registro por clave primaria.
   *
   * A diferencia de {@link update}, aquí el cuerpo son directamente los campos
   * a modificar, sin envolverlos en `where`/`data`.
   *
   * @returns 200 con `{ affected }`.
   * @throws {AppError} 400 `COMPOSITE_KEY_REQUIRED` si la clave es compuesta.
   */
  updateById = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(
      response,
      await this.service.updateById(
        this.resource(request),
        routeParam(request, 'id'),
        objectValue(request.body, 'body'),
      ),
    );
  };

  /**
   * `DELETE /` — Borrado masivo por condición.
   *
   * El cuerpo debe traer `{ "where": { … } }`. El borrado es físico: la fila
   * desaparece de la tabla, no hay baja lógica.
   *
   * @returns 200 con `{ affected }`, el número de filas eliminadas.
   * @throws {AppError} 400 `INVALID_REQUEST` si falta `where`.
   */
  remove = async (request: Request, response: Response): Promise<void> => {
    const body = objectValue(request.body, 'body');
    ok(
      response,
      await this.service.remove(
        this.resource(request),
        objectValue(body.where, 'where'),
      ),
    );
  };

  /**
   * `DELETE /:id` — Borra físicamente un registro por clave primaria simple.
   *
   * @returns 200 con `{ affected }`.
   * @throws {AppError} 400 `COMPOSITE_KEY_REQUIRED` si la clave es compuesta.
   */
  removeById = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    ok(
      response,
      await this.service.removeById(
        this.resource(request),
        routeParam(request, 'id'),
      ),
    );
  };
}

/**
 * Instancia sin tabla fija, que respalda el endpoint genérico
 * `/data/:resource`. Para una entidad concreta se crea una propia con su
 * servicio y su tabla en lugar de reutilizar ésta.
 */
export default new ResourcesController();
