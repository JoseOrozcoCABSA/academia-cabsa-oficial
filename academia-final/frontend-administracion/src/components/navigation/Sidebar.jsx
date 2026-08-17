/**
 * @file Componente `Sidebar`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Library,
  Bot,
  BarChart3,
  Users,
  BellRing,
  Settings,
  X,
  KeyRound,
  LifeBuoy,
  PanelsTopLeft,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
} from "lucide-react";
import logo from "@/assets/logo/logo-horizontal.svg";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
const groups = [
  { label: "Resumen", items: [["/", "Centro de control", LayoutDashboard]] },
  {
    label: "Administración plataforma",
    items: [
      ["/plataforma", "Panel de plataforma", PanelsTopLeft],
      ["/usuarios", "Usuarios y grupos", Users],
      ["/miembros", "Miembros", UserRoundCheck],
      ["/plataforma/asesores", "Asesores", UserCog],
      ["/plataforma/accesos", "Accesos por beca", ShieldCheck],
      ["/plataforma/codigos", "Códigos y becas", KeyRound],
      ["/plataforma/peticiones", "Peticiones y soporte", LifeBuoy],
      ["/notificaciones", "Correos y avisos", BellRing],
    ],
  },
  {
    label: "Administración contenido",
    items: [
      ["/contenido", "Panel de contenido", Library],
      ["/contenido/medios", "Biblioteca multimedia", Library],
      ["/academia/cursos", "Cursos y lecciones", GraduationCap],
      ["/contenido/capsulas", "Cápsulas", Library],
      ["/contenido/blog", "Entradas y novedades", Library],
      ["/ia/asistentes", "Asistentes y tutores", Bot],
      ["/analitica", "Analítica de uso", BarChart3],
    ],
  },
  { label: "Sistema", items: [["/configuracion", "Configuración", Settings]] },
];
/**
 * Menu lateral de navegacion.
 *
 * En pantallas estrechas se muestra u oculta con el estado del contexto de
 * interfaz; en pantallas anchas esta siempre visible y la clase no influye.
 *
 * Los enlaces salen de una lista fija declarada en este archivo, no de los
 * permisos del usuario: aqui aparecen todas las secciones y el control de acceso
 * lo hacen las guardas de ruta.
 */
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { user } = useAuth();
  const isAdvisor = (user?.roles || []).some((role) =>
    ["ADVISOR", "ASESOR", "advisor"].includes(String(role)),
  );
  const visibleGroups = isAdvisor
    ? [
        {
          label: "GestiÃ³n asignada",
          items: [["/asesor", "Usuarios, grupos y becas", UserCog]],
        },
      ]
    : groups;
  return (
    <aside className={`sidebar admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="sidebar-brand">
        <img src={logo} alt="Academia CABSA" />
        <button
          className="icon-button mobile-only"
          onClick={() => setSidebarOpen(false)}
        >
          <X />
        </button>
      </div>
      <div className="admin-product">
        <small>Administración</small>
        <strong>Centro de operaciones</strong>
      </div>
      {visibleGroups.map((group) => (
        <div className="nav-group" key={group.label}>
          <p className="sidebar-label">{group.label}</p>
          <nav>
            {group.items.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
      <div className="sidebar-foot service-state">
        <i />
        <div>
          <strong>Gateway conectado</strong>
          <small>Puerto 6080</small>
        </div>
      </div>
    </aside>
  );
}
