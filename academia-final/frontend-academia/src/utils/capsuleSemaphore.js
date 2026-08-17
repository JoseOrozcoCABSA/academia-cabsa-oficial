/**
 * @file Extrae el semaforo de autoevaluacion incrustado en el HTML de una
 * capsula.
 *
 * Los autores escriben el semaforo dentro del contenido de la capsula, con los
 * emoji verde, amarillo y rojo. Este modulo lo localiza, saca el texto de cada
 * opcion y **lo quita del HTML**, para que la pantalla lo pinte como control
 * interactivo en lugar de como parrafo suelto y no aparezca dos veces.
 *
 * Todo el trabajo depende del DOM del navegador, asi que no funciona en
 * renderizado en servidor; hay una guarda para ese caso.
 */

const defaultOptions = Object.freeze({
  GREEN: 'Comprendí bien el contenido de esta cápsula y puedo explicarlo con mis propias palabras.',
  YELLOW: 'Comprendí parte del contenido, pero necesito repasarlo para sentirme más seguro.',
  RED: 'Me costó comprender el contenido y necesito apoyo o una explicación adicional.',
});

/**
 * Obtiene el texto de un elemento conservando los saltos de linea.
 *
 * Los `<br>` y los cierres de bloque se convierten en saltos **antes** de leer
 * el texto, porque `textContent` los perderia y las tres opciones acabarian
 * pegadas en una sola linea, con lo que el reparto por color fallaria. Al final
 * colapsa los saltos repetidos.
 *
 */
const elementText = (element) => {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6')
    .forEach((node) => node.append('\n'));
  return (clone.textContent || '')
    .replace(/\r\n?|\n{2,}/g, '\n')
    .trim();
};

/**
 * Recorta el texto que sigue a un emoji hasta que empiece otro color.
 *
 * La expresion se arma en tiempo de ejecucion con una anticipacion a los otros
 * dos emoji: asi se delimita cada opcion sin depender de saltos de linea ni del
 * orden en que aparezcan. Necesita las banderas `s` (el punto abarca saltos) y
 * `u` (los emoji ocupan dos unidades).
 *
 * Despues limpia el prefijo redundante («Verde:», «Amarillo:», «Rojo:») y el
 * guion inicial, que los autores escriben de forma inconsistente.
 *
 * Nota: los emoji se interpolan sin escapar. Con estos tres valores es
 * inofensivo, pero usar la funcion con un marcador que contenga metacaracteres
 * romperia la expresion.
 *
 * @returns El texto de la opcion, o cadena vacia si el emoji no aparece.
 */
const extractColorText = (text, emoji, followingColors) => {
  const escapedFollowing = followingColors.join('|');
  const expression = new RegExp(
    `${emoji}\\s*(.*?)(?=${escapedFollowing}|$)`,
    'su',
  );
  const match = text.match(expression);
  if (!match?.[1]) return '';
  return match[1]
    .replace(/^(verde|amarillo|rojo)\s*:\s*/iu, '')
    .replace(/^[-–—]\s*/u, '')
    .trim();
};

/**
 * Localiza el semaforo, devuelve sus opciones y el HTML sin el.
 *
 * Dos estrategias, en este orden:
 * 1. Un elemento con clase `.semaforo`, que es la forma recomendada.
 * 2. Si no existe, un parrafo o titulo cuyo texto hable de «semaforo de
 *    autoevaluacion», y a partir de ahi hasta cuatro elementos hermanos
 *    seguidos que contengan alguno de los tres emoji. El tope de cuatro evita
 *    tragarse el resto de la capsula si el contenido no encaja con lo previsto.
 *
 * Cada opcion que no se consiga extraer cae a su texto por omision, asi que el
 * resultado siempre trae las tres.
 *
 * @param {string} [html=''] Contenido de la capsula.
 * @returns {{hasSemaphore: boolean, cleanHtml: string, options: object}}
 *   `cleanHtml` es el contenido **sin** los elementos del semaforo; hay que
 *   pintar ese y no el original, o el texto saldra duplicado. Con HTML vacio o
 *   fuera del navegador devuelve `hasSemaphore: false` y el HTML intacto.
 */
export const parseCapsuleSemaphore = (html = '') => {
  if (!html || typeof window === 'undefined') {
    return { hasSemaphore: false, cleanHtml: html, options: defaultOptions };
  }

  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const configuredElements = [];
  const semaphoreBlock = documentNode.body.querySelector('.semaforo');

  if (semaphoreBlock) {
    configuredElements.push(semaphoreBlock);
  } else {
    const semanticHeading = [...documentNode.body.querySelectorAll('p, h2, h3, h4, div')]
      .find((element) => (
        /sem[aá]foro\s+de\s+autoevaluaci[oó]n|autoevaluaci[oó]n\s+(?:tipo\s+)?sem[aá]foro/iu
          .test(element.textContent || '')
      ));

    if (semanticHeading) {
      configuredElements.push(semanticHeading);
      let sibling = semanticHeading.nextElementSibling;
      let inspected = 0;
      while (sibling && inspected < 4) {
        if (!/[🟢🟡🔴]/u.test(sibling.textContent || '')) break;
        configuredElements.push(sibling);
        sibling = sibling.nextElementSibling;
        inspected += 1;
      }
    }
  }

  const text = configuredElements.map(elementText).join('\n');
  const options = {
    GREEN: extractColorText(text, '🟢', ['🟡', '🔴']) || defaultOptions.GREEN,
    YELLOW: extractColorText(text, '🟡', ['🟢', '🔴']) || defaultOptions.YELLOW,
    RED: extractColorText(text, '🔴', ['🟢', '🟡']) || defaultOptions.RED,
  };

  configuredElements.forEach((element) => element.remove());
  return {
    hasSemaphore: configuredElements.length > 0,
    cleanHtml: documentNode.body.innerHTML,
    options,
  };
};

/**
 * Textos por omision, expuestos para que una pantalla pueda mostrar el semaforo
 * aunque la capsula no lo traiga.
 */
export const semaphoreDefaults = defaultOptions;
