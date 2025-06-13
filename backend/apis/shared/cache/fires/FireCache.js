// apis/shared/cache/fires/FireCache.js

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';

import { FireModel } from '#firms_models';

class FireCache {
  constructor() {
    this.dbPath = path.join(
      // eslint-disable-next-line no-undef
      process.cwd(),
      'apis', 'shared', 'cache', 'fires', 'firecache.db'
    );
    this.db = null;
    this.ready = this.initDb();
  }

  async initDb() {
    await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // CORRIGIR PARA FOCOS CALOR  
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS focos_queimada (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude                 REAL,
        longitude                REAL,
        dataAquisicao            TEXT,
        horaAquisicao            TEXT,
        temperaturaBrilho        REAL,
        temperaturaBrilhoSecundaria REAL,
        resolucaoVarredura       REAL,
        resolucaoTrilha          REAL,
        potenciaRadiativa        REAL,
        nomeSatelite             TEXT,
        instrumentoSensor        TEXT,
        nivelConfianca           TEXT,
        versaoProduto            TEXT,
        indicadorDiaNoite        TEXT,
        fonte                   TEXT,
        cache_key                TEXT,
        criado_em                INTEGER
      );
    `);
  }

  // CRUD BÁSICO

  /**
   * Insere um ou mais focos no cache (sempre normalizado).
   * @param {Array|Object} fires Um array de objetos brutos ou um único objeto de foco bruto
   * @param {Object} [options] (opcional) Opções para gerar cache_key, etc
   */
  async insert(fires, options = {}) {
    await this.ready;
    const focosBrutos = Array.isArray(fires) ? fires : [fires];
    // 🔄 Sempre normaliza antes de persistir!
    const focos = focosBrutos
      .map(FireModel.safeFromCsvRecord)
      .filter(Boolean)
      .map(fire => ({
        latitude: fire.latitude,
        longitude: fire.longitude,
        acquisitionDate: fire.dataAquisicao,
        acquisitionTime: fire.horaAquisicao,
        brightnessTemp: fire.temperaturaBrilho,
        brightnessTempSecondary: fire.temperaturaBrilhoSecundaria,
        scanResolution: fire.resolucaoVarredura,
        trackResolution: fire.resolucaoTrilha,
        fireRadiativePower: fire.potenciaRadiativa,
        satelliteName: fire.nomeSatelite,
        sensorInstrument: fire.instrumentoSensor,
        confidenceLevel: fire.nivelConfianca,
        productVersion: fire.versaoProduto,
        dayNightIndicator: fire.indicadorDiaNoite,
        source: fire.source ?? null // se existir no original
      }));

    const cache_key = options.cache_key || null;
    const now = Date.now();

    const stmt = await this.db.prepare(`
      INSERT INTO focos_queimada (
        latitude, longitude, dataAquisicao, horaAquisicao,
        temperaturaBrilho, temperaturaBrilhoSecundaria, resolucaoVarredura, resolucaoTrilha,
        potenciaRadiativa, nomeSatelite, instrumentoSensor, nivelConfianca,
        versaoProduto, indicadorDiaNoite, fonte, cache_key, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const foco of focos) {
        await stmt.run(
          foco.latitude,                         // latitude
          foco.longitude,                        // longitude
          foco.acquisitionDate,                  // dataAquisicao
          foco.acquisitionTime,                  // horaAquisicao
          foco.brightnessTemp,                   // temperaturaBrilho
          foco.brightnessTempSecondary,          // temperaturaBrilhoSecundaria
          foco.scanResolution,                   // resolucaoVarredura
          foco.trackResolution,                  // resolucaoTrilha
          foco.fireRadiativePower,               // potenciaRadiativa
          foco.satelliteName,                    // nomeSatelite
          foco.sensorInstrument,                 // instrumentoSensor
          foco.confidenceLevel,                  // nivelConfianca
          foco.productVersion,                   // versaoProduto
          foco.dayNightIndicator,                // indicadorDiaNoite
          foco.source,                           // fonte
          cache_key,                             // cache_key
          now                                    // criado_em
        );
      }
    } finally {
      await stmt.finalize();
    }
  }

  async listarTodos() {
    await this.ready;
    // Busca todos os focos já no padrão PT-BR, ordenados por data/hora
    const rows = await this.db.all('SELECT * FROM focos_queimada ORDER BY dataAquisicao DESC, horaAquisicao DESC');
    return rows; // Retorna direto, sem mapToFire
  }

  async find(filters = {}) {
    await this.ready;
    const clauses = [];
    const params = [];
    for (const [key, value] of Object.entries(filters)) {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM focos_queimada ${where} ORDER BY dataAquisicao DESC, horaAquisicao DESC`;
    const rows = await this.db.all(sql, params);
    return Array.isArray(rows) ? rows : [];
  }

  // ...restante igual ao seu código anterior (find, limparTodos, deleteBy, métodos de insight)


  async limparTodos() { /* ... */ }
  async deleteBy(filters = {}) { /* ... */ }
  async getBasicStats(filters = {}) { /* ... */ }
  async getTopCidades({ limit = 10, start, end }) { /* ... */ }
  async getDailyTimeSeries({ start, end }) { /* ... */ }
  async getHourDistribution({ acq_date }) { /* ... */ }
  async getStatsBySensor({ start, end }) { /* ... */ }
}

export default new FireCache();
