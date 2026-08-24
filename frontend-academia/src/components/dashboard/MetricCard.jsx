/**
 * @file Tarjeta de metrica: una etiqueta y un valor.
 *
 * El valor se pinta tal como llega, sin formatear: quien la usa debe darle ya el
 * texto definitivo.
 */

import { Card } from '@/components/common'; export default function MetricCard({label,value}){return <Card><small>{label}</small><strong>{value}</strong></Card>}
