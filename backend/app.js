import express from 'express';
import cors from 'cors';
import firmsRoutes from '#firms_routes';
import anaRoutes from '#ana_routes';

import { debugLog } from '#backend_utils/debugLog.js';

const app = express();
app.use(cors());
app.use(express.json());

// Log de montagem do módulo FIRMS
debugLog('Montando módulo FIRMS na API', {
  base: '/api/firms',
  origem: 'app.js'
});

app.use('/api/firms', firmsRoutes);

// Log de montagem do módulo ANA
debugLog('Montando módulo ANA na API', {
  base: '/api/ana',
  origem: 'app.js'
});

app.use('/api/ana', anaRoutes); // 🔹 novo endpoint

export default app;
