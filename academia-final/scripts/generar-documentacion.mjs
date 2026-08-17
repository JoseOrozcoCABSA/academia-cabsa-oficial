/**
 * El inventario sale del código: la descripción de cada archivo se toma de la
 * etiqueta `@file` de su cabecera.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
const SERVICES = process.argv.slice(3);

/** Reglas por tipo de capa. Se escriben una vez y aplican a los 7 servicios. */
const LAYERS = {
  controllers: {
    title: 'Controladores — capa HTTP',
    role: 'Traduce peticiones de Express a llamadas de servicio y formatea la respuesta.',
    rules: [
      'No contiene SQL, ni consultas Sequelize, ni `fetch` a otros servicios.',
      'No contiene reglas de negocio: valida la **forma** de lo que llega y delega.',
      'No captura errores. Los deja subir al middleware de errores, único lugar donde se traducen a HTTP.',
      'Responde siempre con los ayudantes de `utils/response` (`ok`, `paginated`), nunca con `response.json` directo.',
      'Los métodos son propiedades con arrow function, para conservar `this` al pasarlos por referencia a las rutas.',
    ],
    mayImport: ['services', 'utils', 'types'],
    importedBy: ['routes'],
  },
  services: {
    title: 'Servicios — reglas de negocio',
    role: 'Orquesta las reglas del dominio y coordina repositorios y adaptadores.',
    rules: [
      'No conoce Express: no recibe `Request` ni `Response`, ni devuelve códigos HTTP (usa `AppError`).',
      'No escribe SQL. Todo acceso a datos pasa por un repositorio.',
      'Las llamadas salientes a otros servicios van en un adaptador de `services/clients/`, no incrustadas aquí.',
      'Lo que no necesita entrada/salida se extrae a un módulo de reglas puras (`*-rules.ts`), que es lo que cubren las pruebas.',
      'Un servicio que supera ~250 líneas o mezcla dos casos de uso se parte, dejando el archivo original como fachada.',
    ],
    mayImport: ['repositories', 'services/clients', 'utils', 'constants', 'config'],
    importedBy: ['controllers'],
  },
  repositories: {
    title: 'Repositorios — acceso a datos',
    role: 'Único lugar del servicio donde se escribe SQL o se usan modelos Sequelize.',
    rules: [
      'No contiene reglas de negocio: consulta y devuelve filas o modelos.',
      'Toda consulta con parámetros del cliente usa vinculación (`:param`), nunca interpolación de cadenas.',
      'Un borrado o actualización masiva exige `where` no vacío.',
      'Las transacciones se abren aquí y se pasan como argumento a las operaciones que deban ser atómicas.',
      'Un repositorio que supera ~250 líneas se parte por entidad y el original queda como fachada.',
    ],
    mayImport: ['models', 'config', 'utils', 'types'],
    importedBy: ['services'],
  },
  models: {
    title: 'Modelos — definición de tablas',
    role: 'Declara las tablas Sequelize y sus tipos.',
    rules: [
      'Sólo definición: columnas, tipos, índices y asociaciones.',
      'Sin lógica de negocio ni consultas; eso vive en repositorios.',
      'El nombre del archivo refleja la tabla real, para poder rastrearla desde la base.',
    ],
    mayImport: ['config', 'types'],
    importedBy: ['repositories'],
  },
  routes: {
    title: 'Rutas — montaje y autorización',
    role: 'Declara los caminos HTTP y los middlewares que protegen cada uno.',
    rules: [
      'No contiene lógica: sólo `router.<verbo>(ruta, ...middlewares, controlador.metodo)`.',
      'La autorización se declara aquí (`authMiddleware`, `allowRoles`), no dentro del controlador.',
      'El orden importa: las rutas literales van antes que las paramétricas (`/record` antes que `/:id`).',
      'Nunca se importa un repositorio ni un modelo desde una ruta.',
    ],
    mayImport: ['controllers', 'middlewares', 'validators'],
    importedBy: ['app.ts'],
  },
  middlewares: {
    title: 'Middlewares — corte transversal',
    role: 'Autenticación, roles, auditoría, errores y 404.',
    rules: [
      'Cada middleware hace una sola cosa y llama a `next()` o responde, nunca ambas.',
      'El middleware de errores es el único que convierte una excepción en respuesta HTTP.',
      'No contiene reglas de negocio de ningún módulo concreto.',
    ],
    mayImport: ['config', 'utils', 'types'],
    importedBy: ['routes', 'app.ts'],
  },
  validators: {
    title: 'Validadores — forma de la petición',
    role: 'Comprueba el cuerpo y los parámetros antes de llegar al controlador.',
    rules: [
      'Valida forma y tipo, no reglas de negocio (eso es del servicio).',
      'Falla con `AppError` 400 y una clave estable que el frontend pueda interpretar.',
    ],
    mayImport: ['utils'],
    importedBy: ['routes'],
  },
  config: {
    title: 'Configuración — entorno y conexiones',
    role: 'Lee variables de entorno, abre la conexión a base y firma los JWT.',
    rules: [
      'Es el único lugar que lee `process.env`. El resto del código importa de aquí.',
      'Una variable obligatoria que falte debe hacer fallar el arranque, no degradarse en silencio.',
      'Ningún secreto se escribe en el código ni se registra en los logs.',
    ],
    mayImport: [],
    importedBy: ['todas las capas'],
  },
  constants: {
    title: 'Constantes — catálogos fijos',
    role: 'Datos que no cambian en ejecución y viven en el código.',
    rules: [
      'Sólo valores literales y sus tipos; sin lógica ni entrada/salida.',
      'Cambiar un catálogo exige desplegar: si debe cambiar en caliente, va en base de datos.',
    ],
    mayImport: [],
    importedBy: ['services', 'validators'],
  },
  utils: {
    title: 'Utilidades — ayudantes sin dominio',
    role: 'Funciones genéricas reutilizables: respuesta, errores, paginación, fechas, contraseñas.',
    rules: [
      'No conoce ninguna entidad del negocio. Si necesita saber qué es un curso, no va aquí.',
      'Funciones puras siempre que sea posible, para poder probarlas sin montaje.',
    ],
    mayImport: [],
    importedBy: ['todas las capas'],
  },
  types: {
    title: 'Tipos — contratos de TypeScript',
    role: 'Interfaces y ampliaciones de tipos compartidas en el servicio.',
    rules: [
      'Sólo tipos: nada que llegue al paquete compilado.',
      'Las ampliaciones globales (por ejemplo `Request.auth`) se declaran aquí una sola vez.',
    ],
    mayImport: [],
    importedBy: ['todas las capas'],
  },
  database: {
    title: 'Base de datos — migraciones y semillas',
    role: 'Guiones de evolución del esquema y carga de datos inicial.',
    rules: [
      'Las migraciones son idempotentes: repetirlas no duplica columnas, índices ni filas.',
      'No se silencian errores con `catch {}`: sólo se ignora el código de error esperado y el resto se propaga.',
      'Las semillas usan altas idempotentes; nunca borran datos existentes.',
      'Se ejecutan con un guion de `package.json`, nunca automáticamente al arrancar.',
    ],
    mayImport: ['config', 'models'],
    importedBy: ['guiones de npm'],
  },
};

