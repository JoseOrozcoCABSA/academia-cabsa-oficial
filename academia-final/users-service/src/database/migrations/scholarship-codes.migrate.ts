import database from '#config/database';

const presentationTemplates = [
  {
    names: ['Beca Docente CABSA'],
    html: `<header class="profile-cabsa-hero scholarship-welcome-hero">
  <p class="eyebrow">Beca Docente CABSA</p>
  <h1>Bienvenido/a a Beca Docente CABSA</h1>
  <p>¡Felicidades por tu Beca Docente CABSA! Como Socio CABSA Educador, tienes acceso exclusivo a recursos pedagógicos premium, herramientas de enseñanza innovadoras y contenido especializado para potenciar tu labor educativa. Esta beca es parte de los beneficios corporativos que CABSA ofrece a sus clientes comprometidos con la educación.</p>
</header>
<section class="profile-cabsa-card scholarship-benefits">
  <p class="eyebrow">Beneficios activos</p>
  <h2>¿Qué incluye tu beca?</h2>
  <ul>
    <li>Asistentes virtuales de apoyo.</li>
    <li>Cursos y microcursos para avanzar a tu ritmo.</li>
    <li>Foros y comunidad Academia CABSA.</li>
    <li>Lecciones y actividades educativas.</li>
    <li>Cápsulas y materiales de la mediateca.</li>
    <li>Seguimiento de avance y reconocimientos.</li>
    <li>Soporte y acompañamiento de la plataforma.</li>
    <li>Tutores virtuales con explicaciones guiadas.</li>
    <li>Administración de dependientes con 30 lugares por titular.</li>
  </ul>
</section>
<section class="scholarship-next-actions" aria-label="Accesos de la beca">
  <a href="/mediateca"><strong>Explorar cápsulas</strong><span>Contenido breve y práctico →</span></a>
  <a href="/cursos"><strong>Ver microcursos</strong><span>Aprende a tu ritmo →</span></a>
  <a href="/foros"><strong>Entrar a los foros</strong><span>Comparte con la comunidad →</span></a>
  <a href="/mis-alumnos"><strong>Gestionar dependientes</strong><span>{{DEPENDENT_SEATS}} →</span></a>
</section>`,
  },
  {
    names: ['Beca Familia-Estudiante CABSA'],
    html: `<header class="profile-cabsa-hero scholarship-welcome-hero">
  <p class="eyebrow">Beca Familia-Estudiante CABSA</p>
  <h1>Bienvenido/a a tu Beca Familia-Estudiante CABSA</h1>
  <p>¡Qué bueno tenerte en <strong>Academia CABSA</strong>! Con tu <strong>Beca Familia-Estudiante CABSA</strong> tienes acceso a recursos educativos para resolver dudas, fortalecer tus conocimientos y compartir avances.</p>
</header>
<section class="profile-cabsa-card scholarship-benefits">
  <p class="eyebrow">Beneficios activos</p>
  <h2>¿Qué incluye tu beca?</h2>
  <ul>
    <li>Cápsulas breves para entender lo esencial.</li>
    <li>Cursos y microcursos con actividades educativas.</li>
    <li>Tutores y asistentes virtuales con explicaciones guiadas.</li>
    <li>Foros temáticos y comunidad de estudiantes.</li>
    <li>Materiales disponibles en la mediateca.</li>
    <li>Seguimiento de avance y reconocimientos cuando apliquen.</li>
  </ul>
</section>
<section class="scholarship-next-actions" aria-label="Accesos de la beca">
  <a href="/mediateca"><strong>Explorar cápsulas</strong><span>Contenido breve y práctico →</span></a>
  <a href="/cursos"><strong>Ver microcursos</strong><span>Aprende a tu ritmo →</span></a>
  <a href="/foros"><strong>Entrar a los foros</strong><span>Comparte con la comunidad →</span></a>
</section>`,
  },
  {
    names: ['Beca Personal CABSA'],
    html: `<header class="profile-cabsa-hero scholarship-welcome-hero">
  <p class="eyebrow">Beca Personal CABSA</p>
  <h1>Bienvenido/a a tu Beca Personal CABSA</h1>
  <p>¡Gracias por unirte a <strong>Academia CABSA</strong>! Con tu <strong>Beca Personal CABSA</strong> accedes a recursos educativos y herramientas prácticas para continuar aprendiendo a tu ritmo.</p>
</header>
<section class="profile-cabsa-card scholarship-benefits">
  <p class="eyebrow">Beneficios activos</p>
  <h2>¿Qué incluye tu beca?</h2>
  <ul>
    <li>Cápsulas educativas breves y accionables.</li>
    <li>Cursos y microcursos para avanzar a tu ritmo.</li>
    <li>Tutores y asistentes virtuales para apoyo personalizado.</li>
    <li>Foros temáticos y grupos de aprendizaje.</li>
    <li>Materiales disponibles en la mediateca.</li>
    <li>Seguimiento de progreso cuando aplique.</li>
  </ul>
</section>
<section class="scholarship-next-actions" aria-label="Accesos de la beca">
  <a href="/mediateca"><strong>Explorar cápsulas</strong><span>Contenido breve y práctico →</span></a>
  <a href="/cursos"><strong>Ver microcursos</strong><span>Aprende a tu ritmo →</span></a>
  <a href="/foros"><strong>Entrar a los foros</strong><span>Comparte con la comunidad →</span></a>
  <a href="/mis-alumnos"><strong>Gestionar dependientes</strong><span>{{DEPENDENT_SEATS}} →</span></a>
</section>`,
  },
];

