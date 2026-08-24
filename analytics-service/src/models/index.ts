/**
 * @file Registro de recursos de `analytics-service`.
 *
 * Declara qué tablas expone el servicio por su API genérica: 7 en total,
 * 7 tablas y 0 vistas.
 *
 * Es la lista de lo accesible: una tabla que no esté aquí no se puede
 * consultar ni modificar por la API, aunque exista en la base de datos.
 *
 * @see repositories/resources.repository.ts Quien lo consulta en cada operación.
 */

import type { Model, ModelStatic } from 'sequelize';
import CabsaCapsulaAvances from '#models/CabsaCapsulaAvances';
import CabsaAiAssistantEvents from '#models/CabsaAiAssistantEvents';
import CabsaDiasActivos from '#models/CabsaDiasActivos';
import CabsaRachas from '#models/CabsaRachas';
import SoaCapsuleProgress from '#models/SoaCapsuleProgress';
import SoaLearningActivityDays from '#models/SoaLearningActivityDays';
import SoaLearningXpEvent from '#models/SoaLearningXpEvent';

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
  "analitica_avances_capsulas": { model: CabsaCapsulaAvances, tableName: "analitica_avances_capsulas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "analitica_eventos_asistentes_ia": { model: CabsaAiAssistantEvents, tableName: "analitica_eventos_asistentes_ia", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "analitica_dias_activos": { model: CabsaDiasActivos, tableName: "analitica_dias_activos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "analitica_rachas": { model: CabsaRachas, tableName: "analitica_rachas", tableType: "BASE TABLE", primaryKeys: ["user_id"] },
  "analitica_progreso_capsulas": { model: SoaCapsuleProgress, tableName: "analitica_progreso_capsulas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "analitica_actividad_aprendizaje": { model: SoaLearningActivityDays, tableName: "analitica_actividad_aprendizaje", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "analitica_eventos_xp": { model: SoaLearningXpEvent, tableName: "analitica_eventos_xp", tableType: "BASE TABLE", primaryKeys: ["id"] },
};

export default resources;
