/**
 * @file Registro de recursos de `users-service`.
 *
 * Declara qué tablas expone el servicio por su API genérica: 24 en total,
 * 22 tablas y 2 vistas.
 *
 * Es la lista de lo accesible: una tabla que no esté aquí no se puede
 * consultar ni modificar por la API, aunque exista en la base de datos.
 *
 * Las vistas son de solo lectura; escribir en ellas responde 405
 * `READ_ONLY_RESOURCE`.
 *
 * @see repositories/resources.repository.ts Quien lo consulta en cada operación.
 */

import type { Model, ModelStatic } from 'sequelize';
import CabsaBecaCodeEmail from '#models/CabsaBecaCodeEmail';
import CabsaFomaqroRegistros from '#models/CabsaFomaqroRegistros';
import CabsaPendientes from '#models/CabsaPendientes';
import CabsaUserBecas from '#models/CabsaUserBecas';
import Ciudades from '#models/Ciudades';
import CodigosPostales from '#models/CodigosPostales';
import Colonias from '#models/Colonias';
import Estados from '#models/Estados';
import GruposCabsa from '#models/GruposCabsa';
import MembresiaUsuario from '#models/MembresiaUsuario';
import Municipios from '#models/Municipios';
import NivelMembresia from '#models/NivelMembresia';
import PasswordResetTokens from '#models/PasswordResetTokens';
import Sessions from '#models/Sessions';
import SoaPermissions from '#models/SoaPermissions';
import SoaRolePermissions from '#models/SoaRolePermissions';
import SoaRoles from '#models/SoaRoles';
import SoaUserRoles from '#models/SoaUserRoles';
import SoaUsers from '#models/SoaUsers';
import Users from '#models/Users';
import UsuariosGruposCabsa from '#models/UsuariosGruposCabsa';
import UsuariosOficiales from '#models/UsuariosOficiales';
import VistaControlDuplicadosUsuarios from '#models/VistaControlDuplicadosUsuarios';
import VistaUsuariosAdministracion from '#models/VistaUsuariosAdministracion';

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
  "usuarios_becas": { model: CabsaUserBecas, tableName: "usuarios_becas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_codigos_beca_email": { model: CabsaBecaCodeEmail, tableName: "usuarios_codigos_beca_email", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_fomaqro_registros": { model: CabsaFomaqroRegistros, tableName: "usuarios_fomaqro_registros", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_pendientes": { model: CabsaPendientes, tableName: "usuarios_pendientes", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_ciudades": { model: Ciudades, tableName: "usuarios_ciudades", tableType: "BASE TABLE", primaryKeys: ["id_ciudad"] },
  "usuarios_codigos_postales": { model: CodigosPostales, tableName: "usuarios_codigos_postales", tableType: "BASE TABLE", primaryKeys: ["id_codigo_postal"] },
  "usuarios_colonias": { model: Colonias, tableName: "usuarios_colonias", tableType: "BASE TABLE", primaryKeys: ["id_colonia"] },
  "usuarios_estados": { model: Estados, tableName: "usuarios_estados", tableType: "BASE TABLE", primaryKeys: ["id_estado"] },
  "usuarios_grupos": { model: GruposCabsa, tableName: "usuarios_grupos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_membresias": { model: MembresiaUsuario, tableName: "usuarios_membresias", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_municipios": { model: Municipios, tableName: "usuarios_municipios", tableType: "BASE TABLE", primaryKeys: ["id_municipio"] },
  "usuarios_niveles_membresia": { model: NivelMembresia, tableName: "usuarios_niveles_membresia", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_sesiones": { model: Sessions, tableName: "usuarios_sesiones", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_tokens_restablecimiento": { model: PasswordResetTokens, tableName: "usuarios_tokens_restablecimiento", tableType: "BASE TABLE", primaryKeys: ["email"] },
  "usuarios_permisos": { model: SoaPermissions, tableName: "usuarios_permisos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_roles_permisos": { model: SoaRolePermissions, tableName: "usuarios_roles_permisos", tableType: "BASE TABLE", primaryKeys: ["role_id","permission_id"] },
  "usuarios_roles": { model: SoaRoles, tableName: "usuarios_roles", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_asignaciones_roles": { model: SoaUserRoles, tableName: "usuarios_asignaciones_roles", tableType: "BASE TABLE", primaryKeys: ["user_id","role_id"] },
  "usuarios_cuentas": { model: SoaUsers, tableName: "usuarios_cuentas", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_cuentas_legacy": { model: Users, tableName: "usuarios_cuentas_legacy", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_miembros_grupos": { model: UsuariosGruposCabsa, tableName: "usuarios_miembros_grupos", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_oficiales": { model: UsuariosOficiales, tableName: "usuarios_oficiales", tableType: "BASE TABLE", primaryKeys: ["id"] },
  "usuarios_vista_control_duplicados": { model: VistaControlDuplicadosUsuarios, tableName: "usuarios_vista_control_duplicados", tableType: "VIEW", primaryKeys: ["id"] },
  "usuarios_vista_administracion": { model: VistaUsuariosAdministracion, tableName: "usuarios_vista_administracion", tableType: "VIEW", primaryKeys: ["id"] },
};

export default resources;
