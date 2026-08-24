/**
 * Fecha en formato medio para Mexico, o cadena vacia si no hay valor.
 *
 * Solo fecha, sin hora, y en la zona horaria del navegador: una marca de tiempo
 * guardada en UTC cerca de la medianoche puede mostrarse con el dia anterior.
 */
export const formatDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value)) : '—';
