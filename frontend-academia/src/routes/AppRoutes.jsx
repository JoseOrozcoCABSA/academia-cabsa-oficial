/**
 * @file Tabla de rutas de la aplicacion de la academia.
 *
 * Aqui se decide que es publico y que exige sesion: envolver una pantalla en
 * `secured` es lo unico que la protege en el cliente. Olvidarlo la deja abierta,
 * aunque los datos sigan protegidos por el gateway.
 *
 * Las pantallas de acceso comparten `AuthLayout` y las internas `MainLayout`.
 *
 * @see ProtectedRoute.jsx Guarda de sesion.
 */

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/routes/ProtectedRoute';
import MembershipRoute from '@/routes/MembershipRoute';

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'));
const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const RecoverPassword = lazy(() => import('@/pages/auth/RecoverPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const CourseList = lazy(() => import('@/pages/courses/CourseList'));
const CourseDetail = lazy(() => import('@/pages/courses/CourseDetail'));
const LessonView = lazy(() => import('@/pages/courses/LessonView'));
const ContentLibrary = lazy(() => import('@/pages/content/ContentLibrary'));
const MediaLibraryPage = lazy(() => import('@/pages/content/MediaLibraryPage'));
const CapsuleDetailPage = lazy(() => import('@/pages/content/CapsuleDetailPage'));
const BlogDetailPage = lazy(() => import('@/pages/content/BlogDetailPage'));
const AiToolPage = lazy(() => import('@/pages/ai/AiToolPage'));
const GptAgentsPage = lazy(() => import('@/pages/ai/GptAgentsPage'));
const CertificatesPage = lazy(() => import('@/pages/progress/CertificatesPage'));
const SupportPage = lazy(() => import('@/pages/support/SupportPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const ProfileEditPage = lazy(() => import('@/pages/profile/ProfileEditPage'));
const TeacherStudentsPage = lazy(() => import('@/pages/profile/TeacherStudentsPage'));
const StudentProgressPage = lazy(() => import('@/pages/profile/StudentProgressPage'));
const ScholarshipActivationPage = lazy(() => import('@/pages/profile/ScholarshipActivationPage'));
const AdvisorProfilePage = lazy(() => import('@/pages/profile/AdvisorProfilePage'));
const LandingPage = lazy(() => import('@/pages/home/LandingPage'));
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'));
const DocumentationPage = lazy(() => import('@/pages/documentation/DocumentationPage'));
const ForumsPage = lazy(() => import('@/pages/forums/ForumsPage'));
const ForumDetailPage = lazy(() => import('@/pages/forums/ForumDetailPage'));
const ForumTopicPage = lazy(() => import('@/pages/forums/ForumTopicPage'));
const CapsuleSemaphorePage = lazy(() => import('@/pages/progress/CapsuleSemaphorePage'));
const CourseGamificationPage = lazy(() => import('@/pages/progress/CourseGamificationPage'));

/**
 * Envuelve una pantalla en la guarda de sesion.
 *
 * Solo exige sesion iniciada, no un rol concreto: cualquier usuario autenticado
 * entra. Es la diferencia con el panel de administracion, que ademas comprueba
 * el rol.
 */
const secured = (element) => <ProtectedRoute>{element}</ProtectedRoute>;
const member = (section, element) => secured(<MembershipRoute section={section}>{element}</MembershipRoute>);
/**
 * Tabla de rutas de la academia.
 *
 * La portada permanece pública; documentación, avisos legales y pantallas
 * personales pasan por {@link secured}. Añadir una pantalla protegida es envolverla aquí:
 * si se olvida, queda accesible sin sesion.
 */
export default function AppRoutes() {
  return <Suspense fallback={<div className="course-state course-state--page">Preparando página…</div>}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/ai/asistentes/:level" element={member('assistants', <AiToolPage toolType="assistant" />)} />
    <Route path="/ai/tutores/:level" element={member('tutors', <AiToolPage toolType="tutor" />)} />
    <Route path="/agentes-gpt" element={member('assistants', <GptAgentsPage />)} />
    <Route path="/asistentes" element={<Navigate to="/agentes-gpt" replace />} />
    <Route path="/terminos" element={secured(<TermsPage />)} />
    <Route path="/aviso-privacidad" element={secured(<PrivacyPage />)} />
    <Route path="/privacidad" element={<Navigate to="/aviso-privacidad" replace />} />
    <Route path="/documentacion" element={secured(<DocumentationPage />)} />
    <Route path="/mediateca" element={member('media', <MediaLibraryPage />)} />
    <Route path="/mediateca/:slug" element={member('media', <CapsuleDetailPage />)} />
    <Route path="/capsulas" element={member('media', <MediaLibraryPage />)} />
    <Route path="/capsulas/gamificacion" element={member('progress', <CapsuleSemaphorePage />)} />
    <Route path="/capsulas/semaforo" element={<Navigate to="/capsulas/gamificacion" replace />} />
    <Route path="/capsulas/:slug" element={member('media', <CapsuleDetailPage />)} />
    <Route path="/novedades/:slug" element={<BlogDetailPage />} />
    <Route path="/cursos" element={member('courses', <CourseList />)} />
    <Route path="/cursos/gamificacion" element={member('progress', <CourseGamificationPage />)} />
    <Route path="/cursos/:slug" element={member('courses', <CourseDetail />)} />
    <Route path="/cursos/:slug/lecciones/:number" element={member('lessons', <LessonView />)} />
    <Route path="/foros" element={member('forums', <ForumsPage />)} />
    <Route path="/foros/tema/:slug" element={member('forums', <ForumTopicPage />)} />
    <Route path="/foros/:slug" element={member('forums', <ForumDetailPage />)} />
    <Route path="/soporte" element={member('support', <SupportPage />)} />
    <Route path="/perfil" element={secured(<ProfilePage />)} />
    <Route path="/perfil/editar" element={secured(<ProfileEditPage />)} />
    <Route path="/perfil/asesor" element={secured(<AdvisorProfilePage />)} />
    <Route path="/mis-alumnos" element={secured(<TeacherStudentsPage />)} />
    <Route path="/mis-alumnos/:studentId" element={secured(<StudentProgressPage />)} />
    <Route path="/activar-beca" element={secured(<ScholarshipActivationPage />)} />
    <Route element={<AuthLayout />}><Route path="/login" element={<Login />} /><Route path="/registro" element={<Register />} /><Route path="/verificar-cuenta" element={<VerifyEmail />} /><Route path="/recuperar" element={<RecoverPassword />} /><Route path="/restablecer" element={<ResetPassword />} /></Route>
    <Route element={secured(<MainLayout />)}>
      <Route path="videos" element={<MembershipRoute section="media"><ContentLibrary type="videos" title="Videoteca" /></MembershipRoute>} /><Route path="documentos" element={<MembershipRoute section="media"><ContentLibrary type="documents" title="Documentos" /></MembershipRoute>} />
      <Route path="progreso" element={<Navigate to="/perfil" replace />} /><Route path="certificados" element={<MembershipRoute section="progress"><CertificatesPage /></MembershipRoute>} />
    </Route><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>;
}
