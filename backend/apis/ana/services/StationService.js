// FILE: backend/apis/ana/services/StationService.js

import { loadStationInventory } from './AnaFetcher.js';

export default class StationService {
  static async listAllStations() {
    const stations = await loadStationInventory();
    return stations;
  }

  static async listByUf(uf) {
    const stations = await loadStationInventory();
    return stations.filter(est => est.uf?.toLowerCase() === uf.toLowerCase());
  }
}
