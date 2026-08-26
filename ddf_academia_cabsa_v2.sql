-- ============================================================
-- BASE DE DATOS: DOCUMENTOS DE DEFINICIÓN FUNCIONAL (DDF)
-- Proyecto inicial: ESIN01 - Academia CABSA V2
-- Motor: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS ddf_proyectos_cabsa
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ddf_proyectos_cabsa;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. DOCUMENTO DDF PRINCIPAL
-- ============================================================

CREATE TABLE ddf_documentos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proyecto_codigo VARCHAR(100) NOT NULL,
    nombre_proyecto VARCHAR(300) NOT NULL,
    tipo_proyecto ENUM('NUEVO','CAMBIO','MEJORA','OTRO') NOT NULL DEFAULT 'NUEVO',
    area_solicitante VARCHAR(200) NULL,
    responsable_negocio VARCHAR(255) NULL,
    responsable_ti_analista VARCHAR(255) NULL,
    version VARCHAR(30) NOT NULL DEFAULT '01',
    fecha_documento DATE NULL,
    estado ENUM('BORRADOR','EN_REVISION','APROBADO','RECHAZADO','ARCHIVADO') NOT NULL DEFAULT 'BORRADOR',
    ticket_mesa_ayuda VARCHAR(255) NULL,
    referencia_solicitud VARCHAR(1000) NULL,
    referencia_historias_usuario VARCHAR(1000) NULL,

    definicion_problema TEXT NULL,
    objetivo_funcional LONGTEXT NULL,

    alcance_funcional LONGTEXT NULL,
    fuera_alcance LONGTEXT NULL,

    procesos_impactados LONGTEXT NULL,
    resumen_as_is LONGTEXT NULL,

    flujo_to_be LONGTEXT NULL,

    impacto_usuarios_operacion LONGTEXT NULL,
    criterios_generales_uat LONGTEXT NULL,

    observaciones_generales LONGTEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_ddf_proyecto_version (proyecto_codigo, version),
    KEY idx_ddf_estado (estado),
    KEY idx_ddf_fecha (fecha_documento)
) ENGINE=InnoDB;


-- ============================================================
-- 2. HISTORIAL DE LEVANTAMIENTO
-- ============================================================

CREATE TABLE ddf_historial_levantamiento (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    numero INT UNSIGNED NOT NULL,
    fecha DATE NULL,
    participantes_clave TEXT NULL,
    medio_comentario TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_historial_numero (ddf_id, numero)
) ENGINE=InnoDB;


-- ============================================================
-- 3. ROLES, ACTORES Y RESPONSABILIDADES
-- ============================================================

CREATE TABLE ddf_roles_actores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    rol_actor VARCHAR(200) NOT NULL,
    responsabilidades LONGTEXT NOT NULL,
    area_sistema_involucrado VARCHAR(500) NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rol_actor_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    KEY idx_roles_ddf_orden (ddf_id, orden)
) ENGINE=InnoDB;


-- ============================================================
-- 4. HISTORIAS DE USUARIO / MÓDULOS
-- ============================================================

CREATE TABLE ddf_historias_usuario (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    rol VARCHAR(255) NULL,
    funcionalidad LONGTEXT NULL,
    objetivo LONGTEXT NULL,
    modulo VARCHAR(200) NULL,
    prioridad ENUM('CRITICA','ALTA','MEDIA','BAJA','NO_DEFINIDA') NOT NULL DEFAULT 'NO_DEFINIDA',
    estado ENUM('BORRADOR','APROBADA','EN_DESARROLLO','COMPLETADA','CANCELADA') NOT NULL DEFAULT 'BORRADOR',
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_hu_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_hu_codigo (ddf_id, codigo),
    KEY idx_hu_modulo (modulo),
    KEY idx_hu_estado (estado)
) ENGINE=InnoDB;


-- ============================================================
-- 5. PANTALLAS Y FORMULARIOS
-- ============================================================

CREATE TABLE ddf_pantallas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre_ubicacion VARCHAR(255) NOT NULL,
    descripcion_funcional LONGTEXT NOT NULL,
    notas_mockup LONGTEXT NULL,
    prioridad_mockup BOOLEAN NOT NULL DEFAULT FALSE,
    ruta_url VARCHAR(1000) NULL,
    estado ENUM('DEFINIDA','EN_DISENO','APROBADA','DESARROLLADA','DESCARTADA') NOT NULL DEFAULT 'DEFINIDA',
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pantalla_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_pantalla_codigo (ddf_id, codigo),
    KEY idx_pantalla_estado (estado)
) ENGINE=InnoDB;


