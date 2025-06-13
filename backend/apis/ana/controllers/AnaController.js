// FILE: backend/apis/ana/controllers/AnaController.js

import { fetchAllStationsInBatches } from '#ana_services/hidrowebFetchBatch.js';

export class AnaController {
  static async getAllStationData(req, res, next) {
    try {
      const resultados = await fetchAllStationsInBatches();

      // Envia o retorno direto, sem embrulhar com status: 'OK'
      res.json(resultados);
    } catch (error) {
      next(error);
    }
  }
}
