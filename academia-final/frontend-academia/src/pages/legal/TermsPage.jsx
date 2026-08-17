/**
 * @file Componente `TermsPage`.
 *
 * Componente de presentación sin acceso a datos propio.
 */

import LegalPage from '@/pages/legal/LegalPage';

/** Terminos y condiciones de uso. Texto fijo, sin logica. */
export default function TermsPage() {
  return (
    <LegalPage title="Términos y Condiciones de Uso – Academia CABSA®">
      <section>
        <h2>1) Aceptación</h2>
        <p>
          Al usar <strong>Academia CABSA®</strong> (el <strong>“Sitio/Plataforma”</strong>),
          usted acepta estos <strong>Términos</strong> y nuestro <strong>Aviso de Privacidad</strong>.
          Si no está de acuerdo, no utilice la plataforma.
        </p>
      </section>

      <section>
        <h2>2) Objeto</h2>
        <p>
          Proveer una plataforma educativa con <strong>cápsulas</strong>, <strong>microcursos</strong>,
          <strong> tutores y asistentes virtuales</strong>, <strong>foros temáticos</strong>,
          <strong> grupos y comunidades</strong>, y <strong>membresías/becas</strong>. Algunas
          funciones requieren registro o nivel de membresía.
        </p>
      </section>

      <section>
        <h2>3) Registro de cuenta</h2>
        <p>
          Proporcione información veraz y mantenga sus credenciales en confidencialidad. Usted es
          responsable del uso de su cuenta. Para <strong>menores</strong>, se requiere autorización
          del padre/madre/tutor.
        </p>
      </section>

      <section>
        <h2>4) Membresías, becas y pagos</h2>
        <p>
          El acceso puede estar sujeto a <strong>membresías</strong> o <strong>becas</strong> con
          vigencia. En servicios pagados se mostrarán <strong>precios, impuestos y condiciones</strong>
          antes del pago. Los cupones/becas tienen reglas de uso (vigencia, número de activaciones).
          Salvo disposición legal, no hay reembolsos una vez iniciado el servicio, salvo política
          expresa.
        </p>
      </section>

      <section>
        <h2>5) Conducta del usuario</h2>
        <p>Queda prohibido:</p>
        <ul>
          <li>Infringir la ley o derechos de terceros; vulnerar la seguridad del Sitio.</li>
          <li>Hostigar, discriminar o publicar contenido ilegal/ofensivo.</li>
          <li>Infringir propiedad intelectual o compartir contenidos sin autorización.</li>
          <li>Incumplir las <strong>normas de comunidad</strong> y moderación.</li>
        </ul>
        <p>Podremos suspender o cancelar cuentas por incumplimientos.</p>
      </section>

      <section>
        <h2>6) Propiedad intelectual</h2>
        <p>
          Salvo indicación en contrario, los contenidos (textos, marcas, logotipos, materiales
          educativos) pertenecen a <strong>Academia CABSA</strong> o se usan con licencia. Se otorga
          una <strong>licencia limitada, no exclusiva e intransferible</strong> para uso personal o
          educativo. Queda prohibida su <strong>reproducción o explotación comercial</strong> sin
          autorización escrita.
        </p>
      </section>

      <section>
        <h2>7) Contenidos de usuarios</h2>
        <p>
          Usted conserva sus derechos, pero otorga a Academia CABSA una
          <strong> licencia mundial, no exclusiva y gratuita</strong> para
          <strong> alojar, reproducir y mostrar</strong> su contenido con fines de operación y
          promoción del servicio, conforme al Aviso de Privacidad.
        </p>
      </section>

      <section>
        <h2>8) Disponibilidad y cambios</h2>
        <p>
          La plataforma puede <strong>modificarse</strong>, suspenderse temporalmente o finalizar por
          mantenimiento, actualización o fuerza mayor. Podemos <strong>modificar</strong> estos
          Términos; la versión vigente se publicará en{' '}
          <a href="https://academiacabsa.com/terminos/">academiacabsa.com/terminos/</a>.
        </p>
      </section>

      <section>
        <h2>9) Servicios de terceros</h2>
        <p>
          Podemos integrar servicios de terceros (p. ej. pagos, analítica, hosting de videos).
          Revise sus términos y políticas; no somos responsables por sus prácticas.
        </p>
      </section>

      <section>
        <h2>10) Responsabilidad</h2>
        <p>
          El servicio se ofrece <strong>“tal cual”</strong> y <strong>“según disponibilidad”</strong>.
          En la medida permitida por la ley, <strong>Academia CABSA</strong> no será responsable por
          daños indirectos, incidentales o consecuentes. Esto no limita responsabilidades que no
          puedan excluirse por ley.
        </p>
      </section>

      <section>
        <h2>11) Ley aplicable y jurisdicción</h2>
        <p>
          Rige la legislación de <strong>los Estados Unidos Mexicanos</strong>. Para controversias,
          jurisdicción de <strong>Hermosillo, Sonora, México</strong>, salvo norma imperativa distinta.
        </p>
      </section>

      <section>
        <h2>12) Contacto</h2>
        <p><strong>Correo:</strong> <a href="mailto:soporte@academiacabsa.com">soporte@academiacabsa.com</a></p>
      </section>

    </LegalPage>
  );
}
