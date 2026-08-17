/**
 * Traduce la prioridad a su etiqueta en espanol.
 *
 * Un valor no previsto se muestra tal cual, y solo si falta se cae a «Normal»:
 * asi una prioridad nueva en el backend se ve, aunque sin traducir, en lugar de
 * desaparecer.
 */
export const formatPriority = (value) => ({ high: 'Alta', medium: 'Media', low: 'Baja' }[value] || value || 'Normal');
