import { Router } from 'express';
import * as controller from '../controllers/characterController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';

export const characterRoutes = Router();

characterRoutes.use(authenticate);
characterRoutes.get('/', requireGameMaster, controller.index);
characterRoutes.get('/me', controller.me);
characterRoutes.post('/', controller.create);
characterRoutes.put('/:id', controller.update);
characterRoutes.patch('/:id/gold', requireGameMaster, controller.changeGold);
