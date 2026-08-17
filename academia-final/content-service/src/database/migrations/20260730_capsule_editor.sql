-- Soporte para la edición integral de cápsulas.
-- LONGTEXT evita truncar cápsulas HTML extensas y las URL amplias admiten
-- portadas firmadas o enlaces con parámetros.

ALTER TABLE contenido_capsulas
  MODIFY COLUMN body LONGTEXT NULL,
  MODIFY COLUMN image VARCHAR(1000) NULL,
  MODIFY COLUMN external_url VARCHAR(1000) NULL;
