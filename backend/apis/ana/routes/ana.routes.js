// backend/apis/ana/routes/ana.routes.js

import { Router } from 'express';
import { AnaController } from '#ana_controllers/AnaController.js';

const router = Router();

router.get('/stations/data', AnaController.getAllStationData);

export default router;
