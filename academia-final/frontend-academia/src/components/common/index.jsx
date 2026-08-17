/**
 * @file Biblioteca de componentes de interfaz.
 *
 * Aqui viven las implementaciones reales; los archivos hermanos
 * (`Button.jsx`, `Modal.jsx`, ...) solo las reexportan para poder importarlas
 * por su propia ruta.
 *
 * Todos aceptan `...props` y los derraman sobre el elemento nativo, de modo que
 * cualquier atributo HTML o manejador funciona sin envolverlo. La contrapartida
 * es que no hay validacion de props: un nombre mal escrito llega al DOM en
 * silencio.
 *
 * Los textos por omision estan en espanol y viven aqui, no en un archivo de
 * traducciones.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { X, LoaderCircle, Inbox } from 'lucide-react';

/**
 * Boton con variante visual.
 *
 * No fija `type`, asi que dentro de un `<form>` hereda el comportamiento nativo
 * y **envia el formulario**. Para un boton de cancelar hay que pasar
 * `type="button"` explicitamente.
 *
 * @param {'primary'|'secondary'|'danger'} [variant='primary'] Sufijo de la
 *   clase CSS `button--*`; un valor no previsto produce una clase sin estilos.
 */
export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`button button--${variant} ${className}`} {...props}>{children}</button>;
}
/**
 * Campo de texto con etiqueta y mensaje de error.
 *
 * La etiqueta envuelve al `<input>`, por lo que el foco funciona sin necesidad
 * de `id`/`htmlFor`. El error solo se pinta si `error` es veraz, y no se enlaza
 * con `aria-describedby`: un lector de pantalla no lo asocia al campo.
 */
export function Input({ label, error, id: providedId, 'aria-describedby': describedBy, ...props }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  return <label className="field" htmlFor={id}><span>{label}</span><input id={id} aria-invalid={error?true:undefined} aria-describedby={[describedBy,error?errorId:null].filter(Boolean).join(' ')||undefined} {...props} />{error && <small id={errorId}>{error}</small>}</label>;
}
/**
 * Lista desplegable con etiqueta. Las `<option>` se pasan como hijos.
 *
 * A diferencia de {@link Input} no admite `error`.
 */
export function Select({ label, children, ...props }) {
  return <label className="field"><span>{label}</span><select {...props}>{children}</select></label>;
}
/** Area de texto con etiqueta. Sin `error` ni contador de caracteres. */
export function Textarea({ label, ...props }) {
  return <label className="field"><span>{label}</span><textarea {...props} /></label>;
}
/** Contenedor con estilo de tarjeta. Solo maquetacion. */
export function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
/**
 * Etiqueta de estado.
 *
 * @param {'neutral'|'green'|string} [tone='neutral'] Sufijo de `badge--*`. Quien
 *   decide el tono es quien llama; este componente no interpreta el estado.
 */
export function Badge({ children, tone = 'neutral' }) { return <span className={`badge badge--${tone}`}>{children}</span>; }
/** Indicador de carga anunciado por lectores de pantalla. */
export function Loader({ label = 'Cargando información' }) {
  return <div className="state" role="status" aria-live="polite"><LoaderCircle className="spin" aria-hidden="true" /><p>{label}</p></div>;
}
/**
 * Estado vacio, con textos por omision y una accion opcional.
 *
 * `action` se pinta tal cual, asi que quien llama decide si hay boton y que
 * hace.
 */
export function EmptyState({ title = 'Aún no hay registros', description = 'Los nuevos registros aparecerán aquí.', action }) {
  return <div className="state"><Inbox /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
/**
 * Dialogo modal. Devuelve `null` cuando `open` es falso, de modo que los hijos
 * se desmontan y su estado local se pierde al cerrar.
 *
 * Al abrir, mueve el foco al dialogo, lo mantiene dentro con Tab, permite cerrar
 * con Escape y devuelve el foco al control que lo tenia al cerrar.
 */
export function Modal({ open, title, children, onClose }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const selector = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const focusable = () => [...(dialog?.querySelectorAll(selector) || [])];
    (focusable()[0] || dialog)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex="-1">
      <header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X aria-hidden="true" /></button></header>
      {children}
    </section>
  </div>;
}
/**
 * Tabla de datos sin ordenacion ni paginacion propias: pinta `rows` tal como
 * llegan.
 *
 * Cada columna es `{ key, label, render? }`. Sin `render`, el valor pasa por
 * `String(...)`, asi que un objeto o un arreglo se muestran como
 * `[object Object]`; los nulos se sustituyen por un guion.
 *
 * La clave de fila cae al indice si falta `rowKey`, lo que provoca remontajes
 * al reordenar la lista.
 *
 * @param {Array<{key: string, label: string, render?: Function}>} columns
 * @param {string} [rowKey='id'] Propiedad que identifica la fila.
 */
export function Table({ columns, rows, rowKey = 'id' }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody>
  </table></div>;
}
/**
 * Confirmacion de dos botones sobre {@link Modal}.
 *
 * No deshabilita el boton de confirmar mientras la accion esta en curso: pulsar
 * dos veces rapido puede lanzar la operacion dos veces. Quien llama debe cerrar
 * el dialogo en cuanto acepte.
 */
export function ConfirmDialog({ open, title = 'Confirmar acción', message, onConfirm, onClose }) {
  const [working, setWorking] = useState(false);
  useEffect(() => { if (!open) setWorking(false); }, [open]);
  const confirm = async () => {
    if (working) return;
    setWorking(true);
    try { await onConfirm(); } finally { setWorking(false); }
  };
  return <Modal open={open} title={title} onClose={working?()=>{}:onClose}><p>{message}</p><div className="modal-actions"><Button variant="secondary" onClick={onClose} disabled={working}>Cancelar</Button><Button variant="danger" onClick={confirm} disabled={working}>{working?'Procesando…':'Confirmar'}</Button></div></Modal>;
}
