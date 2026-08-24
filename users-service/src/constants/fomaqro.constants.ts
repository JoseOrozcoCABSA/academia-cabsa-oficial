/**
 * @file Catalogo de regiones y municipios de FOMAQRO (Queretaro).
 *
 * Datos fijos en el codigo, no en la base: el formulario de registro los usa para
 * poblar los desplegables y el servicio los usa para validar lo que llega. Al
 * estar aqui, actualizar el catalogo exige desplegar.
 *
 * Las claves son los codigos oficiales de municipio y **se guardan como cadena**
 * porque llevan ceros a la izquierda (`'003'`), que un numero perderia.
 */

export interface FomaqroRegion {
  label: string;
  municipalities: Record<string, string>;
}

/**
 * Regiones indexadas por su numero, tambien como cadena.
 *
 * Es la unica fuente de verdad de la relacion region-municipio: si un registro
 * llega con un municipio que no pertenece a su region, se rechaza contra este
 * catalogo.
 */
export const FOMAQRO_REGIONS: Record<string, FomaqroRegion> = {
  '1': {
    label: 'Región 1',
    municipalities: {
      '003': 'Arroyo Seco',
      '009': 'Jalpan de Serra',
      '010': 'Landa de Matamoros',
      '002': 'Pinal de Amoles',
    },
  },
  '2': {
    label: 'Región 2',
    municipalities: {
      '004': 'Cadereyta de Montes',
      '013': 'Peñamiller',
      '015': 'San Joaquín',
    },
  },
  '3': {
    label: 'Región 3',
    municipalities: {
      '018': 'Tolimán',
      '005': 'Colón',
      '007': 'Ezequiel Montes',
    },
  },
  '4': {
    label: 'Región 4',
    municipalities: {
      '016': 'San Juan del Río',
      '017': 'Tequisquiapan',
      '001': 'Amealco de Bonfil',
    },
  },
  '5': {
    label: 'Región 5',
    municipalities: {
      '008': 'Huimilpan',
      '012': 'Pedro Escobedo',
      '011': 'El Marqués',
      '006': 'Corregidora',
    },
  },
  '6': {
    label: 'Región 6',
    municipalities: { '014': 'Querétaro OTE' },
  },
  '7': {
    label: 'Región 7',
    municipalities: { '014': 'Querétaro NTE' },
  },
  '8': {
    label: 'Región 8',
    municipalities: { '014': 'Querétaro PTE' },
  },
};