-- ============================================================
-- 6. MOCKUPS / PROTOTIPOS
-- ============================================================

CREATE TABLE ddf_mockups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    pantalla_id BIGINT UNSIGNED NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NULL,
    tipo ENUM('IMAGEN','FIGMA','PDF','ENLACE','OTRO') NOT NULL DEFAULT 'ENLACE',
    referencia VARCHAR(1000) NULL,
    version VARCHAR(30) NULL,
    aprobado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_aprobacion DATE NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mockup_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mockup_pantalla
        FOREIGN KEY (pantalla_id)
        REFERENCES ddf_pantallas(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;


-- ============================================================
-- 7. DOCUMENTOS Y REPORTES GENERADOS
-- ============================================================

CREATE TABLE ddf_documentos_reportes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(120) NOT NULL,
    usuario_principal VARCHAR(255) NULL,
    objetivo_uso LONGTEXT NULL,
    frecuencia_disparador VARCHAR(500) NULL,
    formato_salida VARCHAR(100) NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_doc_reporte_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_doc_reporte_codigo (ddf_id, codigo)
) ENGINE=InnoDB;


-- ============================================================
-- 8. REGLAS DE NEGOCIO
-- ============================================================

CREATE TABLE ddf_reglas_negocio (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre_descripcion VARCHAR(500) NOT NULL,
    proceso_pantalla VARCHAR(500) NULL,
    notas LONGTEXT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_regla_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_regla_codigo (ddf_id, codigo)
) ENGINE=InnoDB;


-- ============================================================
-- 9. TABLAS DE DECISIÓN
-- ============================================================

CREATE TABLE ddf_tablas_decision (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    condiciones LONGTEXT NOT NULL,
    resultado_esperado LONGTEXT NOT NULL,
    observaciones LONGTEXT NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_td_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_td_codigo (ddf_id, codigo)
) ENGINE=InnoDB;


-- ============================================================
-- 10. VALIDACIONES GENERALES
-- ============================================================

CREATE TABLE ddf_validaciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    categoria ENUM(
        'CAMPO_OBLIGATORIO',
        'FORMATO',
        'LONGITUD',
        'TIPO_DATO',
        'SEGURIDAD',
        'ARCHIVO',
        'UNICIDAD',
        'REGLA_ENTRE_CAMPOS',
        'INTEGRIDAD',
        'OTRA'
    ) NOT NULL DEFAULT 'OTRA',
    descripcion LONGTEXT NOT NULL,
    proceso_pantalla VARCHAR(500) NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_validacion_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    KEY idx_validacion_categoria (ddf_id, categoria)
) ENGINE=InnoDB;


-- ============================================================
-- 11. CASOS ESPECIALES Y EXCEPCIONES
-- ============================================================

CREATE TABLE ddf_casos_especiales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    descripcion_caso LONGTEXT NOT NULL,
    comportamiento_esperado LONGTEXT NOT NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ce_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_ce_codigo (ddf_id, codigo)
) ENGINE=InnoDB;


-- ============================================================
-- 12. IMPACTO EN DATOS / CATÁLOGOS
-- ============================================================

CREATE TABLE ddf_impacto_datos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    entidad_tabla_catalogo VARCHAR(255) NOT NULL,
    tipo_cambio ENUM(
        'NUEVO',
        'MIGRACION',
        'MODIFICACION',
        'MIGRACION_MODIFICACION',
        'INTEGRACION',
        'ELIMINACION',
        'SIN_CAMBIO',
        'OTRO'
    ) NOT NULL DEFAULT 'OTRO',
    descripcion_breve LONGTEXT NULL,
    notas LONGTEXT NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_impacto_datos_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 13. CONSIDERACIONES DE MIGRACIÓN
-- ============================================================

CREATE TABLE ddf_consideraciones_migracion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    descripcion LONGTEXT NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
    estado ENUM('PENDIENTE','EN_PROCESO','COMPLETADO','NO_APLICA') NOT NULL DEFAULT 'PENDIENTE',
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_migracion_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 14. IMPACTO EN USUARIOS Y OPERACIÓN
-- ============================================================

