/**
 * @file Componente `ServiceStatus`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

export default function ServiceStatus({online=true}){return <span className={online?'badge badge--green':'badge'}>{online?'Disponible':'Sin respuesta'}</span>}
