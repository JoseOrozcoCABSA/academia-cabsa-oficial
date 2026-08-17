/**
 * @file Registro de recursos de `academia-service`.
 *
 * Declara qué tablas expone el servicio por su API genérica: 14 en total,
 * 14 tablas y 0 vistas.
 *
 * Es la lista de lo accesible: una tabla que no esté aquí no se puede
 * consultar ni modificar por la API, aunque exista en la base de datos.
 *
 * @see repositories/resources.repository.ts Quien lo consulta en cada operación.
 */

import type { Model, ModelStatic } from 'sequelize';
import CabsaCourseLessons from '#models/CabsaCourseLessons';
import CabsaCourses from '#models/CabsaCourses';
import CabsaForumReplies from '#models/CabsaForumReplies';
import CabsaForums from '#models/CabsaForums';
import CabsaForumTopics from '#models/CabsaForumTopics';
import Cache from '#models/Cache';
import CacheLocks from '#models/CacheLocks';
import FailedJobs from '#models/FailedJobs';
import JobBatches from '#models/JobBatches';
import Jobs from '#models/Jobs';
import Migrations from '#models/Migrations';
import SoaCertificates from '#models/SoaCertificates';
import SoaCourseEnrollments from '#models/SoaCourseEnrollments';
import SoaLessonProgress from '#models/SoaLessonProgress';

/**
 * Descripcion de una tabla o vista expuesta por el servicio.
 *
 * Es lo que permite que un solo controlador generico sirva a todas las
 * entidades: en lugar de escribir codigo por tabla, se consulta este registro.
 *
 * - `tableType` distingue tabla de vista. Las vistas son de solo lectura y el
 *   repositorio rechaza escribir en ellas con 405 `READ_ONLY_RESOURCE`.
 * - `primaryKeys` puede tener mas de un elemento. En ese caso las rutas por
 *   `/:id` no sirven y hay que usar `/record` con todas las claves.
 */
export interface ResourceDefinition {
  model: ModelStatic<Model>;
  tableName: string;
  tableType: 'BASE TABLE' | 'VIEW';
  primaryKeys: string[];
}

/**
 * Registro de recursos indexado por nombre de tabla.
 *
 * La clave es el nombre real en la base de datos, y es lo que viaja en la URL
 * como `:resource`. Una tabla que no este aqui es inaccesible por la API, asi
 * que este archivo es tambien la lista de lo que el servicio expone.
 *
 * Se genera a partir del esquema; conviene regenerarlo tras una migracion en vez
 * de editarlo a mano.
 */
export type ResourceRegistry = Record<string, ResourceDefinition>;

const resources: ResourceRegistry = {
  "academia_lecciones": { model: CabsaCourseLessons, tableName: "academia_lecciones", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_cursos": { model: CabsaCourses, tableName: "academia_cursos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_foro_respuestas": { model: CabsaForumReplies, tableName: "academia_foro_respuestas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_foros": { model: CabsaForums, tableName: "academia_foros", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_foro_temas": { model: CabsaForumTopics, tableName: "academia_foro_temas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_cache": { model: Cache, tableName: "academia_cache", tableType: "BASE TABLE", primaryKeys: ["key"] },
  "academia_cache_bloqueos": { model: CacheLocks, tableName: "academia_cache_bloqueos", tableType: "BASE TABLE", primaryKeys: ["key"] },
  "academia_trabajos_fallidos": { model: FailedJobs, tableName: "academia_trabajos_fallidos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_lotes_trabajo": { model: JobBatches, tableName: "academia_lotes_trabajo", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_trabajos": { model: Jobs, tableName: "academia_trabajos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_migraciones": { model: Migrations, tableName: "academia_migraciones", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_certificados": { model: SoaCertificates, tableName: "academia_certificados", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_inscripciones": { model: SoaCourseEnrollments, tableName: "academia_inscripciones", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "academia_progreso_lecciones": { model: SoaLessonProgress, tableName: "academia_progreso_lecciones", tableType: "BASE TABLE", primaryKeys: ["id"] },
};

export default resources;
