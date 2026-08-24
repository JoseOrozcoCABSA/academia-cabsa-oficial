/**
 * @file Componente `PrivacyPage`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import LegalPage from '@/pages/legal/LegalPage';

/** Aviso de privacidad. Texto fijo, sin logica. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Aviso de Privacidad">
      <section>
        <h2>Identidad y domicilio del Responsable</h2>
        <p>
          Academia CABSA® (en adelante, “Academia CABSA”) con domicilio en Océano Pacífico #1738,
          Col. Prados del Tepeyac, C. P. 85150, Cd. Obregón, Sonora, México, y correo{' '}
          <a href="mailto:soporte@academiacabsa.com">soporte@academiacabsa.com</a>, es responsable
          del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares (LFPDPPP) y demás normativa aplicable.
        </p>
      </section>

      <section>
        <h2>Datos personales que tratamos</h2>
        <ul>
          <li><strong>Identificación y contacto:</strong> nombre, apellidos, usuario, correo, teléfono.</li>
          <li><strong>Perfil educativo/laboral:</strong> escuela, grado/área, rol (docente, estudiante, familia), grupo.</li>
          <li><strong>Uso de la plataforma:</strong> accesos (login), progreso y calificaciones, foros, grupos, comunidad.</li>
          <li><strong>Transaccionales:</strong> membresías/becas, cupones, pagos y facturación (si aplica).</li>
          <li><strong>Soporte:</strong> mensajes/envíos a mesa de ayuda.</li>
          <li><strong>Técnicos:</strong> IP, dispositivo, navegador, cookies y tecnologías similares.</li>
          <li><strong>Sensibles:</strong> en principio no los solicitamos; si fuesen necesarios, pediremos consentimiento expreso y aplicaremos medidas reforzadas.</li>
        </ul>
      </section>

      <section>
        <h2>Finalidades del tratamiento</h2>
        <h3>Primarias (necesarias)</h3>
        <ul>
          <li>Registro de cuenta y autenticación.</li>
          <li>Gestión de membresías/becas, grupos y comunidades.</li>
          <li>Prestación de servicios educativos (cápsulas, microcursos, tutores/asistentes virtuales, evaluaciones y constancias).</li>
          <li>Soporte técnico y atención a solicitudes.</li>
          <li>Cumplimiento de obligaciones legales y contractuales.</li>
        </ul>

        <h3>Secundarias (opcionales)</h3>
        <ul>
          <li>Comunicaciones informativas y de mejora del servicio.</li>
          <li>Invitaciones a eventos, encuestas y boletines.</li>
          <li>Estadística y analítica para mejora de la plataforma.</li>
        </ul>
        <p>
          Puede optar por no participar en finalidades secundarias enviando un correo a{' '}
          <a href="mailto:soporte@academiacabsa.com">soporte@academiacabsa.com</a> o usando los
          enlaces de preferencias en nuestras comunicaciones.
        </p>
      </section>

      <section>
        <h2>Fundamento del tratamiento</h2>
        <p>
          (i) Consentimiento del titular; (ii) relación jurídica y ejecución del servicio;
          (iii) interés legítimo (seguridad, prevención de fraude, mejora); (iv) obligaciones legales.
        </p>
      </section>

      <section>
        <h2>Transferencias y encargados</h2>
        <p>
          Podemos transferir datos a encargados (proveedores) que nos prestan servicios (alojamiento,
          correo, analítica, pagos, LMS/foros) bajo contratos de confidencialidad y encargo. También
          a autoridades cuando lo exija la ley. En caso de transferencias internacionales,
          adoptaremos medidas contractuales y de seguridad razonables. No vendemos datos personales.
        </p>
      </section>

      <section>
        <h2>Cookies y tecnologías similares</h2>
        <p>
          Usamos cookies para recordar preferencias, autenticar sesiones, obtener analítica de uso
          y mejorar servicios. Puede gestionarlas desde su navegador o el banner de consentimiento.
          Deshabilitar ciertas cookies puede afectar funcionalidades (login, progreso, foros).
        </p>
      </section>

      <section>
        <h2>Conservación y seguridad</h2>
        <p>
          Conservamos los datos por el tiempo necesario para finalidades y obligaciones legales.
          Implementamos medidas administrativas, técnicas y físicas razonables (control de accesos,
          cifrado en tránsito, contraseñas robustas, copias de seguridad). Ningún método es 100%
          infalible; trabajamos en mejora continua.
        </p>
      </section>

      <section>
        <h2>Derechos ARCO, revocación y limitación del uso</h2>
        <p>
          Puede ejercer Acceso, Rectificación, Cancelación u Oposición (ARCO), así como revocar su
          consentimiento o limitar el uso/divulgación de sus datos, enviando solicitud a{' '}
          <a href="mailto:soporte@academiacabsa.com">soporte@academiacabsa.com</a> con:
        </p>
        <ul>
          <li>Nombre completo y medio de contacto.</li>
          <li>Descripción del derecho que desea ejercer.</li>
          <li>Documentos que acrediten su identidad o representación.</li>
        </ul>
        <p>Responderemos conforme a los plazos de la LFPDPPP.</p>
      </section>

      <section>
        <h2>Menores de edad</h2>
        <p>
          Para estudiantes menores de edad, requerimos autorización del padre/madre/tutor. Si
          detectamos cuentas sin dicha autorización, las bloquearemos hasta regularizar la
          situación.
        </p>
      </section>

      <section>
        <h2>Cambios al Aviso de Privacidad</h2>
        <p>
          Publicaremos actualizaciones en{' '}
          <a href="https://academiacabsa.com/aviso-de-privacidad/">
            academiacabsa.com/aviso-de-privacidad/
          </a>{' '}
          indicando la fecha de última actualización.
        </p>
      </section>

      <section>
        <h2>Contacto</h2>
        <p><strong>Correo:</strong> <a href="mailto:soporte@academiacabsa.com">soporte@academiacabsa.com</a></p>
        <p>
          <strong>Domicilio:</strong> Océano Pacífico #1738, Col. Prados del Tepeyac,
          C. P. 85150, Cd. Obregón, Sonora, México.
        </p>
      </section>

    </LegalPage>
  );
}
