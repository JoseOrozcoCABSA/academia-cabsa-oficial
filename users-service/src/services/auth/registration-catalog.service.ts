/**
 * @file Catálogos que alimentan el formulario de alta.
 *
 * Son consultas de sólo lectura, sin efectos: las regiones de FOMAQRO salen de
 * constantes en código y los códigos postales del catálogo en base. Se separan
 * del alta porque el formulario los pide antes de que exista ninguna cuenta.
 *
 * @see #constants/fomaqro.constants Catálogo de regiones y municipios.
 */

import repository from '#repositories/auth.repository';
import { AppError } from '#utils/errors';
import { FOMAQRO_REGIONS } from '#constants/fomaqro.constants';

/** Servicio de catálogos del alta. */
export class RegistrationCatalogService {
  /**
   * Datos fijos del formulario: regiones de FOMAQRO y rutas legales.
   *
   * Es síncrono y no consulta la base, así que el cliente puede cachearlo.
   */
  registrationCatalog() {
    return {
      fomaqroRegions: FOMAQRO_REGIONS,
      legal: {
        termsPath: '/terminos',
        privacyPath: '/aviso-privacidad',
      },
    };
  }

  /**
   * Resuelve un código postal para los desplegables encadenados del alta.
   *
   * Agrupa las filas del catálogo en estado, municipio, ciudad y lista de
   * colonias. Estado y municipio se toman de la primera fila, asumiendo que
   * todas las colonias de un mismo código postal los comparten.
   *
   * @throws {AppError} 422 `INVALID_POSTAL_CODE` si no son cinco dígitos; 404
   *   `POSTAL_CODE_NOT_FOUND` si no está en el catálogo.
   */
  async postalCode(postalCode: string) {
    if (!/^\d{5}$/.test(postalCode)) {
      throw new AppError(
        'El código postal debe tener cinco dígitos',
        422,
        'INVALID_POSTAL_CODE',
      );
    }
    const records = await repository.findPostalCode(postalCode);
    if (!records.length) {
      throw new AppError(
        'No encontramos ese código postal en el catálogo',
        404,
        'POSTAL_CODE_NOT_FOUND',
      );
    }
    const first = records[0];
    return {
      postalCode,
      state: {
        id: first.state_id,
        code: first.state_code,
        name: first.state,
      },
      municipality: {
        id: first.municipality_id,
        code: first.municipality_code,
        name: first.municipality,
      },
      city: {
        id: first.city_id,
        name: first.city,
      },
      colonies: records.map((record) => ({
        id: record.colony_id,
        name: record.colony,
        city: record.city,
        settlementType: record.settlement_type,
        zone: record.zone,
      })),
    };
  }
}

/** Instancia única usada por la fachada. */
export default new RegistrationCatalogService();
