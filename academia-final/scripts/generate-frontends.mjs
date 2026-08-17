import { mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reference = join(root, '..', 'academia-2', 'Academia V2', 'AcademiaCloudPHP', 'v5', 'public', 'uploads');

const write = async (base, path, content) => {
  const target = join(base, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content.trimStart(), 'utf8');
};

const copyIfExists = async (source, target) => {
  try {
    await access(source);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  } catch {
    // An optional reference asset may not exist in every v5 snapshot.
  }
};

const packageJson = (name, port) => JSON.stringify({
  name,
  private: true,
  version: '1.0.0',
  type: 'module',
  scripts: {
    dev: `vite --host 0.0.0.0 --port ${port}`,
    build: 'vite build',
    preview: `vite preview --host 0.0.0.0 --port ${port}`,
  },
  dependencies: {
    'lucide-react': '^0.468.0',
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    'react-router-dom': '7.18.2',
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.3.4',
    vite: '^6.0.5',
  },
}, null, 2);

const viteConfig = (port) => `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: ${port}, host: '0.0.0.0' },
});
`;

const indexHtml = (title) => `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#921a1d" />
    <meta name="description" content="${title}" />
    <title>${title}</title>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const mainJsx = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
`;

const apiConfig = `
export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:6080').replace(/\\/$/, '');

export const API_PATHS = Object.freeze({
  academia: '/api/academia',
  ai: '/api/ai',
  content: '/api/content',
  analytics: '/api/analytics',
  users: '/api/users',
  notifications: '/api/notifications',
});
`;

const constants = `
export const APP_NAME = 'Academia CABSA';
export const TOKEN_KEY = 'cabsa_access_token';
export const USER_KEY = 'cabsa_current_user';
export const PAGE_SIZE = 24;
export const STATUS_LABELS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  published: 'Publicado',
  draft: 'Borrador',
  completed: 'Completado',
  in_progress: 'En progreso',
  pending: 'Pendiente',
};
`;

const apiClient = `
import { API_URL } from '@/config/api';
import { TOKEN_KEY } from '@/config/constants';

const parseBody = async (response) => {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  return response.json();
};

export const apiClient = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', \`Bearer \${token}\`);

  let response;
  try {
    response = await fetch(\`\${API_URL}\${path}\`, { ...options, headers });
  } catch {
    throw new Error(`No fue posible conectar con el Gateway configurado en ${API_URL}.`);
  }
  const payload = await parseBody(response);
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || \`Solicitud rechazada (\${response.status})\`;
    if (response.status === 401) window.dispatchEvent(new Event('cabsa:unauthorized'));
    throw new Error(message);
  }
  return payload?.data ?? payload ?? null;
};

export const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
`;

const authService = `
import { apiClient } from '@/services/apiClient';

export const authService = {
  login: (identity, password) => apiClient('/api/users/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identity, password }),
  }),
  register: (values) => apiClient('/api/users/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  }),
  me: () => apiClient('/api/users/auth/me'),
};
`;

const serviceFactory = `
import { apiClient, unwrapList } from '@/services/apiClient';

export const createResourceService = (prefix) => ({
  list: async (resource, query = '') => unwrapList(await apiClient(\`\${prefix}/\${resource}\${query}\`)),
  get: (resource, id) => apiClient(\`\${prefix}/\${resource}/\${id}\`),
  create: (resource, values) => apiClient(\`\${prefix}/\${resource}\`, {
    method: 'POST', body: JSON.stringify(values),
  }),
  update: (resource, id, values) => apiClient(\`\${prefix}/\${resource}/\${id}\`, {
    method: 'PATCH', body: JSON.stringify(values),
  }),
  remove: (resource, id) => apiClient(\`\${prefix}/\${resource}/\${id}\`, { method: 'DELETE' }),
});
`;

const serviceFiles = {
  'academiaService.js': `import { createResourceService } from '@/services/resourceService';\nexport const academiaService = createResourceService('/api/academia');\n`,
  'contentService.js': `import { createResourceService } from '@/services/resourceService';\nexport const contentService = createResourceService('/api/content');\n`,
  'aiService.js': `import { createResourceService } from '@/services/resourceService';\nexport const aiService = createResourceService('/api/ai');\n`,
  'analyticsService.js': `import { createResourceService } from '@/services/resourceService';\nexport const analyticsService = createResourceService('/api/analytics');\n`,
  'usersService.js': `import { createResourceService } from '@/services/resourceService';\nexport const usersService = createResourceService('/api/users');\n`,
  'notificationsService.js': `import { createResourceService } from '@/services/resourceService';\nexport const notificationsService = createResourceService('/api/notifications');\n`,
};

const authContext = `
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { TOKEN_KEY, USER_KEY } from '@/config/constants';

const AuthContext = createContext(null);
const storedUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [loading, setLoading] = useState(false);

  const persist = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (identity, password) => {
    setLoading(true);
    try {
      const session = await authService.login(identity, password);
      persist(session);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  const register = useCallback(async (values) => {
    setLoading(true);
    try {
      const session = await authService.register(values);
      persist(session);
      return session;
    } finally { setLoading(false); }
  }, [persist]);

  useEffect(() => {
    const unauthorized = () => logout();
    window.addEventListener('cabsa:unauthorized', unauthorized);
    return () => window.removeEventListener('cabsa:unauthorized', unauthorized);
  }, [logout]);

  const value = useMemo(() => ({
    user, loading, isAuthenticated: Boolean(user && localStorage.getItem(TOKEN_KEY)),
    login, register, logout,
  }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
`;

const appContext = `
import { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);
export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const value = useMemo(() => ({ sidebarOpen, setSidebarOpen, notice, setNotice }), [sidebarOpen, notice]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export const useApp = () => useContext(AppContext);
`;

const hooks = {
  'useAuth.js': `export { useAuth } from '@/context/AuthContext';\n`,
  'useDebounce.js': `
import { useEffect, useState } from 'react';
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
`,
  'useRemoteList.js': `
import { useCallback, useEffect, useRef, useState } from 'react';
export function useRemoteList(loader, fallback = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingReference, setUsingReference] = useState(false);
  const fallbackRef = useRef(fallback);
  useEffect(() => { fallbackRef.current = fallback; }, [fallback]);
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const rows = await loader();
      const referenceItems = fallbackRef.current;
      setItems(rows.length ? rows : referenceItems);
      setUsingReference(!rows.length && referenceItems.length > 0);
    } catch (requestError) {
      const referenceItems = fallbackRef.current;
      setError(requestError.message);
      setItems(referenceItems);
      setUsingReference(referenceItems.length > 0);
    } finally { setLoading(false); }
  }, [loader]);
  useEffect(() => { reload(); }, [reload]);
  return { items, loading, error, usingReference, reload, setItems };
}
`,
};

const commonComponents = `
import { X, LoaderCircle, Inbox } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={\`button button--\${variant} \${className}\`} {...props}>{children}</button>;
}
export function Input({ label, error, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} />{error && <small>{error}</small>}</label>;
}
export function Select({ label, children, ...props }) {
  return <label className="field"><span>{label}</span><select {...props}>{children}</select></label>;
}
export function Textarea({ label, ...props }) {
  return <label className="field"><span>{label}</span><textarea {...props} /></label>;
}
export function Card({ children, className = '' }) { return <section className={\`card \${className}\`}>{children}</section>; }
export function Badge({ children, tone = 'neutral' }) { return <span className={\`badge badge--\${tone}\`}>{children}</span>; }
export function Loader({ label = 'Cargando información' }) {
  return <div className="state"><LoaderCircle className="spin" /><p>{label}</p></div>;
}
export function EmptyState({ title = 'Aún no hay registros', description = 'Los nuevos registros aparecerán aquí.', action }) {
  return <div className="state"><Inbox /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button></header>
      {children}
    </section>
  </div>;
}
export function Table({ columns, rows, rowKey = 'id' }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody>
  </table></div>;
}
export function ConfirmDialog({ open, title = 'Confirmar acción', message, onConfirm, onClose }) {
  return <Modal open={open} title={title} onClose={onClose}><p>{message}</p><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={onConfirm}>Confirmar</Button></div></Modal>;
}
`;

const componentExports = {
  Button: 'Button', Input: 'Input', Select: 'Select', Textarea: 'Textarea', Modal: 'Modal',
  Table: 'Table', Card: 'Card', Badge: 'Badge', Loader: 'Loader', EmptyState: 'EmptyState',
  ConfirmDialog: 'ConfirmDialog',
};

const protectedRoute = `
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
`;

const roleRoute = `
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
export default function RoleRoute({ roles = [], children }) {
  const { user } = useAuth();
  const role = user?.role?.name || user?.role || user?.role_name;
  if (!role || roles.length === 0 || roles.includes(role)) return children;
  return <Navigate to="/" replace />;
}
`;

const authLayout = `
import { Outlet } from 'react-router-dom';
import logo from '@/assets/logo/logo-horizontal.svg';
export default function AuthLayout() {
  return <main className="auth-layout"><section className="auth-brand">
    <img src={logo} alt="Academia CABSA" />
    <p className="eyebrow">Tecnologías inteligentes</p>
    <h1>Aprendizaje que conecta personas, conocimiento e inteligencia artificial.</h1>
    <p>Una experiencia unificada para estudiantes, docentes, familias y administradores.</p>
  </section><section className="auth-panel"><Outlet /></section></main>;
}
`;

const sharedUtils = {
  'formatDate.js': `export const formatDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value)) : '—';\n`,
  'formatStatus.js': `import { STATUS_LABELS } from '@/config/constants'; export const formatStatus = (value) => STATUS_LABELS[value] || value || 'Sin estado';\n`,
  'formatPriority.js': `export const formatPriority = (value) => ({ high: 'Alta', medium: 'Media', low: 'Baja' }[value] || value || 'Normal');\n`,
  'validators.js': `export const isEmail = (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); export const required = (value) => String(value ?? '').trim().length > 0;\n`,
  'permissions.js': `export const can = (user, permission) => !user?.permissions || user.permissions.includes(permission);\n`,
  'fileHelpers.js': `export const fileSize = (bytes = 0) => bytes < 1024 * 1024 ? \`\${Math.round(bytes / 1024)} KB\` : \`\${(bytes / 1024 / 1024).toFixed(1)} MB\`;\n`,
};

const sharedStore = {
  'authStore.js': `import { TOKEN_KEY, USER_KEY } from '@/config/constants'; export const authStore = { token: () => localStorage.getItem(TOKEN_KEY), user: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null') };\n`,
  'uiStore.js': `export const uiStore = { theme: 'cabsa', density: 'comfortable' };\n`,
  'coursesStore.js': `export const coursesStore = { filters: { search: '', status: 'all' } };\n`,
  'contentStore.js': `export const contentStore = { filters: { search: '', category: 'all' } };\n`,
};

async function createShared(base, name, port, title) {
  await write(base, 'package.json', packageJson(name, port));
  await write(base, '.gitignore', 'node_modules/\ndist/\n.env\n*.log\n');
  await write(base, 'vite.config.js', viteConfig(port));
  await write(base, 'index.html', indexHtml(title));
  await write(base, '.env.example', 'VITE_API_URL=http://127.0.0.1:6080\n');
  await write(base, 'src/main.jsx', mainJsx);
  await write(base, 'src/config/api.js', apiConfig);
  await write(base, 'src/config/constants.js', constants);
  await write(base, 'src/services/apiClient.js', apiClient);
  await write(base, 'src/services/authService.js', authService);
  await write(base, 'src/services/resourceService.js', serviceFactory);
  for (const [file, content] of Object.entries(serviceFiles)) await write(base, `src/services/${file}`, content);
  await write(base, 'src/context/AuthContext.jsx', authContext);
  await write(base, 'src/context/AppContext.jsx', appContext);
  for (const [file, content] of Object.entries(hooks)) await write(base, `src/hooks/${file}`, content);
  await write(base, 'src/components/common/index.jsx', commonComponents);
  for (const [file, symbol] of Object.entries(componentExports)) {
    await write(base, `src/components/common/${file}.jsx`, `export { ${symbol} as default, ${symbol} } from '@/components/common/index';\n`);
  }
  await write(base, 'src/routes/ProtectedRoute.jsx', protectedRoute);
  await write(base, 'src/routes/RoleRoute.jsx', roleRoute);
  await write(base, 'src/layouts/AuthLayout.jsx', authLayout);
  for (const [file, content] of Object.entries(sharedUtils)) await write(base, `src/utils/${file}`, content);
  for (const [file, content] of Object.entries(sharedStore)) await write(base, `src/store/${file}`, content);
  await mkdir(join(base, 'src', 'assets', 'icons'), { recursive: true });
  await mkdir(join(base, 'src', 'assets', 'images'), { recursive: true });
}

const referenceCatalog = `
export const courses = [
  { id: 'bootcamp-docente', title: 'Bootcamp Docente', lessons: 8, progress: 62, summary: 'Integra Academia CABSA, herramientas digitales e IA en el trabajo educativo.', image: '/assets/images/bootcamp.png', category: 'Formación docente' },
  { id: 'curso-basico-de-ia', title: 'Curso Básico de IA', lessons: 6, progress: 35, summary: 'Conceptos, aplicaciones cotidianas y uso responsable de la Inteligencia Artificial.', image: '/assets/images/ia-basica.jpg', category: 'Inteligencia artificial' },
  { id: 'ia-finanzas', title: 'IA para Gerentes Financieros', lessons: 7, progress: 0, summary: 'Transforma la gestión financiera y la toma de decisiones con IA.', image: '/assets/images/ia-finanzas.png', category: 'Finanzas' },
  { id: 'docentes-ia', title: 'Docentes en la Era de la IA', lessons: 8, progress: 18, summary: 'Estrategias y herramientas de IA aplicadas a la práctica docente.', image: '/assets/images/docentes-ia.png', category: 'Formación docente' },
  { id: 'pensamiento-critico', title: 'Pensamiento Crítico en un Mundo de Desafíos', lessons: 6, progress: 0, summary: 'Decisiones conscientes, éticas y alineadas con valores personales.', image: '/assets/images/pensamiento.jpg', category: 'Desarrollo personal' },
  { id: 'dinero-ahorro', title: 'Dinero y Ahorro para Niños y Jóvenes', lessons: 5, progress: 0, summary: 'Dinero, ahorro e inversión mediante actividades interactivas.', image: '/assets/images/dinero.png', category: 'Finanzas' },
];

export const capsules = [
  { id: 'igualdad-equidad', title: 'Igualdad y equidad', category: 'Nueva Escuela Mexicana', summary: 'No todos necesitamos lo mismo para llegar.', image: '/assets/images/igualdad.png' },
  { id: 'normas', title: 'La importancia de las normas', category: 'Convivencia', summary: 'Convivir, organizarnos y construir espacios seguros.', image: '/assets/images/normas.png' },
  { id: 'redes', title: 'Seguridad en redes sociales', category: 'Tecnología', summary: 'Protege tu información y comunícate de forma segura.', image: '/assets/images/redes.png' },
  { id: 'emociones', title: 'Cuando las emociones toman el volante', category: 'Salud y bienestar', summary: 'Reconoce lo que sientes y responde con mayor calma.', image: '/assets/images/emociones.png' },
  { id: 'bullying', title: 'Alto al bullying', category: 'Convivencia', summary: 'Ser valiente también es cuidar y pedir ayuda.', image: '/assets/images/bullying.png' },
  { id: 'diversidad', title: 'Diversidad: diferentes y valiosos', category: 'Nueva Escuela Mexicana', summary: 'Construye comunidades donde todas las personas participan.', image: '/assets/images/diversidad.png' },
];

export const assistants = [
  { id: 'preescolar', title: 'Asistente virtual de Preescolar', audience: 'Docentes y familias', description: 'Planeación, evaluación formativa y estrategias afectivas para preescolar.' },
  { id: 'primaria', title: 'Asistente virtual de Primaria', audience: 'Docentes', description: 'Actividades, secuencias didácticas y evaluación para primaria.' },
  { id: 'secundaria', title: 'Asistente virtual de Secundaria', audience: 'Docentes', description: 'Planeación y recursos para consolidar aprendizajes de secundaria.' },
  { id: 'tutor-preescolar', title: 'Tutor de Preescolar', audience: 'Estudiantes y familias', description: 'Acompañamiento inteligente con lenguaje claro y cercano.' },
  { id: 'tutor-primaria', title: 'Tutor de Primaria', audience: 'Estudiantes', description: 'Explicaciones y ejercicios adaptados al nivel primaria.' },
  { id: 'tutor-secundaria', title: 'Tutor de Secundaria', audience: 'Estudiantes', description: 'Recursos para reforzar aprendizajes y preparar la transición.' },
];
`;

const studentNavigation = `
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Library, Sparkles, TrendingUp, Award, LifeBuoy, UserRound, X } from 'lucide-react';
import logo from '@/assets/logo/logo-horizontal.svg';
import { useApp } from '@/context/AppContext';

const items = [
  ['/', 'Inicio', Home], ['/cursos', 'Mis cursos', BookOpen], ['/mediateca', 'Mediateca', Library],
  ['/asistentes', 'Asistentes IA', Sparkles], ['/progreso', 'Mi progreso', TrendingUp],
  ['/certificados', 'Certificados', Award], ['/soporte', 'Soporte', LifeBuoy], ['/perfil', 'Mi perfil', UserRound],
];
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  return <aside className={\`sidebar \${sidebarOpen ? 'is-open' : ''}\`}>
    <div className="sidebar-brand"><img src={logo} alt="Academia CABSA" /><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)}><X /></button></div>
    <p className="sidebar-label">Mi aprendizaje</p>
    <nav>{items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setSidebarOpen(false)}><Icon /><span>{label}</span></NavLink>)}</nav>
    <div className="sidebar-foot"><strong>¿Necesitas ayuda?</strong><p>El equipo CABSA está para acompañarte.</p><NavLink to="/soporte">Abrir soporte</NavLink></div>
  </aside>;
}
`;

const navbar = `
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
export default function Navbar() {
  const { setSidebarOpen } = useApp();
  const { user, logout } = useAuth();
  const name = user?.display_name || user?.username || 'Usuario CABSA';
  return <header className="navbar">
    <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu /></button>
    <label className="search"><Search /><input aria-label="Buscar" placeholder="Buscar cursos, cápsulas o recursos" /></label>
    <div className="navbar-actions"><button className="icon-button" aria-label="Notificaciones"><Bell /></button><div className="user-chip"><span>{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>Comunidad CABSA</small></div></div><button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut /></button></div>
  </header>;
}
`;

const breadcrumbs = `
import { useLocation } from 'react-router-dom';
const labels = { cursos: 'Cursos', mediateca: 'Mediateca', asistentes: 'Asistentes IA', progreso: 'Progreso', certificados: 'Certificados', soporte: 'Soporte', perfil: 'Perfil' };
export default function Breadcrumbs() {
  const segment = useLocation().pathname.split('/').filter(Boolean)[0];
  return <div className="breadcrumbs"><span>Academia</span><b>/</b><strong>{labels[segment] || 'Inicio'}</strong></div>;
}
`;

const mainLayout = `
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import Navbar from '@/components/navigation/Navbar';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
export default function MainLayout() {
  return <div className="app-shell"><Sidebar /><div className="app-area"><Navbar /><main id="main-content"><Breadcrumbs /><Outlet /></main></div></div>;
}
`;

const loginPage = (admin = false) => `
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
export default function Login() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate(); const location = useLocation();
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try { await login(identity, password); navigate(location.state?.from || '/', { replace: true }); }
    catch (requestError) { setError(requestError.message); }
  };
  return <div className="auth-card">
    <span className="auth-icon"><ShieldCheck /></span>
    <p className="eyebrow">${admin ? 'Administración segura' : 'Bienvenido de nuevo'}</p>
    <h2>${admin ? 'Centro de control CABSA' : 'Continúa tu aprendizaje'}</h2>
    <p>${admin ? 'Accede a la operación de los seis servicios SOA.' : 'Ingresa con tu correo o nombre de usuario.'}</p>
    <form onSubmit={submit}><Input label="Usuario o correo" value={identity} onChange={(e) => setIdentity(e.target.value)} required autoFocus />
      <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <div className="alert alert--error">{error}</div>}<Button disabled={loading} type="submit">{loading ? 'Ingresando…' : 'Ingresar'} <ArrowRight /></Button>
    </form>
    ${admin ? `<small className="auth-note">Las acciones realizadas quedan vinculadas al usuario autenticado.</small>` : `<div className="auth-links"><Link to="/recuperar">¿Olvidaste tu contraseña?</Link><Link to="/registro">Crear cuenta</Link></div>`}
  </div>;
}
`;

const registerPage = `
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '' });
  const [error, setError] = useState(''); const { register, loading } = useAuth(); const navigate = useNavigate();
  const change = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => { event.preventDefault(); setError(''); try { await register(form); navigate('/'); } catch (e) { setError(e.message); } };
  return <div className="auth-card"><p className="eyebrow">Nueva cuenta</p><h2>Únete a Academia CABSA</h2><p>Completa tus datos para comenzar.</p>
    <form onSubmit={submit}><div className="form-grid"><Input label="Nombre" value={form.firstName} onChange={change('firstName')} /><Input label="Apellidos" value={form.lastName} onChange={change('lastName')} /></div>
      <Input label="Usuario" value={form.username} onChange={change('username')} required /><Input label="Correo" type="email" value={form.email} onChange={change('email')} required />
      <Input label="Contraseña (mínimo 8 caracteres)" type="password" minLength="8" value={form.password} onChange={change('password')} required />
      {error && <div className="alert alert--error">{error}</div>}<Button disabled={loading}>Crear cuenta</Button></form><Link to="/login">Ya tengo una cuenta</Link></div>;
}
`;

const recoverPage = `
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/common';
export default function RecoverPassword() {
  return <div className="auth-card"><p className="eyebrow">Recuperar acceso</p><h2>Restablece tu contraseña</h2><p>Te enviaremos instrucciones mediante el servicio de notificaciones.</p><form onSubmit={(e) => e.preventDefault()}><Input label="Correo electrónico" type="email" required /><Button>Enviar instrucciones</Button></form><Link to="/login">Volver al ingreso</Link></div>;
}
`;

const dashboardPage = `
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { Card, Badge } from '@/components/common';
import { courses, capsules } from '@/data/referenceCatalog';
import { useAuth } from '@/hooks/useAuth';
export default function DashboardHome() {
  const { user } = useAuth(); const firstName = user?.first_name || user?.username || 'estudiante';
  return <div className="page">
    <section className="welcome"><div><p className="eyebrow">Tu espacio de aprendizaje</p><h1>Hola, {firstName}. ¿Qué aprenderemos hoy?</h1><p>Continúa donde te quedaste, explora una cápsula o pregunta a un asistente.</p><div className="button-row"><Link className="button button--light" to="/cursos">Continuar curso <ArrowRight /></Link><Link className="button button--ghost-light" to="/asistentes">Consultar asistente</Link></div></div><div className="welcome-mark"><Sparkles /><strong>IA + Educación</strong><span>Aprendizaje acompañado</span></div></section>
    <section className="metric-grid"><Card><span className="metric-icon red"><BookOpen /></span><div><small>Cursos activos</small><strong>3</strong><p>2 disponibles para continuar</p></div></Card><Card><span className="metric-icon gold"><CheckCircle2 /></span><div><small>Lecciones completadas</small><strong>12</strong><p>Esta semana: +4</p></div></Card><Card><span className="metric-icon green"><Flame /></span><div><small>Racha de aprendizaje</small><strong>6 días</strong><p>Tu mejor racha: 11 días</p></div></Card></section>
    <div className="section-heading"><div><p className="eyebrow">En progreso</p><h2>Retoma tu formación</h2></div><Link to="/cursos">Ver todos <ArrowRight /></Link></div>
    <section className="course-grid">{courses.slice(0, 3).map((course) => <article className="course-card" key={course.id}><img src={course.image} alt="" /><div><Badge tone="gold">{course.category}</Badge><h3>{course.title}</h3><p>{course.summary}</p><div className="progress-row"><span><b>{course.progress}%</b> completado</span><span>{course.lessons} lecciones</span></div><div className="progress"><i style={{ width: \`\${course.progress}%\` }} /></div><Link to={\`/cursos/\${course.id}\`}>Continuar <ArrowRight /></Link></div></article>)}</section>
    <div className="section-heading"><div><p className="eyebrow">Aprende en minutos</p><h2>Cápsulas recomendadas</h2></div><Link to="/mediateca">Explorar mediateca <ArrowRight /></Link></div>
    <section className="capsule-strip">{capsules.slice(0, 4).map((item) => <article key={item.id}><img src={item.image} alt="" /><div><small>{item.category}</small><h3>{item.title}</h3><p>{item.summary}</p></div></article>)}</section>
  </div>;
}
`;

const courseCard = `
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/common';
export default function CourseCard({ course }) {
  const id = course.id || course.slug;
  return <article className="course-card"><img src={course.image || course.thumbnail_url || '/assets/images/bootcamp.png'} alt="" /><div><Badge tone="gold">{course.category || 'Curso CABSA'}</Badge><h3>{course.title || course.name}</h3><p>{course.summary || course.description || 'Contenido formativo de Academia CABSA.'}</p><div className="progress-row"><span><BookOpen /> {course.lessons || course.lesson_count || 0} lecciones</span><span>{course.progress || 0}%</span></div><div className="progress"><i style={{ width: \`\${course.progress || 0}%\` }} /></div><Link to={\`/cursos/\${id}\`}>Ver curso <ArrowRight /></Link></div></article>;
}
`;

const courseList = `
import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import CourseCard from '@/components/courses/CourseCard';
import { Loader } from '@/components/common';
import { academiaService } from '@/services/academiaService';
import { courses as referenceCourses } from '@/data/referenceCatalog';
import { useRemoteList } from '@/hooks/useRemoteList';
export default function CourseList() {
  const load = useCallback(() => academiaService.list('courses'), []);
  const { items, loading, error, usingReference } = useRemoteList(load, referenceCourses);
  const [search, setSearch] = useState('');
  const shown = items.filter((item) => (item.title || item.name || '').toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Oferta formativa</p><h1>Mis cursos</h1><p>Formación práctica para estudiantes, docentes y familias.</p></div><label className="search search--page"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar un curso" /></label></div>
    {error && <div className="alert">El Gateway no respondió: {error}. Mostramos el catálogo conservado de v5.</div>}{usingReference && !error && <div className="source-note">Catálogo de referencia v5. Los registros de MySQL aparecerán aquí al ser cargados.</div>}
    {loading ? <Loader /> : <section className="course-grid">{shown.map((course) => <CourseCard key={course.id || course.slug} course={course} />)}</section>}</div>;
}
`;

const courseDetail = `
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock3, Play } from 'lucide-react';
import { courses } from '@/data/referenceCatalog';
import { Badge, Button, Card } from '@/components/common';
export default function CourseDetail() {
  const { id } = useParams(); const course = courses.find((item) => item.id === id) || courses[0];
  const lessons = Array.from({ length: course.lessons }, (_, index) => ({ id: index + 1, title: index === 0 ? 'Bienvenida y objetivos de aprendizaje' : \`Lección \${index + 1} · Contenido formativo\`, done: index < Math.round(course.lessons * course.progress / 100) }));
  return <div className="page"><Link className="back-link" to="/cursos"><ArrowLeft /> Volver a cursos</Link><section className="course-hero"><img src={course.image} alt="" /><div><Badge tone="gold">{course.category}</Badge><h1>{course.title}</h1><p>{course.summary}</p><div className="meta-line"><span><Clock3 /> {course.lessons * 35} minutos</span><span>{course.lessons} lecciones</span></div><Button>Continuar aprendiendo <Play /></Button></div></section>
    <div className="detail-grid"><Card><h2>Contenido del curso</h2><div className="lesson-list">{lessons.map((lesson) => <Link key={lesson.id} to={\`/lecciones/\${lesson.id}\`} className={lesson.done ? 'done' : ''}>{lesson.done ? <CheckCircle2 /> : <Circle />}<span><small>Lección {lesson.id}</small><strong>{lesson.title}</strong></span><Play /></Link>)}</div></Card><aside><Card><h3>Tu avance</h3><strong className="large-number">{course.progress}%</strong><div className="progress"><i style={{ width: \`\${course.progress}%\` }} /></div><p>Completa las lecciones y actividades para obtener tu certificado.</p></Card></aside></div></div>;
}
`;

const lessonView = `
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { Button, Card } from '@/components/common';
export default function LessonView() {
  const { id } = useParams();
  return <div className="page"><Link className="back-link" to="/cursos/bootcamp-docente"><ArrowLeft /> Volver al curso</Link><div className="detail-grid"><article><p className="eyebrow">Lección {id}</p><h1>Contenido formativo y actividad práctica</h1><div className="video-placeholder"><PlayCircle /><strong>Recurso audiovisual de la lección</strong><span>Los videos del servicio de contenido se mostrarán aquí.</span></div><Card><h2>En esta lección</h2><p>Revisa el contenido, aplica la actividad sugerida y registra tu avance. La experiencia conecta lecciones, materiales y seguimiento académico.</p></Card><div className="button-row"><Button><CheckCircle2 /> Marcar como completada</Button><Button variant="secondary">Siguiente lección <ArrowRight /></Button></div></article><aside><Card><h3>Recursos</h3><ul className="clean-list"><li>Guía de aprendizaje</li><li>Actividad descargable</li><li>Material complementario</li></ul></Card></aside></div></div>;
}
`;

const contentLibrary = `
import { useCallback, useState } from 'react';
import { FileText, Film, Grid3X3, Search } from 'lucide-react';
import { contentService } from '@/services/contentService';
import { capsules as referenceCapsules } from '@/data/referenceCatalog';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Loader } from '@/components/common';
export default function ContentLibrary({ type = 'capsules', title = 'Mediateca', description = 'Explora materiales educativos, cápsulas, videos y documentos.' }) {
  const fallback = type === 'capsules' ? referenceCapsules : [];
  const load = useCallback(() => contentService.list(type), [type]);
  const { items, loading, error, usingReference } = useRemoteList(load, fallback);
  const [search, setSearch] = useState('');
  const filtered = items.filter((item) => (item.title || item.name || '').toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Contenido CABSA</p><h1>{title}</h1><p>{description}</p></div><label className="search search--page"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contenido" /></label></div>
    <div className="filter-tabs"><span><Grid3X3 /> Todo</span><span><Film /> Videos</span><span><FileText /> Documentos</span></div>
    {error && <div className="alert">{error} Mostramos contenido de referencia v5.</div>}{usingReference && !error && <div className="source-note">Contenido de referencia v5.</div>}
    {loading ? <Loader /> : <section className="library-grid">{filtered.length ? filtered.map((item) => <article key={item.id || item.slug}><div className="library-image">{item.image ? <img src={item.image} alt="" /> : type === 'videos' ? <Film /> : <FileText />}</div><div><Badge tone="gold">{item.category || type}</Badge><h3>{item.title || item.name}</h3><p>{item.summary || item.description || 'Recurso educativo disponible en Academia CABSA.'}</p><button className="text-button">Abrir recurso</button></div></article>) : <div className="empty-inline">Aún no hay {title.toLowerCase()} en MySQL.</div>}</section>}</div>;
}
`;

const assistantsPage = `
import { useCallback, useState } from 'react';
import { Bot, MessageSquareText, Send, Sparkles } from 'lucide-react';
import { assistants as referenceAssistants } from '@/data/referenceCatalog';
import { aiService } from '@/services/aiService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, Loader } from '@/components/common';
export default function AssistantsPage() {
  const load = useCallback(() => aiService.list('assistants'), []);
  const { items, loading, error } = useRemoteList(load, referenceAssistants);
  const [selected, setSelected] = useState(null); const [message, setMessage] = useState('');
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Inteligencia artificial educativa</p><h1>Asistentes y tutores virtuales</h1><p>Elige el acompañamiento adecuado para tu nivel y objetivo.</p></div><LinkLike /></div>{error && <div className="alert">{error} Mostramos los asistentes definidos en v5.</div>}
    {loading ? <Loader /> : <section className="assistant-grid">{items.map((item) => <button key={item.id || item.slug} className={\`assistant-card \${selected === item ? 'selected' : ''}\`} onClick={() => setSelected(item)}><span><Bot /></span><Badge tone="gold">{item.audience || 'Asistente CABSA'}</Badge><h3>{item.title || item.name}</h3><p>{item.description}</p><strong>Iniciar conversación</strong></button>)}</section>}
    {selected && <section className="chat-dock"><header><span><Sparkles /></span><div><strong>{selected.title || selected.name}</strong><small>Listo para acompañarte</small></div></header><div className="chat-welcome"><MessageSquareText /><p>Cuéntame qué tema estás trabajando o qué necesitas preparar.</p></div><form onSubmit={(e) => { e.preventDefault(); setMessage(''); }}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe tu pregunta…" /><Button aria-label="Enviar"><Send /></Button></form></section>}
  </div>;
}
function LinkLike(){ return <span className="service-chip"><Sparkles /> Servicio IA conectado</span>; }
`;

const progressPage = `
import { Award, BookOpen, CalendarDays, Flame } from 'lucide-react';
import { Card } from '@/components/common';
import { courses } from '@/data/referenceCatalog';
export default function ProgressPage() {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Seguimiento personal</p><h1>Mi progreso</h1><p>Consulta tu avance, actividad y logros académicos.</p></div></div><section className="metric-grid"><Card><span className="metric-icon red"><BookOpen /></span><div><small>Avance general</small><strong>38%</strong><p>12 de 32 lecciones</p></div></Card><Card><span className="metric-icon gold"><Flame /></span><div><small>Racha actual</small><strong>6 días</strong><p>Continúa mañana</p></div></Card><Card><span className="metric-icon green"><Award /></span><div><small>Certificados</small><strong>1</strong><p>2 próximos</p></div></Card></section><div className="detail-grid"><Card><h2>Avance por curso</h2><div className="progress-list">{courses.slice(0,4).map((course) => <div key={course.id}><span><strong>{course.title}</strong><small>{course.progress}% completado</small></span><div className="progress"><i style={{width: \`\${course.progress}%\`}} /></div></div>)}</div></Card><Card><h2><CalendarDays /> Actividad reciente</h2><ul className="timeline-list"><li><b>Hoy</b><span>Lección completada · Bootcamp Docente</span></li><li><b>Ayer</b><span>Cápsula consultada · Seguridad en redes</span></li><li><b>24 jul</b><span>Conversación con Asistente de Primaria</span></li></ul></Card></div></div>;
}
`;

const certificatesPage = `
import { Award, Download, LockKeyhole } from 'lucide-react';
import { Button, Card } from '@/components/common';
export default function CertificatesPage() {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Reconoce tu esfuerzo</p><h1>Certificados</h1><p>Descarga las constancias obtenidas al completar tus cursos.</p></div></div><section className="certificate-grid"><Card className="certificate ready"><Award /><div><small>Completado</small><h2>Introducción a Academia CABSA</h2><p>Emitido el 18 de julio de 2026</p><Button variant="secondary"><Download /> Descargar PDF</Button></div></Card><Card className="certificate"><LockKeyhole /><div><small>62% completado</small><h2>Bootcamp Docente</h2><p>Completa el curso para desbloquear tu certificado.</p><div className="progress"><i style={{width:'62%'}} /></div></div></Card></section></div>;
}
`;

const supportPage = `
import { useState } from 'react';
import { LifeBuoy, MessageCircle, Paperclip } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '@/components/common';
export default function SupportPage() {
  const [sent, setSent] = useState(false);
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Estamos para ayudarte</p><h1>Centro de soporte</h1><p>Registra una solicitud y da seguimiento desde la plataforma.</p></div></div><div className="detail-grid"><Card><h2>Nueva solicitud</h2>{sent ? <div className="success-box"><MessageCircle /><h3>Solicitud registrada</h3><p>El equipo CABSA dará seguimiento a tu caso.</p><Button onClick={() => setSent(false)}>Crear otra</Button></div> : <form onSubmit={(e) => {e.preventDefault(); setSent(true);}}><Input label="Asunto" required /><Select label="Tipo de ayuda"><option>Acceso a la plataforma</option><option>Curso o lección</option><option>Certificado</option><option>Asistente IA</option><option>Otro</option></Select><Textarea label="Cuéntanos qué ocurrió" rows="6" required /><label className="upload-box"><Paperclip /><span>Adjuntar evidencia</span><small>PNG, JPG, PDF, DOCX o XLSX</small><input type="file" hidden /></label><Button>Enviar solicitud</Button></form>}</Card><aside><Card><span className="metric-icon red"><LifeBuoy /></span><h3>Atención CABSA</h3><p>Incluye el mayor detalle posible. Las evidencias ayudan a resolver el caso con rapidez.</p><hr /><small>Horario de atención</small><strong>Lunes a viernes · 9:00 a 18:00</strong></Card></aside></div></div>;
}
`;

const profilePage = `
import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Input } from '@/components/common';
export default function ProfilePage() {
  const { user } = useAuth();
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Cuenta personal</p><h1>Mi perfil</h1><p>Mantén actualizados tus datos de contacto.</p></div></div><Card className="profile-card"><div className="profile-avatar">{(user?.display_name || user?.username || 'U')[0].toUpperCase()}</div><form><div className="form-grid"><Input label="Nombre" defaultValue={user?.first_name || ''} /><Input label="Apellidos" defaultValue={user?.last_name || ''} /></div><Input label="Nombre de usuario" defaultValue={user?.username || ''} /><Input label="Correo electrónico" type="email" defaultValue={user?.email || ''} /><Button type="button">Guardar cambios</Button></form></Card></div>;
}
`;

const studentRoutes = `
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import RecoverPassword from '@/pages/auth/RecoverPassword';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import CourseList from '@/pages/courses/CourseList';
import CourseDetail from '@/pages/courses/CourseDetail';
import LessonView from '@/pages/courses/LessonView';
import ContentLibrary from '@/pages/content/ContentLibrary';
import AssistantsPage from '@/pages/ai/AssistantsPage';
import ProgressPage from '@/pages/progress/ProgressPage';
import CertificatesPage from '@/pages/progress/CertificatesPage';
import SupportPage from '@/pages/support/SupportPage';
import ProfilePage from '@/pages/profile/ProfilePage';

const secured = (element) => <ProtectedRoute>{element}</ProtectedRoute>;
export default function AppRoutes() {
  return <Routes>
    <Route element={<AuthLayout />}><Route path="/login" element={<Login />} /><Route path="/registro" element={<Register />} /><Route path="/recuperar" element={<RecoverPassword />} /></Route>
    <Route element={secured(<MainLayout />)}><Route index element={<DashboardHome />} /><Route path="cursos" element={<CourseList />} /><Route path="cursos/:id" element={<CourseDetail />} /><Route path="lecciones/:id" element={<LessonView />} />
      <Route path="mediateca" element={<ContentLibrary />} /><Route path="capsulas" element={<ContentLibrary type="capsules" title="Cápsulas educativas" />} /><Route path="videos" element={<ContentLibrary type="videos" title="Videoteca" />} /><Route path="documentos" element={<ContentLibrary type="documents" title="Documentos" />} />
      <Route path="asistentes" element={<AssistantsPage />} /><Route path="progreso" element={<ProgressPage />} /><Route path="certificados" element={<CertificatesPage />} /><Route path="soporte" element={<SupportPage />} /><Route path="perfil" element={<ProfilePage />} />
    </Route><Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
`;

const studentCss = `
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#252825;background:#f5f6f1;font-synthesis:none;--wine:#921a1d;--red:#bf1422;--gold:#dba52b;--ink:#252825;--muted:#6f766f;--line:#dde0d9;--paper:#fff;--cream:#fbf5e8;--green:#27704d}*{box-sizing:border-box}body{margin:0;min-width:320px}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}button{cursor:pointer}img{display:block;max-width:100%}.skip-link{position:fixed;top:-60px;left:16px;z-index:1000;background:#fff;padding:12px}.skip-link:focus{top:16px}.eyebrow{margin:0 0 8px;color:var(--wine);font-weight:800;font-size:.76rem;letter-spacing:.1em;text-transform:uppercase}.app-shell{display:grid;grid-template-columns:270px 1fr;min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;background:#fff;border-right:1px solid var(--line);padding:28px 20px;display:flex;flex-direction:column;z-index:20}.sidebar-brand{display:flex;align-items:center;justify-content:space-between}.sidebar-brand img{width:174px;height:48px;object-fit:contain}.sidebar-label{margin:34px 12px 10px;color:#979b96;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em}.sidebar nav{display:grid;gap:5px}.sidebar nav a{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:9px;color:#555c56;font-weight:650}.sidebar nav a svg{width:19px}.sidebar nav a:hover,.sidebar nav a.active{background:#f8eded;color:var(--wine)}.sidebar nav a.active{box-shadow:inset 3px 0 var(--red)}.sidebar-foot{margin-top:auto;background:var(--cream);border:1px solid #eadbb7;border-radius:12px;padding:16px}.sidebar-foot p{font-size:.84rem;color:var(--muted)}.sidebar-foot a{color:var(--wine);font-weight:800;font-size:.85rem}.app-area{min-width:0}.navbar{height:76px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 34px;position:sticky;top:0;z-index:10}.search{display:flex;align-items:center;gap:9px;background:#f3f4f0;border:1px solid transparent;border-radius:9px;padding:0 13px;min-width:330px}.search:focus-within{background:#fff;border-color:var(--wine);box-shadow:0 0 0 3px #921a1d18}.search svg{width:18px;color:#858b85}.search input{border:0;outline:0;background:transparent;padding:11px 0;width:100%}.navbar-actions,.user-chip{display:flex;align-items:center;gap:12px}.user-chip>span{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--wine);color:#fff;font-weight:800}.user-chip div{display:grid}.user-chip small{color:var(--muted)}.icon-button{border:0;background:transparent;padding:8px;border-radius:8px;color:#545a55}.icon-button:hover{background:#f0f1ed}.icon-button svg{width:20px;height:20px}.mobile-only{display:none}main{padding:0 34px 50px}.breadcrumbs{height:54px;display:flex;align-items:center;gap:9px;color:#90958f;font-size:.82rem}.breadcrumbs strong{color:#4b514c}.page{max-width:1440px;margin:auto}.page h1{font-size:clamp(1.9rem,3vw,2.8rem);line-height:1.06;margin:5px 0 10px}.page h2{font-size:1.35rem;margin:0}.page p{color:var(--muted);line-height:1.55}.welcome{background:var(--wine);color:#fff;border-radius:18px;padding:38px 42px;display:flex;justify-content:space-between;align-items:center;min-height:250px;overflow:hidden;position:relative}.welcome:after{content:"";position:absolute;width:260px;height:260px;border:55px solid #ffffff0d;border-radius:50%;right:-70px;top:-90px}.welcome>div:first-child{max-width:730px;z-index:1}.welcome .eyebrow,.welcome p{color:#f5dfe0}.welcome h1{font-size:clamp(2rem,4vw,3.35rem);max-width:750px}.welcome-mark{z-index:1;display:grid;place-items:center;min-width:190px;gap:5px}.welcome-mark svg{width:54px;height:54px;color:#f5ca58}.welcome-mark span{font-size:.8rem;color:#edcfd0}.button,.text-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:9px;padding:11px 17px;font-weight:800}.button svg{width:18px}.button--primary{background:var(--wine);color:#fff}.button--primary:hover{background:#751417}.button--secondary{background:#fff;color:var(--wine);border-color:#d8c3c4}.button--danger{background:#b4232b;color:#fff}.button--light{background:#fff;color:var(--wine)}.button--ghost-light{border-color:#ffffff70;color:#fff}.button-row{display:flex;gap:11px;flex-wrap:wrap;margin-top:20px}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0 34px}.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;box-shadow:0 8px 25px #26332208}.metric-grid .card{display:flex;gap:14px;align-items:center}.metric-icon{display:grid;place-items:center;width:45px;height:45px;border-radius:11px}.metric-icon.red{background:#f9e7e7;color:var(--wine)}.metric-icon.gold{background:#fff4d5;color:#a27200}.metric-icon.green{background:#e3f4ea;color:var(--green)}.metric-icon svg{width:23px}.metric-grid small,.metric-grid p{display:block;margin:0}.metric-grid strong{display:block;font-size:1.55rem;margin:3px 0}.metric-grid p{font-size:.78rem}.section-heading,.page-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:30px 0 15px}.section-heading a{color:var(--wine);font-weight:800;display:flex;align-items:center;gap:6px}.section-heading svg{width:17px}.page-heading{align-items:center;margin:5px 0 24px}.page-heading p{margin:0}.search--page{background:#fff}.course-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.course-card,.library-grid article{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:.2s}.course-card:hover,.library-grid article:hover{transform:translateY(-3px);box-shadow:0 14px 35px #28332d14}.course-card>img{width:100%;height:175px;object-fit:cover;background:#eee}.course-card>div{padding:18px}.course-card h3,.library-grid h3{font-size:1.04rem;margin:10px 0 6px}.course-card p,.library-grid p{font-size:.86rem;margin:0 0 14px}.course-card a{color:var(--wine);font-weight:800;display:flex;align-items:center;gap:6px;margin-top:14px}.course-card a svg{width:16px}.badge{display:inline-flex;align-items:center;width:max-content;padding:4px 8px;border-radius:5px;font-size:.67rem;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.badge--gold{background:#fff2cc;color:#835e00}.badge--neutral{background:#edf0ec;color:#555c56}.badge--green{background:#e2f4e8;color:#236947}.progress-row{display:flex;justify-content:space-between;gap:10px;color:#777e78;font-size:.76rem}.progress-row span{display:flex;gap:5px;align-items:center}.progress-row svg{width:15px}.progress{height:7px;background:#ebede9;border-radius:6px;overflow:hidden;margin:9px 0}.progress i{display:block;height:100%;background:var(--gold);border-radius:6px}.capsule-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.capsule-strip article{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}.capsule-strip img{height:120px;width:100%;object-fit:cover}.capsule-strip article>div{padding:14px}.capsule-strip small{color:var(--wine);font-weight:800}.capsule-strip h3{font-size:.94rem;margin:6px 0}.capsule-strip p{font-size:.78rem;margin:0}.alert,.source-note{padding:12px 15px;border-radius:9px;margin:0 0 16px;font-size:.86rem}.alert{background:#fff5df;border:1px solid #e9cc84;color:#725313}.alert--error{background:#ffeded;border-color:#e7a3a6;color:#8c171d}.source-note{background:#edf5f0;border:1px solid #bfd9c9;color:#295b40}.state{min-height:220px;display:grid;place-items:center;align-content:center;text-align:center;color:var(--muted)}.state svg{width:34px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--wine);font-weight:800;margin-bottom:14px}.back-link svg{width:18px}.course-hero{display:grid;grid-template-columns:minmax(300px,43%) 1fr;gap:34px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px}.course-hero>img{width:100%;height:310px;object-fit:cover;border-radius:11px}.course-hero>div{align-self:center}.meta-line{display:flex;gap:20px;margin:18px 0;color:#6d746e}.meta-line span{display:flex;align-items:center;gap:6px}.meta-line svg{width:18px}.detail-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:20px;margin-top:20px}.lesson-list{display:grid;margin-top:16px}.lesson-list a{display:grid;grid-template-columns:24px 1fr 24px;align-items:center;gap:12px;padding:13px 4px;border-bottom:1px solid var(--line)}.lesson-list a>svg:first-child{color:#aaa}.lesson-list a.done>svg:first-child{color:var(--green)}.lesson-list span{display:grid}.lesson-list small{color:var(--muted)}.large-number{font-size:2.5rem;color:var(--wine)}.video-placeholder{min-height:360px;background:#232725;color:#fff;border-radius:15px;display:grid;place-items:center;align-content:center;gap:10px;margin:15px 0 20px}.video-placeholder svg{width:64px;height:64px;color:var(--gold)}.video-placeholder span{color:#bfc4c0}.clean-list{padding-left:20px;color:var(--muted);line-height:2}.filter-tabs{display:flex;gap:8px;margin-bottom:18px}.filter-tabs span{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:7px;padding:8px 12px;font-size:.82rem;font-weight:750}.filter-tabs svg{width:16px}.library-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.library-image{height:145px;background:#f0f1ed;display:grid;place-items:center}.library-image img{width:100%;height:100%;object-fit:cover}.library-image svg{width:42px;color:var(--wine)}.library-grid article>div:last-child{padding:16px}.text-button{padding:0;background:transparent;color:var(--wine)}.assistant-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.assistant-card{text-align:left;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;color:inherit}.assistant-card:hover,.assistant-card.selected{border-color:var(--wine);box-shadow:0 0 0 2px #921a1d18}.assistant-card>span{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:#f8e9e9;color:var(--wine);margin-bottom:12px}.assistant-card h3{margin:10px 0 5px}.assistant-card strong{color:var(--wine);font-size:.82rem}.service-chip{display:flex;align-items:center;gap:7px;background:#e6f3ea;color:#286047;border-radius:7px;padding:8px 11px;font-size:.78rem;font-weight:800}.service-chip svg{width:16px}.chat-dock{position:fixed;right:25px;bottom:20px;width:min(390px,calc(100vw - 30px));background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 20px 55px #1c281f33;z-index:30;overflow:hidden}.chat-dock header{display:flex;align-items:center;gap:10px;background:var(--wine);color:#fff;padding:14px}.chat-dock header>span{display:grid;place-items:center;background:#ffffff20;border-radius:8px;width:38px;height:38px}.chat-dock header div{display:grid}.chat-dock header small{color:#f0cfd0}.chat-welcome{padding:28px;text-align:center;color:var(--muted)}.chat-welcome svg{color:var(--gold)}.chat-dock form{display:flex;gap:8px;border-top:1px solid var(--line);padding:10px}.chat-dock input{border:0;outline:0;flex:1}.progress-list{display:grid;gap:20px;margin-top:20px}.progress-list span{display:flex;justify-content:space-between}.progress-list small{color:var(--muted)}.timeline-list{list-style:none;padding:0;display:grid;gap:18px}.timeline-list li{display:grid;grid-template-columns:65px 1fr;gap:12px;border-left:2px solid var(--gold);padding-left:12px}.timeline-list span{color:var(--muted)}.certificate-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.certificate{display:flex;gap:20px;align-items:flex-start}.certificate>svg{width:55px;height:55px;color:#aaa}.certificate.ready{border-top:4px solid var(--gold)}.certificate.ready>svg{color:var(--gold)}.certificate small{color:var(--wine);font-weight:800}.field{display:grid;gap:6px;margin-bottom:14px}.field>span{font-size:.82rem;font-weight:750}.field input,.field select,.field textarea{width:100%;border:1px solid #ccd1ca;background:#fff;border-radius:8px;padding:11px 12px;outline:0}.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--wine);box-shadow:0 0 0 3px #921a1d16}.field small{color:#ad1e24}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.upload-box{border:1px dashed #bfc5be;border-radius:10px;padding:18px;margin-bottom:15px;display:grid;place-items:center;text-align:center;color:var(--muted)}.upload-box svg{color:var(--wine)}.upload-box small{display:block}.success-box{text-align:center;padding:30px}.success-box>svg{width:50px;height:50px;color:var(--green)}.profile-card{display:grid;grid-template-columns:170px 1fr;gap:25px}.profile-avatar{width:130px;height:130px;border-radius:50%;display:grid;place-items:center;background:var(--wine);color:#fff;font-size:3rem;font-weight:900}.auth-layout{min-height:100vh;display:grid;grid-template-columns:minmax(360px,1.1fr) minmax(420px,.9fr);padding:0}.auth-brand{background:var(--wine);color:#fff;padding:9vw 7vw;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}.auth-brand:after{content:"";position:absolute;width:400px;height:400px;border:85px solid #ffffff0b;border-radius:50%;right:-170px;bottom:-180px}.auth-brand img{width:230px;filter:brightness(0) invert(1);margin-bottom:65px}.auth-brand .eyebrow{color:#f0c5c7}.auth-brand h1{font-size:clamp(2.4rem,4.5vw,4.2rem);line-height:1.02;margin:5px 0 22px;max-width:760px}.auth-brand p{color:#efd7d8;max-width:630px;line-height:1.7}.auth-panel{display:grid;place-items:center;padding:45px;background:#fafaf7}.auth-card{width:min(440px,100%);background:#fff;border:1px solid var(--line);border-radius:16px;padding:34px;box-shadow:0 18px 55px #1f2b2312}.auth-card h2{font-size:2rem;margin:5px 0}.auth-card>p{color:var(--muted);line-height:1.5}.auth-card form{margin:24px 0}.auth-card form>.button{width:100%}.auth-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:12px;background:#f6e7e8;color:var(--wine)}.auth-links{display:flex;justify-content:space-between;font-size:.83rem;color:var(--wine);font-weight:750}.auth-note{color:var(--muted)}.modal-backdrop{position:fixed;inset:0;background:#20272180;display:grid;place-items:center;z-index:100;padding:20px}.modal{background:#fff;border-radius:14px;padding:24px;width:min(600px,100%);max-height:90vh;overflow:auto}.modal>header{display:flex;justify-content:space-between;align-items:center}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid var(--line);padding:12px;font-size:.84rem}th{color:#737a74;font-size:.72rem;text-transform:uppercase}.empty-inline{grid-column:1/-1;background:#fff;border:1px dashed var(--line);padding:50px;text-align:center;color:var(--muted)}hr{border:0;border-top:1px solid var(--line)}@media(max-width:1100px){.course-grid,.assistant-grid{grid-template-columns:repeat(2,1fr)}.library-grid,.capsule-strip{grid-template-columns:repeat(2,1fr)}.welcome-mark{display:none}}@media(max-width:800px){.app-shell{display:block}.sidebar{position:fixed;left:-290px;width:270px;transition:.2s}.sidebar.is-open{left:0;box-shadow:10px 0 40px #0003}.mobile-only{display:inline-grid}.navbar{padding:0 16px}.navbar>.search{display:none}main{padding:0 16px 35px}.user-chip div{display:none}.metric-grid,.detail-grid,.certificate-grid,.course-hero,.profile-card{grid-template-columns:1fr}.welcome{padding:28px 24px}.course-hero>img{height:220px}.auth-layout{grid-template-columns:1fr}.auth-brand{display:none}.auth-panel{padding:20px}.page-heading{align-items:flex-start;flex-direction:column}.search--page{width:100%;min-width:0}}@media(max-width:540px){.course-grid,.assistant-grid,.library-grid,.capsule-strip,.metric-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.auth-card{padding:25px}.filter-tabs{overflow:auto}.profile-card{justify-items:center}.profile-card form{width:100%}}
`;

async function createStudent() {
  const base = join(root, 'frontend-academia');
  await createShared(base, 'academia-cabsa-portal', 5007, 'Academia CABSA · Portal académico');
  await write(base, 'src/App.jsx', `import AppRoutes from '@/routes/AppRoutes'; export default function App(){ return <AppRoutes />; }\n`);
  await write(base, 'src/config/routes.js', `export const ROUTES = { home: '/', courses: '/cursos', library: '/mediateca', assistants: '/asistentes', progress: '/progreso' };\n`);
  await write(base, 'src/data/referenceCatalog.js', referenceCatalog);
  await write(base, 'src/layouts/MainLayout.jsx', mainLayout);
  await write(base, 'src/layouts/DashboardLayout.jsx', `export { default } from '@/layouts/MainLayout';\n`);
  await write(base, 'src/components/navigation/Sidebar.jsx', studentNavigation);
  await write(base, 'src/components/navigation/Navbar.jsx', navbar);
  await write(base, 'src/components/navigation/Breadcrumbs.jsx', breadcrumbs);
  await write(base, 'src/components/navigation/UserMenu.jsx', `export default function UserMenu(){ return null; }\n`);
  await write(base, 'src/components/courses/CourseCard.jsx', courseCard);
  await write(base, 'src/components/content/ContentCard.jsx', `export default function ContentCard({item}){return <article><h3>{item.title}</h3><p>{item.summary}</p></article>}\n`);
  await write(base, 'src/components/dashboard/MetricCard.jsx', `import { Card } from '@/components/common'; export default function MetricCard({label,value}){return <Card><small>{label}</small><strong>{value}</strong></Card>}\n`);
  await write(base, 'src/pages/auth/Login.jsx', loginPage(false));
  await write(base, 'src/pages/auth/Register.jsx', registerPage);
  await write(base, 'src/pages/auth/RecoverPassword.jsx', recoverPage);
  await write(base, 'src/pages/dashboard/DashboardHome.jsx', dashboardPage);
  await write(base, 'src/pages/dashboard/MySummary.jsx', `export { default } from '@/pages/progress/ProgressPage';\n`);
  await write(base, 'src/pages/courses/CourseList.jsx', courseList);
  await write(base, 'src/pages/courses/CourseDetail.jsx', courseDetail);
  await write(base, 'src/pages/courses/LessonView.jsx', lessonView);
  await write(base, 'src/pages/content/ContentLibrary.jsx', contentLibrary);
  await write(base, 'src/pages/content/CapsuleList.jsx', `import ContentLibrary from '@/pages/content/ContentLibrary'; export default function CapsuleList(){return <ContentLibrary type="capsules" title="Cápsulas educativas" />}\n`);
  await write(base, 'src/pages/content/VideoLibrary.jsx', `import ContentLibrary from '@/pages/content/ContentLibrary'; export default function VideoLibrary(){return <ContentLibrary type="videos" title="Videoteca" />}\n`);
  await write(base, 'src/pages/content/DocumentsLibrary.jsx', `import ContentLibrary from '@/pages/content/ContentLibrary'; export default function DocumentsLibrary(){return <ContentLibrary type="documents" title="Documentos" />}\n`);
  await write(base, 'src/pages/ai/AssistantsPage.jsx', assistantsPage);
  await write(base, 'src/pages/ai/ChatHistory.jsx', `export default function ChatHistory(){return <div className="page"><h1>Historial de conversaciones</h1><p>Tus conversaciones con asistentes aparecerán aquí.</p></div>}\n`);
  await write(base, 'src/pages/ai/RagLibrary.jsx', `export default function RagLibrary(){return <div className="page"><h1>Biblioteca de conocimiento</h1><p>Documentos disponibles para consulta contextual.</p></div>}\n`);
  await write(base, 'src/pages/progress/ProgressPage.jsx', progressPage);
  await write(base, 'src/pages/progress/CertificatesPage.jsx', certificatesPage);
  await write(base, 'src/pages/support/SupportPage.jsx', supportPage);
  await write(base, 'src/pages/profile/ProfilePage.jsx', profilePage);
  await write(base, 'src/routes/AppRoutes.jsx', studentRoutes);
  await write(base, 'src/styles.css', studentCss);
  await write(base, 'README.md', `# Portal académico CABSA\n\nFrontend React/Vite para estudiantes, docentes y familias. Consume exclusivamente el Gateway SOA en \`http://127.0.0.1:6080\`.\n\n## Ejecutar\n\n\`\`\`powershell\nnpm install\nnpm run dev\n\`\`\`\n\nDisponible en http://localhost:5007.\n`);

  const assets = [
    ['LOGO HORIZONTAL.svg', 'logo/logo-horizontal.svg'],
    ['LOGO VERTICAL.svg', 'logo/logo-vertical.svg'],
    ['2026/05/BootCamp-1024x768.png', 'images/bootcamp.png'],
    ['2025/07/TaeJune15-scaled-600x400-1.jpg', 'images/ia-basica.jpg'],
    ['2025/07/00024-669329969-600x400-1.png', 'images/ia-finanzas.png'],
    ['2025/07/00054-3700994216-600x400-1.png', 'images/docentes-ia.png'],
    ['2025/07/close-up-sad-boy-portrait-2-600x400-1.jpg', 'images/pensamiento.jpg'],
    ['2025/07/00002-2359967846-600x400-1.png', 'images/dinero.png'],
    ['2026/07/Gemini_Generated_Image_q8s7syq8s7syq8s7-1.png', 'images/igualdad.png'],
    ['2026/07/Gemini_Generated_Image_fn3x8efn3x8efn3x-1.png', 'images/normas.png'],
    ['2026/07/Gemini_Generated_Image_nnabjdnnabjdnnab-1-1024x554.png', 'images/redes.png'],
    ['2026/07/Gemini_Generated_Image_zgyq2zzgyq2zzgyq-1-1024x554.png', 'images/emociones.png'],
    ['2026/07/Gemini_Generated_Image_klhc6rklhc6rklhc-1-1024x554.png', 'images/bullying.png'],
    ['2026/07/Gemini_Generated_Image_gk3gehgk3gehgk3g-1024x554.png', 'images/diversidad.png'],
  ];
  for (const [source, target] of assets) {
    const destination = target.startsWith('logo/')
      ? join(base, 'src', 'assets', target)
      : join(base, 'public', 'assets', target);
    await copyIfExists(join(reference, source), destination);
  }
}

const adminNavigation = `
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Library, Bot, BarChart3, Users, BellRing, Settings, X } from 'lucide-react';
import logo from '@/assets/logo/logo-horizontal.svg';
import { useApp } from '@/context/AppContext';
const groups = [
  { label: 'Resumen', items: [['/', 'Centro de control', LayoutDashboard]] },
  { label: 'Operación SOA', items: [['/academia/cursos', 'Academia', GraduationCap], ['/contenido/materiales', 'Contenido', Library], ['/ia/asistentes', 'Inteligencia artificial', Bot], ['/analitica', 'Analítica', BarChart3], ['/usuarios', 'Usuarios y acceso', Users], ['/notificaciones', 'Notificaciones', BellRing]] },
  { label: 'Sistema', items: [['/configuracion', 'Configuración', Settings]] },
];
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  return <aside className={\`sidebar admin-sidebar \${sidebarOpen ? 'is-open' : ''}\`}><div className="sidebar-brand"><img src={logo} alt="Academia CABSA" /><button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)}><X /></button></div>
    <div className="admin-product"><small>Administración</small><strong>Centro de operaciones</strong></div>
    {groups.map((group) => <div className="nav-group" key={group.label}><p className="sidebar-label">{group.label}</p><nav>{group.items.map(([to,label,Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setSidebarOpen(false)}><Icon/><span>{label}</span></NavLink>)}</nav></div>)}
    <div className="sidebar-foot service-state"><i/><div><strong>Gateway conectado</strong><small>Puerto 6080</small></div></div>
  </aside>;
}
`;

const adminNavbar = `
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
export default function Navbar() {
  const { setSidebarOpen } = useApp(); const { user, logout } = useAuth();
  const name = user?.display_name || user?.username || 'Administrador';
  return <header className="navbar"><button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)}><Menu/></button><label className="search"><Search/><input placeholder="Buscar en la administración" /></label><div className="navbar-actions"><span className="environment-tag">LOCAL</span><button className="icon-button"><Bell/></button><div className="user-chip"><span>{name[0].toUpperCase()}</span><div><strong>{name}</strong><small>Operador CABSA</small></div></div><button className="icon-button" onClick={logout}><LogOut/></button></div></header>;
}
`;

const adminBreadcrumbs = `
import { useLocation } from 'react-router-dom';
const names = { academia:'Academia', contenido:'Contenido', ia:'Inteligencia artificial', analitica:'Analítica', usuarios:'Usuarios', notificaciones:'Notificaciones', configuracion:'Configuración' };
export default function Breadcrumbs(){const key=useLocation().pathname.split('/').filter(Boolean)[0];return <div className="breadcrumbs"><span>Administración</span><b>/</b><strong>{names[key]||'Centro de control'}</strong></div>}
`;

const adminMainLayout = `
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import Navbar from '@/components/navigation/Navbar';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
export default function MainLayout(){return <div className="app-shell"><Sidebar/><div className="app-area"><Navbar/><main id="main-content"><Breadcrumbs/><Outlet/></main></div></div>}
`;

const adminDashboard = `
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, GraduationCap, Library, Server, Users, BellRing, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Card, Badge } from '@/components/common';
const modules = [
  {key:'academia',name:'Academia',description:'Cursos, lecciones, inscripciones, progreso y certificados',to:'/academia/cursos',icon:GraduationCap,color:'red'},
  {key:'content',name:'Contenido',description:'Material educativo, cápsulas, videos y documentos',to:'/contenido/materiales',icon:Library,color:'gold'},
  {key:'ai',name:'Inteligencia artificial',description:'Asistentes, prompts, chats y conocimiento RAG',to:'/ia/asistentes',icon:Bot,color:'violet'},
  {key:'analytics',name:'Analítica',description:'Eventos, actividad, rachas, tablero y reportes',to:'/analitica',icon:Activity,color:'blue'},
  {key:'users',name:'Usuarios',description:'Login, registro, roles, permisos y grupos',to:'/usuarios',icon:Users,color:'green'},
  {key:'notifications',name:'Notificaciones',description:'Correo, WhatsApp, recordatorios y entregas',to:'/notificaciones',icon:BellRing,color:'orange'},
];
const normalizeHealth=(data)=>{if(Array.isArray(data))return data;if(Array.isArray(data?.services))return data.services;return Object.entries(data?.services||data||{}).map(([key,value])=>({key,...(typeof value==='object'?value:{status:value})}))};
export default function DashboardHome(){
  const [health,setHealth]=useState([]); const [error,setError]=useState('');
  useEffect(()=>{apiClient('/services/health').then((data)=>setHealth(normalizeHealth(data))).catch((e)=>setError(e.message))},[]);
  const statusFor=(key)=>health.find((item)=>item.key===key||item.name?.includes(key))?.status||health.find((item)=>item.service===key)?.status;
  const online=modules.filter((item)=>['ok','healthy','online','UP',true].includes(statusFor(item.key))).length;
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">Operación integral</p><h1>Centro de control</h1><p>Visibilidad y administración de los seis dominios SOA de Academia CABSA.</p></div><div className="last-update"><span><i/> Entorno local</span><small>Gateway · http://127.0.0.1:6080</small></div></div>
    {error&&<div className="alert"><AlertTriangle/> {error}</div>}
    <section className="admin-metrics"><Card><span className="metric-icon red"><Server/></span><div><small>Servicios registrados</small><strong>6</strong><p>Detrás de un solo Gateway</p></div></Card><Card><span className="metric-icon green"><CheckCircle2/></span><div><small>Servicios disponibles</small><strong>{health.length?online:'—'}</strong><p>Verificación en tiempo real</p></div></Card><Card><span className="metric-icon gold"><Activity/></span><div><small>Arquitectura</small><strong>SOA</strong><p>Servicios desacoplados</p></div></Card><Card><span className="metric-icon blue"><Users/></span><div><small>Acceso</small><strong>JWT</strong><p>Autenticación centralizada</p></div></Card></section>
    <div className="section-heading"><div><p className="eyebrow">Dominios operativos</p><h2>Servicios de la plataforma</h2></div><Badge tone="green">Gateway activo</Badge></div>
    <section className="module-grid">{modules.map(({key,name,description,to,icon:Icon,color})=><Link className="module-card" to={to} key={key}><div className={\`module-icon \${color}\`}><Icon/></div><div><span><h3>{name}</h3><Badge tone={statusFor(key)?'green':'neutral'}>{statusFor(key)||'Registrado'}</Badge></span><p>{description}</p><strong>Administrar módulo <ArrowRight/></strong></div></Link>)}</section>
    <div className="detail-grid"><Card><div className="card-heading"><div><p className="eyebrow">Flujo central</p><h2>Actividad operativa reciente</h2></div><Link to="/analitica">Ver analítica</Link></div><ul className="activity-feed"><li><span className="feed-dot green"/><div><strong>Gateway disponible</strong><p>Enrutamiento para seis servicios configurado.</p></div><small>Ahora</small></li><li><span className="feed-dot gold"/><div><strong>Catálogo académico conectado</strong><p>Cursos y lecciones disponibles para administración.</p></div><small>Sistema</small></li><li><span className="feed-dot red"/><div><strong>Control de acceso JWT</strong><p>Las rutas operativas requieren autenticación.</p></div><small>Activo</small></li></ul></Card><Card><p className="eyebrow">Arquitectura</p><h2>Puertos locales</h2><div className="port-list">{modules.map((item,index)=><div key={item.key}><span><i className={statusFor(item.key)?'online':''}/><strong>{item.name}</strong></span><code>{5001+index}</code></div>)}</div></Card></div>
  </div>;
}
`;

const resourceDefinitions = `
export const resources = {
  courses: { title:'Cursos', singular:'curso', service:'academia', path:'courses', idType:'number', fields:[['slug','Slug','text'],['title','Título','text'],['summary','Resumen','textarea'],['description','Descripción','textarea'],['category','Categoría','text'],['status','Estado','select', ['published','draft','archived']],['image','Imagen URL','text']] },
  lessons: { title:'Lecciones', singular:'lección', service:'academia', path:'lessons', idType:'number', fields:[['course_id','ID de curso','number'],['number','Número','number'],['title','Título','text'],['summary','Resumen','textarea']] },
  enrollments: { title:'Inscripciones', singular:'inscripción', service:'academia', path:'enrollments', idType:'uuid', fields:[['user_id','ID de usuario','text'],['course_id','ID de curso','number'],['status','Estado','select',['ACTIVE','COMPLETED','CANCELLED']],['progress_percentage','Avance (%)','number']] },
  certificates: { title:'Certificados', singular:'certificado', service:'academia', path:'certificates', idType:'uuid', fields:[['user_id','ID de usuario','text'],['course_id','ID de curso','number'],['certificate_code','Código','text'],['status','Estado','text']] },
  memberships: { title:'Membresías y becas', singular:'membresía', service:'academia', path:'memberships', idType:'number', fields:[['name','Nombre','text'],['status','Estado','text'],['description','Descripción','textarea']] },
  support: { title:'Soporte', singular:'ticket', service:'academia', path:'support', idType:'number', fields:[['subject','Asunto','text'],['description','Descripción','textarea'],['status','Estado','text'],['priority','Prioridad','text']] },
  materials: { title:'Material educativo', singular:'material', service:'content', path:'materials', idType:'uuid', defaults:{content_type:'MATERIAL',language:'es'}, fields:[['slug','Slug','text'],['title','Título','text'],['description','Descripción','textarea'],['category','Categoría','text'],['content_type','Tipo','select',['MATERIAL','CAPSULE','VIDEO','DOCUMENT','AUDIO','LINK']],['status','Estado','select',['DRAFT','PUBLISHED','ARCHIVED']],['language','Idioma','text'],['cover_url','Portada URL','text']] },
  capsules: { title:'Cápsulas educativas', singular:'cápsula', service:'content', path:'capsules', idType:'number', fields:[['slug','Slug','text'],['title','Título','text'],['summary','Resumen','textarea'],['category','Categoría','text'],['status','Estado','text'],['image','Imagen URL','text']] },
  videos: { title:'Videos', singular:'video', service:'content', path:'videos', idType:'uuid', defaults:{content_type:'VIDEO',language:'es'}, fields:[['slug','Slug','text'],['title','Título','text'],['description','Descripción','textarea'],['status','Estado','select',['DRAFT','PUBLISHED','ARCHIVED']],['duration_seconds','Duración (segundos)','number'],['cover_url','Portada URL','text']] },
  documents: { title:'Documentos', singular:'documento', service:'content', path:'documents', idType:'uuid', defaults:{content_type:'DOCUMENT',language:'es'}, fields:[['slug','Slug','text'],['title','Título','text'],['description','Descripción','textarea'],['status','Estado','select',['DRAFT','PUBLISHED','ARCHIVED']],['cover_url','Portada URL','text']] },
  assistants: { title:'Asistentes IA', singular:'asistente', service:'ai', path:'assistants', idType:'uuid', defaults:{provider:'openai',model:'gpt-4.1-mini',temperature:0.4,is_active:true}, fields:[['name','Nombre','text'],['slug','Slug','text'],['description','Descripción','textarea'],['provider','Proveedor','text'],['model','Modelo','text'],['temperature','Temperatura','number'],['system_instructions','Instrucciones del sistema','textarea'],['is_active','Activo','checkbox']] },
  prompts: { title:'Plantillas de prompts', singular:'prompt', service:'ai', path:'prompts', idType:'uuid', fields:[['name','Nombre','text'],['slug','Slug','text'],['description','Descripción','textarea'],['template','Plantilla','textarea'],['is_active','Activo','checkbox']] },
  chats: { title:'Historial de chats', singular:'chat', service:'ai', path:'chats', idType:'uuid', fields:[['user_id','ID de usuario','text'],['assistant_id','ID de asistente','text'],['title','Título','text'],['status','Estado','text']] },
  rag: { title:'Bases de conocimiento RAG', singular:'base RAG', service:'ai', path:'rag', idType:'uuid', fields:[['name','Nombre','text'],['description','Descripción','textarea'],['qdrant_collection','Colección Qdrant','text'],['status','Estado','text']] },
  users: { title:'Usuarios', singular:'usuario', service:'users', path:'users', idType:'uuid', fields:[['email','Correo','email'],['username','Usuario','text'],['password','Contraseña inicial','password'],['first_name','Nombre','text'],['last_name','Apellidos','text'],['display_name','Nombre visible','text'],['phone','Teléfono','text'],['status','Estado','select',['PENDING','ACTIVE','SUSPENDED','DISABLED']]] },
  roles: { title:'Roles', singular:'rol', service:'users', path:'roles', idType:'uuid', fields:[['name','Nombre','text'],['slug','Slug','text'],['description','Descripción','textarea'],['is_active','Activo','checkbox']] },
  permissions: { title:'Permisos', singular:'permiso', service:'users', path:'permissions', idType:'uuid', fields:[['name','Nombre','text'],['slug','Slug','text'],['description','Descripción','textarea'],['module','Módulo','text']] },
  groups: { title:'Grupos y regiones', singular:'grupo', service:'users', path:'groups', idType:'number', fields:[['name','Nombre','text'],['description','Descripción','textarea'],['status','Estado','text']] },
  notifications: { title:'Notificaciones', singular:'notificación', service:'notifications', path:'notifications', idType:'uuid', fields:[['user_id','ID de usuario','text'],['channel','Canal','select',['EMAIL','WHATSAPP','IN_APP','SMS']],['destination','Destino','text'],['subject','Asunto','text'],['body','Mensaje','textarea'],['status','Estado','select',['PENDING','QUEUED','SENT','DELIVERED','FAILED','CANCELLED']]] },
  templates: { title:'Plantillas', singular:'plantilla', service:'notifications', path:'templates', idType:'uuid', fields:[['name','Nombre','text'],['slug','Slug','text'],['channel','Canal','select',['EMAIL','WHATSAPP','IN_APP','SMS']],['subject_template','Asunto','text'],['body_template','Contenido','textarea'],['is_active','Activa','checkbox']] },
  reminders: { title:'Recordatorios', singular:'recordatorio', service:'notifications', path:'reminders', idType:'uuid', fields:[['user_id','ID de usuario','text'],['title','Título','text'],['message','Mensaje','textarea'],['channel','Canal','text'],['scheduled_at','Programado para','datetime-local'],['status','Estado','text']] },
};
`;

const resourcePage = `
import { useCallback, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { academiaService } from '@/services/academiaService';
import { aiService } from '@/services/aiService';
import { contentService } from '@/services/contentService';
import { usersService } from '@/services/usersService';
import { notificationsService } from '@/services/notificationsService';
import { analyticsService } from '@/services/analyticsService';
import { authService } from '@/services/authService';
import { useRemoteList } from '@/hooks/useRemoteList';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Loader, Modal, Select, Table, Textarea } from '@/components/common';
import { resources } from '@/config/resources';
const services={academia:academiaService,ai:aiService,content:contentService,users:usersService,notifications:notificationsService,analytics:analyticsService};
const uuid=()=>crypto.randomUUID();
const prepare=(config,form,editing)=>{
  const now=new Date().toISOString(); const values={...config.defaults,...form};
  for(const [key,,type] of config.fields){if(type==='number'&&values[key]!==''&&values[key]!=null)values[key]=Number(values[key]);if(type==='checkbox')values[key]=Boolean(values[key]);}
  if(config.idType==='uuid'&&!editing)values.id=uuid();
  if(!editing){values.created_at=now;} values.updated_at=now;
  return values;
};
export default function ResourcePage({resource}){
  const config=resources[resource]; const service=services[config.service];
  const loader=useCallback(()=>service.list(config.path),[service,config.path]);
  const {items,loading,error,reload}=useRemoteList(loader,[]);
  const [search,setSearch]=useState(''); const [editing,setEditing]=useState(null); const [form,setForm]=useState({}); const [modalOpen,setModalOpen]=useState(false); const [saving,setSaving]=useState(false); const [notice,setNotice]=useState(''); const [remove,setRemove]=useState(null);
  const open=(item=null)=>{setEditing(item);setForm(item?Object.fromEntries(config.fields.map(([key])=>[key,item[key]??''])):{...config.defaults});setNotice('');setModalOpen(true)};
  const close=()=>{setEditing(null);setForm({});setModalOpen(false)};
  const save=async(e)=>{e.preventDefault();setSaving(true);setNotice('');try{const values=prepare(config,form,editing);if(resource==='users'&&!editing){await authService.register({email:form.email,username:form.username,password:form.password,firstName:form.first_name,lastName:form.last_name});}else{delete values.password;if(editing)await service.update(config.path,editing.id,values);else await service.create(config.path,values);}close();await reload();}catch(requestError){setNotice(requestError.message)}finally{setSaving(false)}};
  const confirmRemove=async()=>{try{await service.remove(config.path,remove.id);setRemove(null);await reload()}catch(e){setNotice(e.message);setRemove(null)}};
  const filtered=useMemo(()=>items.filter((item)=>JSON.stringify(item).toLowerCase().includes(search.toLowerCase())),[items,search]);
  const mainFields=config.fields.slice(0,4); const columns=[...mainFields.map(([key,label])=>({key,label,render:(row)=>key==='status'||key==='is_active'?<Badge tone={row[key]===true||['ACTIVE','PUBLISHED','published','SENT','DELIVERED'].includes(row[key])?'green':'neutral'}>{row[key]===true?'Activo':String(row[key]??'—')}</Badge>:String(row[key]??'—')})),{key:'actions',label:'Acciones',render:(row)=><div className="row-actions"><button onClick={()=>open(row)} title="Editar"><Edit3/></button><button className="danger" onClick={()=>setRemove(row)} title="Eliminar"><Trash2/></button></div>}];
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">{config.service}-service</p><h1>{config.title}</h1><p>Consulta, añade, actualiza y elimina registros mediante el Gateway central.</p></div><Button onClick={()=>open()}><Plus/> Añadir {config.singular}</Button></div>
    <div className="resource-toolbar"><label className="search search--page"><Search/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder={\`Buscar en \${config.title.toLowerCase()}\`}/></label><button className="icon-button refresh" onClick={reload}><RefreshCw/></button><span>{filtered.length} registros</span></div>
    {error&&<div className="alert">{error}</div>}{notice&&<div className="alert alert--error">{notice}</div>}
    <section className="card resource-table">{loading?<Loader/>:filtered.length?<Table columns={columns} rows={filtered}/>:<EmptyState title={\`No hay \${config.title.toLowerCase()}\`} description="Añade el primer registro o carga la información de la base academiacabsa." action={<Button onClick={()=>open()}><Plus/> Crear registro</Button>}/>}</section>
    <Modal open={modalOpen} title={editing?\`Editar \${config.singular}\`:\`Añadir \${config.singular}\`} onClose={close}><form onSubmit={save} className="resource-form">{config.fields.filter(([key])=>key!=='password'||!editing).map(([key,label,type,options])=>{
      if(type==='textarea')return <Textarea key={key} label={label} rows="4" value={form[key]??''} onChange={(e)=>setForm({...form,[key]:e.target.value})}/>;
      if(type==='select')return <Select key={key} label={label} value={form[key]??''} onChange={(e)=>setForm({...form,[key]:e.target.value})}><option value="">Selecciona</option>{options.map((option)=><option key={option}>{option}</option>)}</Select>;
      if(type==='checkbox')return <label className="check-field" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e)=>setForm({...form,[key]:e.target.checked})}/><span>{label}</span></label>;
      return <Input key={key} label={label} type={type} value={form[key]??''} onChange={(e)=>setForm({...form,[key]:e.target.value})}/>;
    })}{notice&&<div className="alert alert--error">{notice}</div>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={close}>Cancelar</Button><Button disabled={saving}>{saving?'Guardando…':'Guardar cambios'}</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(remove)} title={\`Eliminar \${config.singular}\`} message="Esta acción eliminará el registro de MySQL. No se puede deshacer desde la interfaz." onClose={()=>setRemove(null)} onConfirm={confirmRemove}/>
  </div>;
}
`;

const moduleHub = `
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
export default function ModuleHub({eyebrow,title,description,items}){
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div></div><section className="hub-grid">{items.map((item)=><Link key={item.to} to={item.to}><span>{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p><strong>Abrir módulo <ArrowRight/></strong></div></Link>)}</section></div>
}
`;

const analyticsPage = `
import { useEffect, useState } from 'react';
import { Activity, BarChart3, CalendarDays, Flame, Users } from 'lucide-react';
import { Card } from '@/components/common';
import { apiClient } from '@/services/apiClient';
export default function AnalyticsDashboard(){
  const [summary,setSummary]=useState({}); const [error,setError]=useState('');
  useEffect(()=>{apiClient('/api/analytics/dashboard/summary').then(setSummary).catch((e)=>setError(e.message))},[]);
  const bars=[42,68,51,74,63,88,70];
  return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">analytics-service</p><h1>Analítica de la plataforma</h1><p>Eventos de usuario, actividad, rachas y tendencias de aprendizaje.</p></div></div>{error&&<div className="alert">{error}</div>}<section className="admin-metrics"><Card><span className="metric-icon red"><Activity/></span><div><small>Eventos</small><strong>{summary.events??'—'}</strong><p>Actividad registrada</p></div></Card><Card><span className="metric-icon green"><Users/></span><div><small>Usuarios activos</small><strong>{summary.activeUsers??'—'}</strong><p>Periodo seleccionado</p></div></Card><Card><span className="metric-icon gold"><Flame/></span><div><small>Rachas</small><strong>{summary.streaks??'—'}</strong><p>Aprendizaje continuo</p></div></Card><Card><span className="metric-icon blue"><CalendarDays/></span><div><small>Días activos</small><strong>{summary.activeDays??'—'}</strong><p>Acumulado</p></div></Card></section><div className="detail-grid"><Card><div className="card-heading"><h2>Actividad de los últimos 7 días</h2><BarChart3/></div><div className="bar-chart">{bars.map((value,index)=><div key={index}><i style={{height:\`\${value}%\`}}/><span>{['L','M','X','J','V','S','D'][index]}</span></div>)}</div></Card><Card><h2>Lectura operativa</h2><p>Los datos se obtienen del servicio de analítica. Al registrar eventos desde el portal académico, los indicadores se actualizarán automáticamente.</p><ul className="clean-list"><li>Actividad por asistente</li><li>Avance de cursos</li><li>Rachas de aprendizaje</li><li>Reportes descargables</li></ul></Card></div></div>
}
`;

const settingsPage = `
import { CheckCircle2, Database, KeyRound, Network } from 'lucide-react';
import { Card } from '@/components/common';
export default function SettingsPage(){return <div className="page admin-page"><div className="page-heading"><div><p className="eyebrow">Sistema local</p><h1>Configuración</h1><p>Resumen de integración del entorno Academia CABSA.</p></div></div><section className="settings-grid"><Card><Network/><div><h3>API Gateway</h3><p>http://127.0.0.1:6080</p></div><CheckCircle2 className="ok"/></Card><Card><Database/><div><h3>MySQL</h3><p>Base academiacabsa · conexión desde servicios</p></div><CheckCircle2 className="ok"/></Card><Card><KeyRound/><div><h3>Autenticación</h3><p>JWT centralizado por users-service</p></div><CheckCircle2 className="ok"/></Card></section></div>}
`;

const adminRoutes = `
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import RoleRoute from '@/routes/RoleRoute';
import Login from '@/pages/auth/Login';
import RecoverPassword from '@/pages/auth/RecoverPassword';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import ResourcePage from '@/pages/shared/ResourcePage';
import AnalyticsDashboard from '@/pages/analytics/AnalyticsDashboard';
import AcademiaHome from '@/pages/academia/AcademiaHome';
import ContentHome from '@/pages/content/ContentHome';
import AiHome from '@/pages/ai/AiHome';
import UsersHome from '@/pages/users/UsersHome';
import NotificationsHome from '@/pages/notifications/NotificationsHome';
import SettingsPage from '@/pages/admin/SettingsPage';
const secured=(element)=><ProtectedRoute><RoleRoute roles={['ADMIN','SUPER_ADMIN','administrator']}>{element}</RoleRoute></ProtectedRoute>;
export default function AppRoutes(){return <Routes><Route element={<AuthLayout/>}><Route path="/login" element={<Login/>}/><Route path="/recuperar" element={<RecoverPassword/>}/></Route><Route element={secured(<MainLayout/>)}><Route index element={<DashboardHome/>}/>
  <Route path="academia" element={<AcademiaHome/>}/><Route path="academia/cursos" element={<ResourcePage resource="courses"/>}/><Route path="academia/lecciones" element={<ResourcePage resource="lessons"/>}/><Route path="academia/inscripciones" element={<ResourcePage resource="enrollments"/>}/><Route path="academia/certificados" element={<ResourcePage resource="certificates"/>}/><Route path="academia/membresias" element={<ResourcePage resource="memberships"/>}/><Route path="academia/soporte" element={<ResourcePage resource="support"/>}/>
  <Route path="contenido" element={<ContentHome/>}/><Route path="contenido/materiales" element={<ResourcePage resource="materials"/>}/><Route path="contenido/capsulas" element={<ResourcePage resource="capsules"/>}/><Route path="contenido/videos" element={<ResourcePage resource="videos"/>}/><Route path="contenido/documentos" element={<ResourcePage resource="documents"/>}/>
  <Route path="ia" element={<AiHome/>}/><Route path="ia/asistentes" element={<ResourcePage resource="assistants"/>}/><Route path="ia/prompts" element={<ResourcePage resource="prompts"/>}/><Route path="ia/chats" element={<ResourcePage resource="chats"/>}/><Route path="ia/rag" element={<ResourcePage resource="rag"/>}/>
  <Route path="analitica" element={<AnalyticsDashboard/>}/><Route path="usuarios" element={<UsersHome/>}/><Route path="usuarios/listado" element={<ResourcePage resource="users"/>}/><Route path="usuarios/roles" element={<ResourcePage resource="roles"/>}/><Route path="usuarios/permisos" element={<ResourcePage resource="permissions"/>}/><Route path="usuarios/grupos" element={<ResourcePage resource="groups"/>}/>
  <Route path="notificaciones" element={<NotificationsHome/>}/><Route path="notificaciones/envios" element={<ResourcePage resource="notifications"/>}/><Route path="notificaciones/plantillas" element={<ResourcePage resource="templates"/>}/><Route path="notificaciones/recordatorios" element={<ResourcePage resource="reminders"/>}/><Route path="configuracion" element={<SettingsPage/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
`;

const adminCssExtra = `
.admin-sidebar{background:#272b28;border:0;color:#fff}.admin-sidebar .sidebar-brand img{filter:brightness(0) invert(1)}.admin-sidebar .sidebar-label{color:#858c86;margin-top:18px}.admin-sidebar nav a{color:#c5cac6}.admin-sidebar nav a:hover,.admin-sidebar nav a.active{background:#ffffff0e;color:#fff}.admin-sidebar nav a.active{box-shadow:inset 3px 0 var(--gold)}.admin-product{border-top:1px solid #ffffff15;margin-top:20px;padding:18px 12px 4px;display:grid}.admin-product small{color:#929993;text-transform:uppercase;letter-spacing:.1em;font-size:.65rem}.service-state{background:#1e211f;border-color:#383d39;display:flex;align-items:center;gap:10px}.service-state i,.last-update i{width:9px;height:9px;border-radius:50%;background:#39b779;box-shadow:0 0 0 4px #39b77922}.service-state div{display:grid}.service-state small{color:#8e958f}.environment-tag{background:#ecefeb;border-radius:5px;padding:4px 7px;color:#5b625c;font-size:.66rem;font-weight:900;letter-spacing:.08em}.admin-page .page-heading{border-bottom:1px solid var(--line);padding-bottom:22px}.last-update{display:grid;justify-items:end;gap:5px}.last-update span{display:flex;align-items:center;gap:8px;font-weight:800}.last-update small{color:var(--muted)}.admin-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.admin-metrics .card{display:flex;align-items:center;gap:13px;padding:17px}.admin-metrics small,.admin-metrics p{display:block;margin:0}.admin-metrics strong{display:block;font-size:1.45rem}.metric-icon.blue{background:#e3eff8;color:#28638f}.module-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.module-card{display:flex;gap:15px;background:#fff;border:1px solid var(--line);border-radius:13px;padding:20px;transition:.2s}.module-card:hover{border-color:#c3c9c2;transform:translateY(-2px);box-shadow:0 12px 30px #26332210}.module-icon{flex:0 0 46px;height:46px;display:grid;place-items:center;border-radius:10px}.module-icon.red{background:#f7e5e6;color:var(--wine)}.module-icon.gold{background:#fff1c9;color:#9a6e00}.module-icon.violet{background:#eee8f8;color:#704ba3}.module-icon.blue{background:#e4f0f8;color:#2b6894}.module-icon.green{background:#e2f3e8;color:#27704d}.module-icon.orange{background:#fbeddf;color:#a85b16}.module-card>div:last-child{min-width:0;flex:1}.module-card span{display:flex;align-items:center;justify-content:space-between;gap:8px}.module-card h3{margin:2px 0;font-size:1rem}.module-card p{font-size:.81rem;margin:8px 0 15px}.module-card strong{display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--wine)}.module-card strong svg{width:15px}.card-heading{display:flex;justify-content:space-between;align-items:center}.card-heading a{color:var(--wine);font-weight:800;font-size:.8rem}.activity-feed{list-style:none;padding:0;margin:18px 0 0}.activity-feed li{display:grid;grid-template-columns:12px 1fr auto;gap:10px;padding:13px 0;border-bottom:1px solid var(--line);align-items:start}.activity-feed p{margin:2px 0;font-size:.81rem}.activity-feed small{color:#909590}.feed-dot{width:8px;height:8px;border-radius:50%;margin-top:7px}.feed-dot.green{background:#36a76e}.feed-dot.gold{background:var(--gold)}.feed-dot.red{background:var(--red)}.port-list{display:grid;margin-top:15px}.port-list>div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)}.port-list span{display:flex;align-items:center;gap:8px}.port-list i{width:7px;height:7px;border-radius:50%;background:#afb4af}.port-list i.online{background:#36a76e}.port-list code{background:#f0f2ef;border-radius:4px;padding:3px 6px}.hub-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.hub-grid>a{background:#fff;border:1px solid var(--line);border-radius:13px;padding:22px;display:flex;gap:14px}.hub-grid>a:hover{border-color:var(--wine)}.hub-grid>a>span{font-size:1.8rem}.hub-grid h3{margin:0}.hub-grid p{font-size:.83rem}.hub-grid strong{color:var(--wine);font-size:.8rem;display:flex;align-items:center;gap:5px}.hub-grid svg{width:15px}.resource-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px}.resource-toolbar .search{flex:1}.resource-toolbar>span{font-size:.8rem;color:var(--muted)}.refresh{background:#fff;border:1px solid var(--line)}.resource-table{padding:0;overflow:hidden}.resource-table .state{min-height:360px}.row-actions{display:flex;gap:4px}.row-actions button{border:0;background:#edf0ec;border-radius:6px;padding:6px;color:#515852}.row-actions button.danger{background:#f9e4e5;color:#9b1d23}.row-actions svg{width:16px;height:16px}.resource-form{margin-top:18px}.check-field{display:flex;align-items:center;gap:9px;margin:13px 0}.bar-chart{height:270px;display:flex;align-items:end;justify-content:space-around;gap:12px;border-bottom:1px solid var(--line);margin-top:25px}.bar-chart>div{height:100%;flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:8px}.bar-chart i{width:min(34px,70%);background:var(--wine);border-radius:5px 5px 0 0}.bar-chart span{font-size:.72rem;color:var(--muted);padding-bottom:7px}.settings-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.settings-grid .card{display:grid;grid-template-columns:45px 1fr 24px;align-items:center;gap:13px}.settings-grid .card>svg:first-child{color:var(--wine)}.settings-grid h3,.settings-grid p{margin:0}.settings-grid p{font-size:.8rem}.settings-grid .ok{color:#36a76e}@media(max-width:1100px){.admin-metrics,.module-grid{grid-template-columns:repeat(2,1fr)}.hub-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.admin-metrics,.module-grid,.hub-grid,.settings-grid{grid-template-columns:1fr}.resource-toolbar{flex-wrap:wrap}.resource-toolbar .search{min-width:100%}.last-update{justify-items:start}}
`;

async function createAdmin() {
  const base = join(root, 'frontend-administracion');
  await createShared(base, 'academia-cabsa-administracion', 5008, 'Academia CABSA · Administración');
  await write(base, 'src/App.jsx', `import AppRoutes from '@/routes/AppRoutes'; export default function App(){ return <AppRoutes/>; }\n`);
  await write(base, 'src/config/routes.js', `export const ROUTES={home:'/',academia:'/academia',content:'/contenido',ai:'/ia',analytics:'/analitica',users:'/usuarios',notifications:'/notificaciones'};\n`);
  await write(base, 'src/config/resources.js', resourceDefinitions);
  await write(base, 'src/layouts/MainLayout.jsx', adminMainLayout);
  await write(base, 'src/layouts/DashboardLayout.jsx', `export { default } from '@/layouts/MainLayout';\n`);
  await write(base, 'src/components/navigation/Sidebar.jsx', adminNavigation);
  await write(base, 'src/components/navigation/Navbar.jsx', adminNavbar);
  await write(base, 'src/components/navigation/Breadcrumbs.jsx', adminBreadcrumbs);
  await write(base, 'src/components/navigation/UserMenu.jsx', `export default function UserMenu(){return null}\n`);
  await write(base, 'src/components/admin/ModuleHub.jsx', moduleHub);
  await write(base, 'src/components/admin/ServiceStatus.jsx', `export default function ServiceStatus({online=true}){return <span className={online?'badge badge--green':'badge'}>{online?'Disponible':'Sin respuesta'}</span>}\n`);
  await write(base, 'src/pages/auth/Login.jsx', loginPage(true));
  await write(base, 'src/pages/auth/RecoverPassword.jsx', recoverPage);
  await write(base, 'src/pages/dashboard/DashboardHome.jsx', adminDashboard);
  await write(base, 'src/pages/dashboard/GlobalSummary.jsx', `export { default } from '@/pages/dashboard/DashboardHome';\n`);
  await write(base, 'src/pages/shared/ResourcePage.jsx', resourcePage);
  await write(base, 'src/pages/analytics/AnalyticsDashboard.jsx', analyticsPage);
  await write(base, 'src/pages/admin/SettingsPage.jsx', settingsPage);
  const hubs = {
    'academia/AcademiaHome.jsx': `import ModuleHub from '@/components/admin/ModuleHub'; export default function AcademiaHome(){return <ModuleHub eyebrow="academia-service" title="Administración académica" description="Gestiona el ciclo completo de aprendizaje." items={[{to:'/academia/cursos',icon:'01',title:'Cursos',description:'Catálogo, publicación y estructura.'},{to:'/academia/lecciones',icon:'02',title:'Lecciones',description:'Contenido ordenado por curso.'},{to:'/academia/inscripciones',icon:'03',title:'Inscripciones',description:'Acceso y estado de estudiantes.'},{to:'/academia/certificados',icon:'04',title:'Certificados',description:'Emisión y consulta de constancias.'},{to:'/academia/membresias',icon:'05',title:'Membresías y becas',description:'Planes, becas y códigos.'},{to:'/academia/soporte',icon:'06',title:'Soporte',description:'Tickets y seguimiento.'}]}/>}\n`,
    'content/ContentHome.jsx': `import ModuleHub from '@/components/admin/ModuleHub'; export default function ContentHome(){return <ModuleHub eyebrow="content-service" title="Gestión de contenido" description="Publica recursos educativos para el portal." items={[{to:'/contenido/materiales',icon:'01',title:'Material educativo',description:'Recursos centrales de aprendizaje.'},{to:'/contenido/capsulas',icon:'02',title:'Cápsulas',description:'Microcontenidos temáticos.'},{to:'/contenido/videos',icon:'03',title:'Videos',description:'Biblioteca audiovisual.'},{to:'/contenido/documentos',icon:'04',title:'Documentos',description:'Guías y archivos descargables.'}]}/>}\n`,
    'ai/AiHome.jsx': `import ModuleHub from '@/components/admin/ModuleHub'; export default function AiHome(){return <ModuleHub eyebrow="ai-service" title="Inteligencia artificial" description="Configura la experiencia de asistentes y conocimiento." items={[{to:'/ia/asistentes',icon:'01',title:'Asistentes IA',description:'Modelos, instrucciones y disponibilidad.'},{to:'/ia/prompts',icon:'02',title:'Prompts',description:'Plantillas reutilizables.'},{to:'/ia/chats',icon:'03',title:'Historial de chats',description:'Sesiones y trazabilidad.'},{to:'/ia/rag',icon:'04',title:'RAG y Qdrant',description:'Bases de conocimiento vectorial.'}]}/>}\n`,
    'users/UsersHome.jsx': `import ModuleHub from '@/components/admin/ModuleHub'; export default function UsersHome(){return <ModuleHub eyebrow="users-service" title="Usuarios y acceso" description="Administra identidad, autorización y grupos." items={[{to:'/usuarios/listado',icon:'01',title:'Usuarios',description:'Cuentas y estado de acceso.'},{to:'/usuarios/roles',icon:'02',title:'Roles',description:'Responsabilidades del sistema.'},{to:'/usuarios/permisos',icon:'03',title:'Permisos',description:'Acciones autorizadas por módulo.'},{to:'/usuarios/grupos',icon:'04',title:'Grupos y regiones',description:'Organización de comunidades CABSA.'}]}/>}\n`,
    'notifications/NotificationsHome.jsx': `import ModuleHub from '@/components/admin/ModuleHub'; export default function NotificationsHome(){return <ModuleHub eyebrow="notifications-service" title="Centro de notificaciones" description="Coordina comunicación por correo, WhatsApp y recordatorios." items={[{to:'/notificaciones/envios',icon:'01',title:'Notificaciones',description:'Cola, estado y entregas.'},{to:'/notificaciones/plantillas',icon:'02',title:'Plantillas',description:'Mensajes reutilizables por canal.'},{to:'/notificaciones/recordatorios',icon:'03',title:'Recordatorios',description:'Programación de comunicaciones.'}]}/>}\n`,
  };
  for (const [file, content] of Object.entries(hubs)) await write(base, `src/pages/${file}`, content);
  await write(base, 'src/routes/AppRoutes.jsx', adminRoutes);
  await write(base, 'src/styles.css', `${studentCss}\n${adminCssExtra}`);
  await write(base, 'README.md', `# Administración Academia CABSA\n\nPanel React/Vite para operar los seis servicios SOA a través del Gateway central.\n\n## Ejecutar\n\n\`\`\`powershell\nnpm install\nnpm run dev\n\`\`\`\n\nDisponible en http://localhost:5008.\n`);
  await copyIfExists(join(reference, 'LOGO HORIZONTAL.svg'), join(base, 'src', 'assets', 'logo', 'logo-horizontal.svg'));
  await copyIfExists(join(reference, 'LOGO VERTICAL.svg'), join(base, 'src', 'assets', 'logo', 'logo-vertical.svg'));
}

await createStudent();
await createAdmin();
