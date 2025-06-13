// backend/apis/firms/routes/index.js
import { debugLog } from "#backend_utils/debugLog.js";

/**
 * 🚏 Router
 *
 * Roteador principal do Express para montagem dos sub-rotas do módulo FIRMS.
 */
import { Router } from 'express';

/**
 * 🔥 fireRoutes
 *
 * Sub-rotas dos endpoints relacionados a focos de queimada.
 */
import fireRoutes from './fireRoutes.js';

/**
 * Firms API Router
 * ----------------
 * Roteador principal para todas as rotas de focos de queimada.
 * Prefixo base: /firms
 *
 * Sub-rotas:
 *  - /fires  (fireRoutes)
 */

/**
 * 🛤️ Instancia o roteador principal do Express para o módulo FIRMS.
 */
const router = Router();

/**
 * 🔗 Todas as requisições para /firms/fires serão tratadas pelo sub-roteador fireRoutes.
 */
router.use('/fires', fireRoutes);

debugLog('Registrando subrotas FIRMS', {
  modulo: 'firms',
  path: '/fires',
  origem: 'routes/index.js'
});


/**
 * 🚀 Exporta o roteador configurado para ser utilizado pelo app principal.
 */
export default router;
