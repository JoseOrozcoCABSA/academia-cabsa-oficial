/**
 * @file Componente `ModuleHub`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
/**
 * Portada de un modulo del panel: cuadricula de accesos a sus entidades.
 *
 * Es solo presentacion; los accesos llegan en `items` desde la pantalla que la
 * usa.
 */
export default function ModuleHub({eyebrow,title,description,items,tone='default'}){
  return <div className={`page admin-page module-shell module-shell--${tone}`}>
    <header className="module-shell-hero"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><span>{items.length} herramientas conectadas</span></header>
    <nav className="module-tab-bar" aria-label={`Módulos de ${title}`}>{items.map((item)=><Link key={`${item.to}-${item.title}`} to={item.to}>{item.title}</Link>)}</nav>
    <section className="hub-grid module-tool-grid">{items.map((item)=><Link key={`${item.to}-${item.title}`} to={item.to}><span>{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p><strong>Abrir módulo <ArrowRight/></strong></div></Link>)}</section>
  </div>
}
