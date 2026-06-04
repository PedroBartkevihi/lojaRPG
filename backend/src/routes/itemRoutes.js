import { Router } from 'express';
import * as controller from '../controllers/itemController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';

export const itemRoutes = Router();

itemRoutes.use(authenticate);
itemRoutes.get('/', controller.index);
itemRoutes.get('/:id', controller.show);
itemRoutes.post('/', requireGameMaster, controller.create);
itemRoutes.put('/:id', requireGameMaster, controller.update);
itemRoutes.delete('/:id', requireGameMaster, controller.remove);
