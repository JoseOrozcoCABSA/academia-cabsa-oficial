import { ResourcesController } from './resources.controller.js';
import { ResourcesRepository } from '#repositories/resources.repository';
import { ResourcesService } from '#services/resources.service';

const controllerFor = (resource: string) => new ResourcesController(
  new ResourcesService(new ResourcesRepository(resource)), resource,
);

export const forumsController = controllerFor('academia_foros');
export const topicsController = controllerFor('academia_foro_temas');
export const repliesController = controllerFor('academia_foro_respuestas');