/** Extrae la descripción de la etiqueta `@file` de la cabecera. */
const describe = (file) => {
  const text = fs.readFileSync(file, 'utf8').slice(0, 1200);
  const match = text.match(/@file\s+([\s\S]*?)(?:\n\s*\*\s*\n|\n\s*\*\s*@|\n\s*\*\/)/);
  if (!match) return '';
  return match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/** Documenta una carpeta de capa y, recursivamente, sus subcarpetas. */
const documentFolder = (absDir, layerKey, service, relLabel) => {
  const spec = LAYERS[layerKey];
  if (!spec) return 0;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts'))
    .map((e) => e.name)
    .sort();
  const tests = entries
    .filter((e) => e.isFile() && e.name.endsWith('.test.ts'))
    .map((e) => e.name)
    .sort();
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const rows = files.map((name) => {
    const desc = describe(path.join(absDir, name)) || '_Sin cabecera `@file`; añadir al editarlo._';
    return `| \`${name}\` | ${desc} |`;
  });

  const lines = [
    `# ${spec.title}`,
    '',
    `**Servicio:** \`${service}\` · **Carpeta:** \`${relLabel}\``,
    '',
    spec.role,
    '',
    '## Reglas de esta carpeta',
    '',
    ...spec.rules.map((r) => `- ${r}`),
    '',
    '## Relaciones permitidas',
    '',
    `- **Puede importar de:** ${spec.mayImport.length ? spec.mayImport.map((d) => `\`${d}\``).join(', ') : '_nada del servicio; es una hoja del grafo_'}`,
    `- **La importan:** ${spec.importedBy.map((d) => `\`${d}\``).join(', ')}`,
    '',
    '> La dirección de las dependencias es siempre `routes → controllers → services → repositories → models`.',
    '> Un import que salte hacia atrás en esa cadena es un error de arquitectura.',
    '',
    '## Archivos',
    '',
  ];

  if (rows.length) {
    lines.push('| Archivo | Responsabilidad |', '|---|---|', ...rows, '');
  } else {
    lines.push('_Sin archivos por ahora._', '');
  }

  if (subdirs.length) {
    lines.push(
      '## Subcarpetas',
      '',
      ...subdirs.map((d) => `- \`${d}/\` — ver su propio \`README.md\`.`),
      '',
    );
  }

  if (tests.length) {
    lines.push(
      '## Pruebas',
      '',
      ...tests.map((t) => `- \`${t}\``),
      '',
      'Se ejecutan con `npm test` desde la raíz del servicio.',
      '',
    );
  } else {
    lines.push(
      '## Pruebas',
      '',
      'Sin pruebas en esta carpeta. Al añadir lógica sin entrada/salida, extraerla a un',
      'módulo `*-rules.ts` y cubrirla con un `*.test.ts` junto al archivo.',
      '',
    );
  }

  lines.push(
    '---',
    '',
    '_Generado desde el código. Al añadir un archivo, documentarlo con una cabecera `@file`_',
    '_y regenerar con `node scripts/generar-documentacion.mjs`._',
  );

  fs.writeFileSync(path.join(absDir, 'README.md'), lines.join('\n') + '\n');
  let count = 1;
  for (const sub of subdirs) {
    count += documentFolder(path.join(absDir, sub), layerKey, service, `${relLabel}/${sub}`);
  }
  return count;
};

let total = 0;
for (const service of SERVICES) {
  const srcDir = path.join(ROOT, service, 'src');
  if (!fs.existsSync(srcDir)) continue;
  for (const layerKey of Object.keys(LAYERS)) {
    const dir = path.join(srcDir, layerKey);
    if (!fs.existsSync(dir)) continue;
    total += documentFolder(dir, layerKey, service, `src/${layerKey}`);
  }
}
console.log(`README.md generados: ${total}`);