CREATE TABLE ddf_acciones_operativas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    accion LONGTEXT NOT NULL,
    responsable VARCHAR(255) NULL,
    estado ENUM('PENDIENTE','EN_PROCESO','COMPLETADA','NO_APLICA') NOT NULL DEFAULT 'PENDIENTE',
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_accion_operativa_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 15. CRITERIOS DE VALIDACIÓN UAT
-- ============================================================

CREATE TABLE ddf_uat (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    condicion_entrada LONGTEXT NULL,
    resultado_esperado LONGTEXT NOT NULL,
    hu_regla_relacionada VARCHAR(500) NULL,
    estado ENUM('PENDIENTE','APROBADO','RECHAZADO','BLOQUEADO','NO_EJECUTADO') NOT NULL DEFAULT 'NO_EJECUTADO',
    evidencia VARCHAR(1000) NULL,
    observaciones LONGTEXT NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_uat_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_uat_codigo (ddf_id, codigo),
    KEY idx_uat_estado (estado)
) ENGINE=InnoDB;


CREATE TABLE ddf_criterios_aprobacion_uat (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    descripcion LONGTEXT NOT NULL,
    cumplido BOOLEAN NOT NULL DEFAULT FALSE,
    observaciones LONGTEXT NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_criterio_uat_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 16. FIRMAS Y VALIDACIONES
-- ============================================================

CREATE TABLE ddf_firmas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    nombre VARCHAR(255) NULL,
    rol_area VARCHAR(255) NOT NULL,
    tipo ENUM(
        'ELABORACION',
        'REVISION',
        'REVISION_TECNICA',
        'REVISION_FUNCIONAL',
        'VOBO',
        'APROBACION',
        'AUTORIZACION'
    ) NOT NULL,
    fecha DATE NULL,
    firma_vobo VARCHAR(1000) NULL,
    estado ENUM('PENDIENTE','FIRMADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    observaciones TEXT NULL,
    orden INT UNSIGNED NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_firma_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 17. REFERENCIAS Y ADJUNTOS
-- ============================================================

CREATE TABLE ddf_referencias (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    tipo ENUM(
        'FORMATO_SOLICITUD',
        'HISTORIAS_USUARIO',
        'MOCKUP',
        'DIAGRAMA',
        'DOCUMENTO',
        'TICKET',
        'CARPETA',
        'OTRO'
    ) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    referencia VARCHAR(1000) NULL,
    descripcion TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_referencia_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- 18. BITÁCORA DE CAMBIOS DEL DDF
-- ============================================================

CREATE TABLE ddf_bitacora (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ddf_id BIGINT UNSIGNED NOT NULL,
    usuario_referencia VARCHAR(255) NULL,
    accion VARCHAR(120) NOT NULL,
    descripcion LONGTEXT NULL,
    datos_anteriores JSON NULL,
    datos_nuevos JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bitacora_ddf
        FOREIGN KEY (ddf_id)
        REFERENCES ddf_documentos(id)
        ON DELETE CASCADE,

    KEY idx_bitacora_ddf_fecha (ddf_id, created_at)
) ENGINE=InnoDB;


-- ============================================================
-- DATOS INICIALES
-- DDF ESIN01 - ACADEMIA CABSA V2
-- ============================================================

INSERT INTO ddf_documentos (
    proyecto_codigo,
    nombre_proyecto,
    tipo_proyecto,
    area_solicitante,
    responsable_negocio,
    responsable_ti_analista,
    version,
    fecha_documento,
    estado,
    referencia_solicitud
)
VALUES (
    'ESIN01',
    'Desarrollo del sitio WEB Academia CABSA V2',
    'NUEVO',
    'Estrategias e Innovación',
    'CABSA SAPI',
    'Preguntar',
    '01',
    '2026-07-20',
    'APROBADO',
    'Carpeta Actual'
);


-- ============================================================
-- VARIABLES DE APOYO
-- ============================================================

SET @DDF_ID = (
    SELECT id
    FROM ddf_documentos
    WHERE proyecto_codigo = 'ESIN01'
      AND version = '01'
    LIMIT 1
);


-- ============================================================
-- PANTALLAS PAN-01 A PAN-27
-- ============================================================

INSERT INTO ddf_pantallas
(ddf_id, codigo, nombre_ubicacion, descripcion_funcional, notas_mockup, prioridad_mockup, orden)
VALUES

(@DDF_ID, 'PAN-01', 'Página principal',
'Presenta información general de Academia CABSA y accesos principales a las diferentes secciones.',
'Diseño responsive.', TRUE, 1),

(@DDF_ID, 'PAN-02', 'Registro de usuario',
'Formulario para crear una cuenta y capturar la información requerida según el tipo de usuario.',
'Incluye validaciones de campos y aceptación de términos aplicables.', TRUE, 2),

(@DDF_ID, 'PAN-03', 'Inicio de sesión',
'Permite autenticarse mediante correo electrónico y contraseña.',
'Puede incorporar CAPTCHA u otros mecanismos de protección.', TRUE, 3),

(@DDF_ID, 'PAN-04', 'Recuperación de contraseña',
'Permite solicitar el restablecimiento seguro de la contraseña.',
'Debe utilizar enlaces o mecanismos temporales de recuperación.', FALSE, 4),

(@DDF_ID, 'PAN-05', 'Perfil / Mi Cuenta',
'Permite consultar y modificar información personal, contraseña, beca, membresía y datos permitidos del usuario.',
'Funcionalidad según rol.', TRUE, 5),

(@DDF_ID, 'PAN-06', 'Activación de beca',
'Permite introducir y validar un código de beca.',
'Muestra beneficio, vigencia y resultado de activación.', TRUE, 6),

(@DDF_ID, 'PAN-07', 'Gestión de grupo',
'Permite al maestro consultar y administrar los alumnos asociados a su grupo.',
'Incluye búsqueda, código de grupo y listado de integrantes.', TRUE, 7),

(@DDF_ID, 'PAN-08', 'Catálogo de cursos',
'Muestra los cursos disponibles para el usuario y su progreso.',
'Puede incluir filtros, categorías y estado de avance.', TRUE, 8),

(@DDF_ID, 'PAN-09', 'Detalle de curso',
'Presenta información del curso, módulos, lecciones, progreso y requisitos.',
'Controla contenido disponible según permisos.', TRUE, 9),

(@DDF_ID, 'PAN-10', 'Lección',
'Presenta texto, videos, imágenes, documentos, actividades y demás recursos educativos.',
'Registra avance y finalización.', TRUE, 10),

(@DDF_ID, 'PAN-11', 'Evaluación',
'Presenta cuestionarios, actividades y mecanismos de evaluación.',
'Puede contener preguntas automáticas y de revisión manual.', TRUE, 11),

(@DDF_ID, 'PAN-12', 'Catálogo de cápsulas',
'Presenta las cápsulas educativas disponibles de acuerdo con el perfil del usuario.',
'Incluye filtros o categorías cuando aplique.', TRUE, 12),

(@DDF_ID, 'PAN-13', 'Detalle de cápsula',
'Muestra el contenido completo de una cápsula educativa.',
'Registra consulta o finalización.', TRUE, 13),

(@DDF_ID, 'PAN-14', 'Avance académico',
'Muestra avance de cursos, cápsulas, evaluaciones y otros indicadores personales.',
'Vista adaptada según rol.', TRUE, 14),

(@DDF_ID, 'PAN-15', 'Certificados',
'Permite consultar y descargar certificados obtenidos.',
'Generación en formato PDF.', TRUE, 15),

(@DDF_ID, 'PAN-16', 'Asistentes y tutores IA',
'Presenta las herramientas de Inteligencia Artificial disponibles según nivel, rol y beneficio.',
'Acceso controlado por permisos.', TRUE, 16),

(@DDF_ID, 'PAN-17', 'Soporte / Peticiones',
'Permite registrar y consultar solicitudes de soporte.',
'Integración con Freshworks cuando corresponda.', FALSE, 17),

(@DDF_ID, 'PAN-18', 'Dashboard administrativo',
'Presenta indicadores generales y accesos a los módulos administrativos.',
'Acceso exclusivo a usuarios autorizados.', TRUE, 18),

(@DDF_ID, 'PAN-19', 'Administración de usuarios',
'Permite buscar, consultar, registrar, editar, activar y desactivar usuarios.',
'Debe soportar filtros y operaciones masivas autorizadas.', TRUE, 19),

(@DDF_ID, 'PAN-20', 'Administración de grupos',
'Permite administrar grupos, responsables e integrantes.',
'Incluye búsqueda y filtros.', FALSE, 20),

(@DDF_ID, 'PAN-21', 'Administración de becas',
'Permite gestionar códigos, beneficios, vigencias y asignaciones.',
'Incluye importación y operaciones masivas.', TRUE, 21),

(@DDF_ID, 'PAN-22', 'Administración académica',
'Permite administrar cursos, módulos, lecciones, evaluaciones y contenidos.',
'Sustituye funcionalmente las operaciones principales realizadas actualmente mediante Sensei LMS.', TRUE, 22),

(@DDF_ID, 'PAN-23', 'Administración de cápsulas',
'Permite crear, editar, importar, publicar y administrar cápsulas educativas.',
'Puede soportar cargas masivas.', FALSE, 23),

(@DDF_ID, 'PAN-24', 'Administración de IA',
'Permite administrar asistentes, tutores, enlaces, configuraciones y recursos relacionados.',
'Acceso administrativo.', FALSE, 24),

(@DDF_ID, 'PAN-25', 'Reportes y estadísticas',
'Permite generar y consultar reportes mediante filtros configurables.',
'Posibilidad de exportación según requerimiento.', TRUE, 25),

(@DDF_ID, 'PAN-26', 'Administración de soporte',
'Permite consultar, asignar y dar seguimiento a las solicitudes recibidas.',
'Vinculación con la mesa interna cuando aplique.', FALSE, 26),

(@DDF_ID, 'PAN-27', 'Importaciones masivas',
'Permite cargar archivos y procesar altas, bajas o actualizaciones masivas.',
'Debe incluir validación previa y resultado del procesamiento.', FALSE, 27);


-- ============================================================
-- TABLAS DE DECISIÓN TD-01 A TD-10
-- ============================================================

INSERT INTO ddf_tablas_decision
(ddf_id, codigo, condiciones, resultado_esperado, observaciones, orden)
VALUES

(@DDF_ID, 'TD-01',
'Usuario activo + credenciales válidas',
'Permitir inicio de sesión.',
'Aplicar controles de seguridad correspondientes.', 1),

(@DDF_ID, 'TD-02',
'Usuario inactivo o bloqueado',
'Denegar acceso.',
'Mostrar mensaje controlado sin revelar información sensible.', 2),

(@DDF_ID, 'TD-03',
'Sesión activa + rol autorizado + beca vigente',
'Permitir acceso al recurso protegido.',
'Registrar actividad cuando corresponda.', 3),

(@DDF_ID, 'TD-04',
'Sesión activa + rol no autorizado',
'Denegar acceso al recurso.',
'No mostrar información restringida.', 4),

(@DDF_ID, 'TD-05',
'Sesión activa + beca vencida o sin beneficio aplicable',
'Restringir contenido asociado al beneficio.',
'Mostrar orientación correspondiente al usuario.', 5),

(@DDF_ID, 'TD-06',
'Código de beca válido + disponible + vigente',
'Activar beneficio y asignar permisos.',
'Registrar activación.', 6),

(@DDF_ID, 'TD-07',
'Código inválido, vencido o sin disponibilidad',
'Rechazar activación.',
'Mostrar motivo general correspondiente.', 7),

(@DDF_ID, 'TD-08',
'Curso secuencial + requisito anterior incompleto',
'Mantener bloqueada la siguiente lección.',
'Informar requisito pendiente.', 8),

(@DDF_ID, 'TD-09',
'Curso completado + evaluaciones aprobadas',
'Habilitar finalización y certificado cuando corresponda.',
'Generar evidencia de cumplimiento.', 9),

(@DDF_ID, 'TD-10',
'Archivo de importación con errores',
'No procesar los registros inválidos y generar reporte.',
'Los registros correctos podrán procesarse según la estrategia aprobada para la importación.', 10);


-- ============================================================
-- VALIDACIONES BASE DERIVADAS DEL FORMATO
-- ============================================================

INSERT INTO ddf_validaciones
(ddf_id, categoria, descripcion, proceso_pantalla, orden)
VALUES

(@DDF_ID, 'CAMPO_OBLIGATORIO',
'Validar que todos los campos definidos como obligatorios contengan información antes de permitir el envío.',
'Formularios generales', 1),

(@DDF_ID, 'FORMATO',
'Validar el formato correcto del correo electrónico.',
'Registro / Perfil / Usuarios', 2),

(@DDF_ID, 'SEGURIDAD',
'Aplicar políticas de contraseña y mecanismos de seguridad definidos por la plataforma.',
'Inicio de sesión / Recuperación de contraseña', 3),

(@DDF_ID, 'UNICIDAD',
'Evitar duplicidad de registros en campos definidos como únicos.',
'Usuarios / Catálogos / Códigos', 4),

(@DDF_ID, 'ARCHIVO',
'Validar tipos, tamaños y extensiones permitidas en archivos cargados.',
'Importaciones / Administración de contenidos', 5),

(@DDF_ID, 'REGLA_ENTRE_CAMPOS',
'Los permisos disponibles deberán corresponder al rol, grupo, beca, membresía y vigencia aplicables.',
'Acceso y autorización', 6),

(@DDF_ID, 'REGLA_ENTRE_CAMPOS',
'Las fechas de término no podrán ser anteriores a las fechas de inicio.',
'Formularios con vigencia', 7),

(@DDF_ID, 'INTEGRIDAD',
'Las asociaciones entre usuario, grupo, beca, curso y contenido deberán mantener integridad y consistencia.',
'Procesos académicos y administrativos', 8);


-- ============================================================
-- REFERENCIAS INICIALES
-- ============================================================

INSERT INTO ddf_referencias
(ddf_id, tipo, nombre, referencia, descripcion)
VALUES

(@DDF_ID,
'FORMATO_SOLICITUD',
'Formato de Solicitud de Proyecto ESIN01',
'Carpeta Actual',
'Documento fuente que alimenta el DDF.'),

(@DDF_ID,
'HISTORIAS_USUARIO',
'Backlog / Historias de Usuario',
NULL,
'Referencia pendiente de definición.'),

(@DDF_ID,
'MOCKUP',
'Mockups Academia CABSA V2',
NULL,
'Los mockups definitivos deberán anexarse al DDF o referenciarse mediante una liga al prototipo aprobado.');


-- ============================================================
-- FIRMAS / VALIDACIÓN FUNCIONAL
-- ============================================================

INSERT INTO ddf_firmas
(ddf_id, nombre, rol_area, tipo, estado, orden)
VALUES

(@DDF_ID, NULL,
'Responsable de Negocio / CABSA SAPI',
'APROBACION',
'PENDIENTE', 1),

(@DDF_ID, NULL,
'Estrategias e Innovación',
'REVISION',
'PENDIENTE', 2),

(@DDF_ID, NULL,
'Responsable de TI',
'REVISION_TECNICA',
'PENDIENTE', 3),

(@DDF_ID, NULL,
'Analista / Líder del proyecto',
'REVISION_FUNCIONAL',
'PENDIENTE', 4);


-- ============================================================
-- REGISTRO INICIAL EN BITÁCORA
-- ============================================================

INSERT INTO ddf_bitacora
(ddf_id, usuario_referencia, accion, descripcion)
VALUES
(
    @DDF_ID,
    'Sistema',
    'CREACION_DDF',
    'Creación inicial del Documento de Definición Funcional ESIN01 - Academia CABSA V2.'
);


SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- CONSULTAS DE COMPROBACIÓN
-- ============================================================

-- Ver documento principal
SELECT *
FROM ddf_documentos
WHERE proyecto_codigo = 'ESIN01';

-- Ver las 27 pantallas
SELECT
    codigo,
    nombre_ubicacion,
    descripcion_funcional,
    notas_mockup,
    prioridad_mockup
FROM ddf_pantallas
WHERE ddf_id = @DDF_ID
ORDER BY orden;

-- Ver las tablas de decisión
SELECT
    codigo,
    condiciones,
    resultado_esperado,
    observaciones
FROM ddf_tablas_decision
WHERE ddf_id = @DDF_ID
ORDER BY orden;

-- Resumen de información del DDF
SELECT
    d.proyecto_codigo,
    d.nombre_proyecto,
    d.version,
    d.estado,

    (SELECT COUNT(*)
     FROM ddf_pantallas p
     WHERE p.ddf_id = d.id) AS total_pantallas,

    (SELECT COUNT(*)
     FROM ddf_historias_usuario hu
     WHERE hu.ddf_id = d.id) AS total_historias_usuario,

    (SELECT COUNT(*)
     FROM ddf_reglas_negocio rn
     WHERE rn.ddf_id = d.id) AS total_reglas_negocio,

    (SELECT COUNT(*)
     FROM ddf_tablas_decision td
     WHERE td.ddf_id = d.id) AS total_tablas_decision,

    (SELECT COUNT(*)
     FROM ddf_uat u
     WHERE u.ddf_id = d.id) AS total_casos_uat

FROM ddf_documentos d
WHERE d.proyecto_codigo = 'ESIN01';
