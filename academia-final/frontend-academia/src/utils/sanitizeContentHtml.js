/**
 * @file Depura el HTML de cursos y capsulas antes de inyectarlo en la pagina.
 *
 * El contenido lo escriben editores y se guarda en la base de datos, de modo que
 * al pintarlo con `dangerouslySetInnerHTML` seria ejecutable. Este modulo es la
 * unica barrera: trabaja con listas de permitidos —etiquetas, atributos y, para
 * los iframes, tambien dominios— y descarta todo lo demas.
 *
 * El analisis se hace con `DOMParser`, que produce un arbol inerte: no ejecuta
 * scripts ni carga recursos mientras se limpia.
 *
 * Ningun componente deberia pintar contenido de la base sin pasar por aqui.
 */

const allowedTags = new Set([
  'A', 'BLOCKQUOTE', 'BR', 'DIV', 'EM', 'FIGCAPTION', 'FIGURE',
  'H1', 'H2', 'H3', 'H4', 'HEADER', 'HR', 'IFRAME', 'IMG', 'LI', 'OL', 'P',
  'PRE', 'SOURCE', 'SPAN', 'STRONG', 'TABLE', 'TBODY', 'TD',
  'TH', 'THEAD', 'TR', 'UL', 'VIDEO', 'SECTION',
]);

/**
 * Etiquetas que se borran **con su contenido**.
 *
 * Son las que ejecutan codigo, cargan recursos externos o capturan datos del
 * usuario. `STYLE` esta aqui porque el CSS puede tapar la interfaz o filtrar
 * datos con selectores; `FORM` e `INPUT`, para que no se pueda montar un
 * formulario de suplantacion dentro de una leccion.
 */
const removableTags = new Set([
  'BASE', 'BUTTON', 'EMBED', 'FORM', 'INPUT', 'LINK', 'META',
  'OBJECT', 'SCRIPT', 'STYLE', 'TEXTAREA',
]);

/**
 * Atributos admitidos en cualquier etiqueta, y los especificos de cada una.
 *
 * Deliberadamente **no** se admite `style`, que permitiria superponer elementos,
 * ni `id`, que podria colisionar con los de la aplicacion.
 */
const globalAttributes = new Set(['class', 'title']);
const attributesByTag = {
  A: new Set(['href', 'target', 'rel']),
  IFRAME: new Set(['src', 'title', 'allow', 'allowfullscreen', 'loading']),
  IMG: new Set(['src', 'alt', 'width', 'height', 'loading']),
  SOURCE: new Set(['src', 'type']),
  TABLE: new Set(['summary']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan', 'scope']),
  VIDEO: new Set(['src', 'controls', 'poster', 'preload']),
};

/**
 * Decide si una URL puede quedarse en un `href` o un `src`.
 *
 * Reglas, en orden:
 * 1. Las rutas internas (`/...`) y los anclas (`#...`) se admiten.
 * 2. El resto debe ser `http://` o `https://`. Es lo que bloquea
 *    `javascript:`, `data:` y `vbscript:`, que son las vias para ejecutar
 *    codigo desde un enlace.
 * 3. Ademas, un `iframe` solo puede apuntar a los dominios de video de la
 *    lista, para que nadie incruste una pagina arbitraria dentro del curso.
 *
 * El `www.` se quita antes de comparar y la comparacion es de host exacto, asi
 * que un subdominio como `evil.youtube.com.attacker.net` no cuela.
 *
 * @returns `true` si se conserva el atributo; `false` si hay que quitarlo.
 */
const safeUrl = (value, tagName) => {
  if (!value) return false;
  if (value.startsWith('/') || value.startsWith('#')) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  if (tagName !== 'IFRAME') return true;
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return [
      'youtube.com',
      'youtube-nocookie.com',
      'youtu.be',
      'vimeo.com',
      'player.vimeo.com',
    ].includes(host);
  } catch {
    return false;
  }
};

/**
 * Devuelve el HTML depurado y listo para inyectar.
 *
 * Recorre todos los elementos sobre una copia de la lista tomada antes de
 * modificar el arbol, de forma que los hijos de un elemento desenvuelto tambien
 * se revisan y no se cuela nada por el hueco.
 *
 * Ademas de filtrar, endurece lo que deja pasar: los enlaces reciben
 * `rel="noopener noreferrer"` —sin el, la pagina destino puede manipular la de
 * origen— y los externos se abren en otra pestana; las imagenes y los iframes se
 * marcan como carga diferida.
 *
 * @param {string} [html=''] Contenido sin depurar.
 * @returns {string} HTML seguro, o cadena vacia si no hay contenido o no hay
 *   navegador (no funciona en renderizado en servidor).
 */
export const sanitizeContentHtml = (html = '') => {
  if (!html || typeof window === 'undefined') return '';
  const documentNode = new DOMParser().parseFromString(html, 'text/html');

  [...documentNode.body.querySelectorAll('*')].forEach((element) => {
    if (removableTags.has(element.tagName)) {
      element.remove();
      return;
    }
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const allowed = globalAttributes.has(name)
        || attributesByTag[element.tagName]?.has(name);
      if (!allowed || name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (['href', 'src'].includes(name) && !safeUrl(attribute.value, element.tagName)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === 'A') {
      element.setAttribute('rel', 'noopener noreferrer');
      if (/^https?:\/\//i.test(element.getAttribute('href') || '')) {
        element.setAttribute('target', '_blank');
      }
    }
    if (element.tagName === 'IMG') element.setAttribute('loading', 'lazy');
    if (element.tagName === 'IFRAME') element.setAttribute('loading', 'lazy');
  });

  return documentNode.body.innerHTML;
};
