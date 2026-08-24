/**
 * Genera un README.md por carpeta en los frontends de academia-final.
 *
 * Los frontends no siguen la estructura de un servicio, así que tienen sus
 * propias reglas: la cadena aquí es `routes → pages → components → hooks →
 * services`. El inventario sale del código.
 *
 * Uso: node scripts/generar-documentacion-frontend.mjs . frontend-academia frontend-administracion
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
const APPS = process.argv.slice(3);

const LAYERS = {
  pages: {
    title: 'Páginas — una pantalla completa',
    role: 'Coordina el estado de la pantalla, la navegación y qué datos pide.',
    rules: [
      'No contiene `fetch` directo: llama a `services/`.',
      'No decide autorizaciones. Ocultar un botón es cosmético; el permiso lo comprueba el backend.',
      'Cuando pasa de ~250 líneas, se extraen sus componentes a `components/` y su carga de datos a un hook.',
      'Las reglas de cálculo puras (formatos, totales, transformaciones) salen a `utils/` o a un módulo de dominio.',
    ],
    mayImport: ['components', 'hooks', 'services', 'context', 'utils', 'config'],
    importedBy: ['routes'],
  },
  components: {
    title: 'Componentes — piezas reutilizables',
    role: 'Recibe props y representa. Sin conocimiento del resto de la aplicación.',
    rules: [
      'Recibe props; no conoce rutas globales ni guarda reglas de negocio.',
      'No llama a `services/` salvo que sea un componente contenedor declarado como tal.',
      'Un componente que necesita saber en qué ruta está, probablemente debería ser una página.',
    ],
    mayImport: ['hooks', 'utils'],
    importedBy: ['pages', 'layouts'],
  },
  hooks: {
    title: 'Hooks — estado y carga de datos',
    role: 'Encapsula la carga, el guardado y el estado asociado de una entidad.',
    rules: [
      'Expone siempre estados explícitos: `loading`, `error` y la acción correspondiente.',
      'Un error de red no debe dejar la pantalla en blanco: se expone para que la página lo muestre y permita reintentar.',
      'No representa nada; no devuelve JSX.',
    ],
    mayImport: ['services', 'utils'],
    importedBy: ['pages', 'components'],
  },
  services: {
    title: 'Servicios — cliente HTTP',
    role: 'Único lugar del frontend que habla con la API.',
    rules: [
      'Es el único sitio con `fetch`/axios. Ninguna página ni componente llama directamente a la API.',
      'No contiene reglas de negocio: pide, devuelve y normaliza la forma de la respuesta.',
      'La URL base sale de `config/`, nunca escrita a mano en la llamada.',
    ],
    mayImport: ['config', 'utils'],
    importedBy: ['hooks', 'pages', 'store'],
  },
  context: {
    title: 'Contexto — estado compartido',
    role: 'Sesión y datos que atraviesan toda la aplicación.',
    rules: [
      'Sólo lo que de verdad es global. Un estado que usa una sola rama del árbol no va aquí.',
      'El contexto de sesión es la única fuente de verdad del usuario autenticado.',
    ],
    mayImport: ['services', 'utils'],
    importedBy: ['pages', 'components', 'layouts'],
  },
  store: {
    title: 'Store — estado de aplicación',
    role: 'Estado compartido que no encaja en un contexto de React.',
    rules: [
      'Sin llamadas HTTP dentro del store: eso es de `services/`.',
      'Cada porción de estado tiene un dueño claro; no se duplica lo que ya vive en el contexto de sesión.',
    ],
    mayImport: ['services', 'utils'],
    importedBy: ['pages', 'components'],
  },
  routes: {
    title: 'Rutas — mapa de navegación',
    role: 'Declara qué página responde a cada camino y qué guardias la protegen.',
    rules: [
      'Sólo composición de rutas: sin lógica de pantalla.',
      'Las páginas pesadas se cargan de forma diferida (`lazy`), para no engordar el paquete inicial.',
      'Las rutas protegidas pasan por el guardia de sesión; nunca se confía en ocultar el enlace.',
    ],
    mayImport: ['pages', 'layouts', 'components'],
    importedBy: ['App'],
  },
  layouts: {
    title: 'Layouts — armazón de pantalla',
    role: 'Cabecera, barra lateral, pie y el hueco donde se pinta la página.',
    rules: [
      'Sin lógica de negocio ni carga de datos propia, salvo la del propio armazón.',
      'No conoce qué página está dentro.',
    ],
    mayImport: ['components', 'context'],
    importedBy: ['routes'],
  },
  utils: {
    title: 'Utilidades — funciones puras',
    role: 'Formatos, conversiones y cálculos sin estado.',
    rules: [
      'Funciones puras: mismos argumentos, mismo resultado, sin efectos.',
      'Sin JSX y sin acceso a la API. Es lo más fácil de probar del frontend.',
    ],
    mayImport: [],
    importedBy: ['todas las capas'],
  },
  config: {
    title: 'Configuración',
    role: 'URL base de la API y constantes de entorno.',
    rules: [
      'Único lugar que lee `import.meta.env`.',
      'Ningún secreto: todo lo que llega aquí es público en el navegador.',
    ],
    mayImport: [],
    importedBy: ['services'],
  },
  data: {
    title: 'Datos estáticos',
    role: 'Catálogos fijos que no vienen de la API.',
    rules: ['Sólo literales. Si debe cambiar sin desplegar, va en la API.'],
    mayImport: [],
    importedBy: ['pages', 'components'],
  },
};

/** Extrae la primera línea útil de la cabecera del archivo. */
const describe = (file) => {
  const text = fs.readFileSync(file, 'utf8').slice(0, 1000);
  const jsdoc = text.match(/@file\s+([\s\S]*?)(?:\n\s*\*\s*\n|\n\s*\*\s*@|\n\s*\*\/)/);
  if (jsdoc) {
    return jsdoc[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const lead = text.match(/^\s*\/\*\*?([\s\S]*?)\*\//);
  if (lead) {
    return lead[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*?\s?/, '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 200)
      .trim();
  }
  return '';
};

const documentFolder = (absDir, layerKey, app, relLabel) => {
  const spec = LAYERS[layerKey];
  if (!spec) return 0;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && /\.(jsx?|tsx?)$/.test(e.name) && !/\.test\./.test(e.name))
    .map((e) => e.name)
    .sort();
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const rows = files.map((name) => {
    const desc = describe(path.join(absDir, name)) || '_Sin cabecera; añadir al editarlo._';
    return `| \`${name}\` | ${desc} |`;
  });

  const lines = [
    `# ${spec.title}`,
    '',
    `**Aplicación:** \`${app}\` · **Carpeta:** \`${relLabel}\``,
    '',
    spec.role,
    '',
    '## Reglas de esta carpeta',
    '',
    ...spec.rules.map((r) => `- ${r}`),
    '',
    '## Relaciones permitidas',
    '',
    `- **Puede importar de:** ${spec.mayImport.length ? spec.mayImport.map((d) => `\`${d}\``).join(', ') : '_nada; es una hoja del grafo_'}`,
    `- **La importan:** ${spec.importedBy.map((d) => `\`${d}\``).join(', ')}`,
    '',
    '> La cadena es `routes → pages → components → hooks → services`.',
    '> Un import que salte hacia atrás es un error de arquitectura.',
    '',
    '## Archivos',
    '',
  ];

  if (rows.length) {
    lines.push('| Archivo | Responsabilidad |', '|---|---|', ...rows, '');
  } else {
    lines.push('_Sin archivos directos; ver subcarpetas._', '');
  }

  if (subdirs.length) {
    lines.push('## Subcarpetas', '', ...subdirs.map((d) => `- \`${d}/\``), '');
  }

  lines.push(
    '---',
    '',
    '_Generado desde el código con `node scripts/generar-documentacion-frontend.mjs`._',
  );

  fs.writeFileSync(path.join(absDir, 'README.md'), lines.join('\n') + '\n');
  let count = 1;
  for (const sub of subdirs) {
    count += documentFolder(path.join(absDir, sub), layerKey, app, `${relLabel}/${sub}`);
  }
  return count;
};

let total = 0;
for (const app of APPS) {
  const srcDir = path.join(ROOT, app, 'src');
  if (!fs.existsSync(srcDir)) continue;
  for (const layerKey of Object.keys(LAYERS)) {
    const dir = path.join(srcDir, layerKey);
    if (!fs.existsSync(dir)) continue;
    total += documentFolder(dir, layerKey, app, `src/${layerKey}`);
  }
}
console.log(`README.md de frontend generados: ${total}`);
