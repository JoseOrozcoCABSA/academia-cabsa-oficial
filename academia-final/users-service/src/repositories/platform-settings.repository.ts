import { QueryTypes } from 'sequelize';
import database from '#config/database';

const SELF_CANCELLATION_KEY = 'scholarship_self_cancellation_enabled';

export class PlatformSettingsRepository {
  async scholarshipSelfCancellationEnabled() {
    const rows = await database.query<{ valor: string }>(
      `SELECT valor FROM usuarios_configuracion_plataforma
       WHERE clave=:key LIMIT 1`,
      { replacements: { key: SELF_CANCELLATION_KEY }, type: QueryTypes.SELECT },
    );
    return rows[0]?.valor === '1';
  }

  async setScholarshipSelfCancellation(enabled: boolean, updatedBy: string) {
    await database.query(
      `INSERT INTO usuarios_configuracion_plataforma
       (clave,valor,descripcion,actualizado_por,creado_en,actualizado_en)
       VALUES (:key,:value,:description,:updatedBy,NOW(),NOW())
       ON DUPLICATE KEY UPDATE
         valor=VALUES(valor),actualizado_por=VALUES(actualizado_por),actualizado_en=NOW()`,
      {
        replacements: {
          key: SELF_CANCELLATION_KEY,
          value: enabled ? '1' : '0',
          description: 'Permite que los beneficiarios cancelen su propia beca desde el portal',
          updatedBy,
        },
        type: QueryTypes.INSERT,
      },
    );
    return { enabled };
  }
}

export default new PlatformSettingsRepository();