async function migrate() {
  const [codeColumns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_codigos_beca_email'`,
  );
  const existing = new Set((codeColumns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME));
  const additions: Array<[string, string]> = [
    ['estado', "ENUM('ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE' AFTER usado_en"],
    ['lote', 'VARCHAR(120) NULL AFTER estado'],
    ['notas', 'TEXT NULL AFTER lote'],
  ];
  for (const [name, definition] of additions) {
    if (!existing.has(name)) {
      await database.query(`ALTER TABLE usuarios_codigos_beca_email ADD COLUMN \`${name}\` ${definition}`);
    }
  }
  const [levelColumns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_niveles_membresia'`,
  );
  const levelExisting = new Set((levelColumns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME));
  if (!levelExisting.has('presentation_config')) {
    await database.query(
      'ALTER TABLE usuarios_niveles_membresia ADD COLUMN presentation_config LONGTEXT NULL AFTER description',
    );
  }
  for (const template of presentationTemplates) {
    await database.query(
      `UPDATE usuarios_niveles_membresia
       SET presentation_config=:html
       WHERE name IN (:names)
         AND (
           presentation_config IS NULL OR TRIM(presentation_config)=''
           OR presentation_config NOT LIKE '%scholarship-next-actions%'
         )`,
      { replacements: { html: template.html, names: template.names } },
    );
  }
  const [activationColumns] = await database.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_activaciones_becas'`,
  );
  const activationExisting = new Set((activationColumns as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME));
  if (!activationExisting.has('vigente_hasta')) {
    await database.query(
      'ALTER TABLE usuarios_activaciones_becas ADD COLUMN vigente_hasta DATE NULL AFTER activado_en',
    );
  }
  const [indexes] = await database.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='usuarios_codigos_beca_email'`,
  );
  const indexNames = new Set((indexes as Array<{ INDEX_NAME: string }>).map((row) => row.INDEX_NAME));
  if (!indexNames.has('beca_estado_idx')) {
    await database.query('ALTER TABLE usuarios_codigos_beca_email ADD INDEX beca_estado_idx (estado)');
  }
  if (!indexNames.has('beca_lote_idx')) {
    await database.query('ALTER TABLE usuarios_codigos_beca_email ADD INDEX beca_lote_idx (lote)');
  }
  console.log('Migración del gestor de códigos aplicada correctamente.');
}

migrate()
  .then(() => database.close())
  .catch(async (error) => {
    console.error(error);
    await database.close();
    process.exitCode = 1;
  });
