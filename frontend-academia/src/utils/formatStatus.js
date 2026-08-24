/**
 * @file Traduce el estado de un registro a su etiqueta en espanol.
 *
 * Las etiquetas viven en `config/constants.js`. Un estado que no este en el mapa
 * se muestra tal cual, de forma que un valor nuevo del backend se ve sin
 * traducir en lugar de desaparecer.
 */

import { STATUS_LABELS } from '@/config/constants'; export const formatStatus = (value) => STATUS_LABELS[value] || value || 'Sin estado';
