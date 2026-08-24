/**
 * @file Tabla de rutas del panel de administracion.
 *
 * Casi todas las pantallas son la misma `ResourcePage` con un `resource`
 * distinto, asi que dar de alta una entidad en el panel es anadir una ruta y una
 * entrada en `config/resources.js`.
 *
 * Ademas de sesion, exige rol: la comprobacion esta en `RoleRoute`.
 *
 * @see config/resources.js Catalogo de entidades.
 */

import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RoleRoute from "@/routes/RoleRoute";
import ResourcePage from "@/pages/shared/ResourcePage";

const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const MainLayout = lazy(() => import("@/layouts/MainLayout"));
const Login = lazy(() => import("@/pages/auth/Login"));
const RecoverPassword = lazy(() => import("@/pages/auth/RecoverPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const AnalyticsDashboard = lazy(
  () => import("@/pages/analytics/AnalyticsDashboard"),
);
const PublicVisitorsDashboard = lazy(
  () => import("@/pages/analytics/PublicVisitorsDashboard"),
);
const ContentHome = lazy(() => import("@/pages/content/ContentHome"));
const AiHome = lazy(() => import("@/pages/ai/AiHome"));
const UsersHome = lazy(() => import("@/pages/users/UsersHome"));
const UserDashboard = lazy(() => import("@/pages/users/UserDashboard"));
const MembersPage = lazy(() => import("@/pages/members/MembersPage"));
const GroupManagementPage = lazy(
  () => import("@/pages/users/GroupManagementPage"),
);
const AccessControlPage = lazy(() => import("@/pages/users/AccessControlPage"));
const NotificationsHome = lazy(
  () => import("@/pages/notifications/NotificationsHome"),
);
const EmailSender = lazy(() => import("@/pages/notifications/EmailSender"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const PlatformHome = lazy(() => import("@/pages/platform/PlatformHome"));
const ScholarshipCodesManager = lazy(
  () => import("@/pages/platform/ScholarshipCodesManager"),
);
const SupportRequestsManager = lazy(
  () => import("@/pages/platform/SupportRequestsManager"),
);
const CoursesPage = lazy(() => import("@/pages/academia/CoursesPage"));
const CourseEditor = lazy(() => import("@/pages/academia/CourseEditor"));
const CapsulesPage = lazy(() => import("@/pages/content/CapsulesPage"));
const CapsuleEditor = lazy(() => import("@/pages/content/CapsuleEditor"));
const BlogEntriesPage = lazy(() => import("@/pages/content/BlogEntriesPage"));
const MediaLibraryPage = lazy(() => import("@/pages/content/MediaLibraryPage"));
const AssistantLinksManager = lazy(
  () => import("@/pages/ai/AssistantLinksManager"),
);
const LessonsPage = lazy(() => import("@/pages/academia/LessonsPage"));
const AiTrackerPage = lazy(() =>
  import("@/pages/analytics/TrackersDashboard").then((module) => ({
    default: module.AiTrackerPage,
  })),
);
const CapsuleTrackerPage = lazy(() =>
  import("@/pages/analytics/TrackersDashboard").then((module) => ({
    default: module.CapsuleTrackerPage,
  })),
);
const CourseTrackerPage = lazy(() =>
  import("@/pages/analytics/TrackersDashboard").then((module) => ({
    default: module.CourseTrackerPage,
  })),
);
const ExamEditorPage = lazy(() => import("@/pages/academia/ExamEditorPage"));
const AdvisorManagementPage = lazy(
  () => import("@/pages/advisors/AdvisorManagementPage"),
);
const AdvisorWorkspacePage = lazy(
  () => import("@/pages/advisors/AdvisorWorkspacePage"),
);
/**
 * Envuelve una pantalla en las dos guardas del panel: sesion y rol.
 *
 * Los roles admitidos se declaran aqui como lista fija, con las tres variantes
 * que conviven en los datos (`ADMIN`, `SUPER_ADMIN`, `administrator`). Un rol
 * escrito de otra forma en la base de datos no entra.
 */
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "administrator"];
const PORTAL_ROLES = [...ADMIN_ROLES, "ADVISOR", "ASESOR", "advisor"];
const portal = (element) => (
  <ProtectedRoute>
    <RoleRoute roles={PORTAL_ROLES}>{element}</RoleRoute>
  </ProtectedRoute>
);
const AdminBoundary = () => (
  <RoleRoute roles={ADMIN_ROLES}>
    <Outlet />
  </RoleRoute>
);
const RoleHome = () => {
  const { user } = useAuth();
  const isAdvisor = (user?.roles || []).some((role) =>
    ["ADVISOR", "ASESOR", "advisor"].includes(String(role)),
  );
  return isAdvisor ? <Navigate to="/asesor" replace /> : <DashboardHome />;
};
/**
 * Tabla de rutas del panel.
 *
 * Casi todas las pantallas son `ResourcePage` con un `resource` distinto: el
 * CRUD se configura, no se programa.
 */
export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="page admin-page">
          <section className="card">Preparando página…</section>
        </div>
      }
    >
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar" element={<RecoverPassword />} />
          <Route path="/restablecer" element={<ResetPassword />} />
        </Route>
        <Route element={portal(<MainLayout />)}>
          <Route index element={<RoleHome />} />
          <Route path="asesor" element={<AdvisorWorkspacePage />} />
            <Route element={<AdminBoundary />}>
              <Route path="plataforma" element={<PlatformHome />} />
              <Route
                path="plataforma/codigos"
                element={<ScholarshipCodesManager />}
              />
              <Route
                path="plataforma/becas"
                element={<ResourcePage resource="scholarships" />}
              />
              <Route
                path="plataforma/pendientes"
                element={<ResourcePage resource="pendingActivations" />}
              />
              <Route
                path="plataforma/peticiones"
                element={<SupportRequestsManager />}
              />
              <Route
                path="plataforma/asistentes"
                element={<Navigate to="/ia/asistentes" replace />}
              />
              <Route
                path="plataforma/asesores"
                element={<AdvisorManagementPage />}
              />
              <Route
                path="plataforma/accesos"
                element={<AccessControlPage />}
              />
            <Route path="academia" element={<Navigate to="/academia/cursos" replace />} />
            <Route path="academia/cursos" element={<CoursesPage />} />
            <Route
              path="academia/cursos/:id/editar"
              element={<CourseEditor />}
            />
            <Route
              path="academia/cursos/:courseId/lecciones/:lessonId/examen"
              element={
                <Suspense
                  fallback={
                    <div className="page admin-page">
                      <section className="card">
                        Preparando editor de examen…
                      </section>
                    </div>
                  }
                >
                  <ExamEditorPage />
                </Suspense>
              }
            />
            <Route path="academia/lecciones" element={<LessonsPage />} />
            <Route
              path="academia/inscripciones"
              element={<ResourcePage resource="enrollments" />}
            />
            <Route
              path="academia/certificados"
              element={<ResourcePage resource="certificates" />}
            />
            <Route
              path="academia/membresias"
              element={<ResourcePage resource="memberships" />}
            />
            <Route
              path="academia/soporte"
              element={<ResourcePage resource="support" />}
            />
            <Route path="contenido" element={<ContentHome />} />
            <Route path="contenido/medios" element={<MediaLibraryPage />} />
            <Route
              path="contenido/imagenes"
              element={<MediaLibraryPage initialType="IMAGE" />}
            />
            <Route
              path="contenido/materiales"
              element={<ResourcePage resource="materials" />}
            />
            <Route path="contenido/capsulas" element={<CapsulesPage />} />
            <Route
              path="contenido/capsulas/:id/editar"
              element={<CapsuleEditor />}
            />
            <Route path="contenido/blog" element={<BlogEntriesPage />} />
            <Route
              path="contenido/blog/:id/editar"
              element={<CapsuleEditor />}
            />
            <Route
              path="contenido/videos"
              element={<MediaLibraryPage initialType="VIDEO" />}
            />
            <Route
              path="contenido/documentos"
              element={<MediaLibraryPage initialType="DOCUMENT" />}
            />
            <Route path="ia" element={<AiHome />} />
            <Route path="ia/asistentes" element={<AssistantLinksManager />} />
            <Route
              path="ia/prompts"
              element={<ResourcePage resource="prompts" />}
            />
            <Route
              path="ia/chats"
              element={<ResourcePage resource="chats" />}
            />
            <Route path="ia/rag" element={<ResourcePage resource="rag" />} />
            <Route path="analitica" element={<AnalyticsDashboard />} />
            <Route path="analitica/visitantes" element={<PublicVisitorsDashboard />} />
            <Route path="analitica/asistentes" element={<AiTrackerPage />} />
            <Route path="analitica/capsulas" element={<CapsuleTrackerPage />} />
            <Route path="analitica/cursos" element={<CourseTrackerPage />} />
            <Route path="usuarios" element={<UsersHome />} />
            <Route path="miembros" element={<MembersPage />} />
            <Route path="usuarios/panorama" element={<UserDashboard />} />
            <Route path="usuarios/accesos" element={<Navigate to="/plataforma/accesos" replace />} />
            <Route
              path="usuarios/asesores"
              element={<Navigate to="/plataforma/asesores" replace />}
            />
            <Route
              path="usuarios/listado"
              element={<Navigate to="/usuarios/panorama" replace />}
            />
            <Route
              path="usuarios/roles"
              element={<Navigate to="/plataforma/accesos" replace />}
            />
            <Route
              path="usuarios/permisos"
              element={<Navigate to="/plataforma/accesos" replace />}
            />
            <Route
              path="usuarios/grupos"
              element={<GroupManagementPage />}
            />
            <Route path="notificaciones" element={<NotificationsHome />} />
            <Route path="notificaciones/envios" element={<EmailSender />} />
            <Route
              path="notificaciones/plantillas"
              element={<ResourcePage resource="templates" />}
            />
            <Route
              path="notificaciones/recordatorios"
              element={<ResourcePage resource="reminders" />}
            />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
