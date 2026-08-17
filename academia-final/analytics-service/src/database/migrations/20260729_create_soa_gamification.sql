CREATE TABLE IF NOT EXISTS `analitica_progreso_capsulas` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `capsule_id` bigint unsigned NOT NULL,
  `semaphore_status` enum('GREEN','YELLOW','RED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `progress_percent` decimal(5,2) NOT NULL DEFAULT '100.00',
  `completed_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `soa_capsule_progress_user_capsule` (`user_id`,`capsule_id`),
  KEY `soa_capsule_progress_capsule_id` (`capsule_id`),
  KEY `soa_capsule_progress_semaphore_status` (`semaphore_status`),
  CONSTRAINT `soa_capsule_progress_capsule_fk`
    FOREIGN KEY (`capsule_id`) REFERENCES `contenido_capsulas` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `analitica_actividad_aprendizaje` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `activity_date` date NOT NULL,
  `capsule_completions` int unsigned NOT NULL DEFAULT '0',
  `lesson_completions` int unsigned NOT NULL DEFAULT '0',
  `last_activity_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `soa_learning_activity_days_user_date` (`user_id`,`activity_date`),
  KEY `soa_learning_activity_days_activity_date` (`activity_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
