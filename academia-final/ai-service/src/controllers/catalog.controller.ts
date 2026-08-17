import type { Request, Response } from 'express';
import CabsaAsistentesTutores from '#models/CabsaAsistentesTutores';
import { ok } from '#utils/response';

/**
 * Catálogo público y de sólo lectura de los enlaces externos que aparecen en
 * las páginas de asistentes y tutores. No expone datos administrativos.
 */
export const assistantTutorLinks = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  const rows = await CabsaAsistentesTutores.findAll({
    attributes: ['id', 'slug', 'numero', 'gpt_url', 'gem_url', 'media_id', 'updated_at'],
    order: [['slug', 'ASC'], ['numero', 'ASC']],
    raw: true,
  });
  ok(response, rows);
};

