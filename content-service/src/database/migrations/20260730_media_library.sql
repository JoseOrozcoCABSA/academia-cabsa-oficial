CREATE TABLE IF NOT EXISTS contenido_archivos (
  id CHAR(36) NOT NULL,
  type ENUM('IMAGE','VIDEO','DOCUMENT') NOT NULL,
  title VARCHAR(255) NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  duration_seconds INT UNSIGNED NULL,
  alt_text VARCHAR(500) NULL,
  status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  variants JSON NULL,
  metadata JSON NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contenido_archivos_object_key (object_key),
  KEY idx_contenido_archivos_type_status (type, status),
  KEY idx_contenido_archivos_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contenido_archivos_relaciones (
  id CHAR(36) NOT NULL,
  asset_id CHAR(36) NOT NULL,
  entity_type ENUM('COURSE','LESSON','CAPSULE','MATERIAL') NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  usage_type ENUM('COVER','INLINE','ATTACHMENT') NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contenido_archivo_uso (asset_id, entity_type, entity_id, usage_type),
  KEY idx_contenido_archivos_relacion_entidad (entity_type, entity_id),
  CONSTRAINT fk_contenido_archivos_relaciones_asset
    FOREIGN KEY (asset_id) REFERENCES contenido_archivos(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
