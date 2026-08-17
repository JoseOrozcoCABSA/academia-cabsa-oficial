/**
 * @file Registro de recursos de `ai-service`.
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
import CabsaAsistentesTutores from '#models/CabsaAsistentesTutores';
import SoaAiAssistants from '#models/SoaAiAssistants';
import SoaChatMessages from '#models/SoaChatMessages';
import SoaChatSessions from '#models/SoaChatSessions';
import SoaPromptTemplates from '#models/SoaPromptTemplates';
import SoaRagDocuments from '#models/SoaRagDocuments';
import SoaRagKnowledgeBases from '#models/SoaRagKnowledgeBases';

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
  "ia_asistentes_tutores": { model: CabsaAsistentesTutores, tableName: "ia_asistentes_tutores", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "ia_asistentes": { model: SoaAiAssistants, tableName: "ia_asistentes", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "ia_mensajes_chat": { model: SoaChatMessages, tableName: "ia_mensajes_chat", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "ia_sesiones_chat": { model: SoaChatSessions, tableName: "ia_sesiones_chat", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "ia_plantillas_prompts": { model: SoaPromptTemplates, tableName: "ia_plantillas_prompts", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "ia_documentos_rag": { model: SoaRagDocuments, tableName: "ia_documentos_rag", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "ia_bases_conocimiento_rag": { model: SoaRagKnowledgeBases, tableName: "ia_bases_conocimiento_rag", tableType: "BASE TABLE", primaryKeys: ["id"] },
};

export default resources;
