-- Ejecutar una sola vez en la base usada por users-service.
-- Después debe reiniciarse users-service.
ALTER TABLE usuarios_niveles_membresia
  ADD COLUMN presentation_config LONGTEXT NULL AFTER description;
