// FILE: backend/apis/ana/services/AnaFetcher.js

import fs from 'fs/promises';
import path from 'path';

export async function loadStationInventory() {
  const filePath = path.resolve('data', 'inventario_estacoes.json');
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}
