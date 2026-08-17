/**
 * @file Registro de recursos de `content-service`.
 *
 * Declara qué tablas expone el servicio por su API genérica: 3 en total,
 * 3 tablas y 0 vistas.
 *
 * Es la lista de lo accesible: una tabla que no esté aquí no se puede
 * consultar ni modificar por la API, aunque exista en la base de datos.
 *
 * @see repositories/resources.repository.ts Quien lo consulta en cada operación.
 */

import type { Model, ModelStatic } from 'sequelize';
import CabsaCapsules from '#models/CabsaCapsules';
import SoaContentAssets from '#models/SoaContentAssets';
import SoaEducationalContent from '#models/SoaEducationalContent';
import CabsaMediaAssets from '#models/CabsaMediaAssets';
import CabsaMediaRelations from '#models/CabsaMediaRelations';

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
  "contenido_capsulas": { model: CabsaCapsules, tableName: "contenido_capsulas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "contenido_recursos": { model: SoaContentAssets, tableName: "contenido_recursos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "contenido_material_educativo": { model: SoaEducationalContent, tableName: "contenido_material_educativo", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "contenido_archivos": { model: CabsaMediaAssets, tableName: "contenido_archivos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "contenido_archivos_relaciones": { model: CabsaMediaRelations, tableName: "contenido_archivos_relaciones", tableType: "BASE TABLE", primaryKeys: ["id"] },
};

export default resources;
