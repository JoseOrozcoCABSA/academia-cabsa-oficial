/**
 * @file Rutas del CRUD generico: `/resources` y la familia `/data/:resource`.
 *
 * El orden de declaracion importa. `/data/:resource/record` va antes de
 * `/data/:resource/:id` porque, si no, Express casaria «record» como si fuera
 * un id y la busqueda por claves compuestas dejaria de funcionar.
 *
 * `PATCH` y `PUT` apuntan al mismo manejador: aqui no hay diferencia semantica
 * entre actualizacion parcial y total.
 *
 * Todo el router exige JWT y uno de los roles administrativos admitidos.
 *
 * @see controllers/resources.controller.ts Contrato de cada manejador.
 */

import { Router } from 'express';
import controller from '#controllers/resources.controller';
import authMiddleware from '#middlewares/auth.middleware';
import { allowRoles } from '#middlewares/role.middleware';

/** Router de la entidad; se monta en `app.ts`. */
const router = Router();
const allowAdministrativeRoles = allowRoles(
  'ADMIN',
  'SUPER_ADMIN',
  'administrator',
);

router.get(
  '/resources',
  authMiddleware,
  allowAdministrativeRoles,
  controller.catalog,
);
router.use('/data', authMiddleware, allowAdministrativeRoles);
router.get('/data/:resource/record', controller.findOne);
router.get('/data/:resource/:id', controller.findById);
router.get('/data/:resource', controller.list);
router.post('/data/:resource', controller.create);
router.patch('/data/:resource/:id', controller.updateById);
router.put('/data/:resource/:id', controller.updateById);
router.patch('/data/:resource', controller.update);
router.put('/data/:resource', controller.update);
router.delete('/data/:resource/:id', controller.removeById);
router.delete('/data/:resource', controller.remove);

/** Router listo para montar. */
export default router;
