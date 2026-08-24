-- Posición configurable de la portada en el detalle de una entrada del blog.
-- Las publicaciones existentes mantienen el diseño histórico hasta editarse.
ALTER TABLE contenido_capsulas
  ADD COLUMN image_position ENUM('top','bottom') NOT NULL DEFAULT 'top' AFTER image;
