// backend/apis/shared/cache/locations/LocationCache.js

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { debugLog } from '#backend_utils/debugLog.js';

class LocationCache {
  // === INIT & CORE ===
  constructor() {

    this.dbPath = path.join(process.cwd(), 'apis', 'shared', 'cache', 'locations', 'geocache.db');
    this.db = null;
    this.ready = this.initDb();
  }

  async initDb() {
    try {
      await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });
      this.db = await open({ filename: this.dbPath, driver: sqlite3.Database });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS locations (
          latitude TEXT NOT NULL,
          longitude TEXT NOT NULL,
          cidade TEXT,
          estado TEXT,
          pais TEXT,
          bairro TEXT,
          cep TEXT,
          endereco TEXT,
          tipo TEXT,
          outros_dados TEXT,
          created_at INTEGER,
          PRIMARY KEY (latitude, longitude)
        );
      `);

      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_city_state ON locations (cidade, estado);
      `);

      debugLog('Location Cache inicializado', {
        status: 'OK',
        banco: this.dbPath,
        tabela: 'locations',
        indice: 'idx_city_state',
        origem: 'LocationCache.initDb'
      });
    } catch (error) {
      debugLog('Erro ao inicializar Location Cache', {
        status: 'ERRO',
        mensagem: error.message,
        stack: error.stack,
        banco: this.dbPath,
        origem: 'LocationCache.initDb'
      });

      throw error;
    }
  }

  formatCoord(value) {
    // Padronize para 5 casas para evitar duplicatas
    return Number(value).toFixed(5);
  }

  // === GETTERS ===
  async get(latitude, longitude) {
    const row = await this._tryGet(latitude, longitude);
    if (!row) return null;
    return this._parseRow(row);
  }

  async _tryGet(latitude, longitude) {
    try {
      await this.ready;
      const lat = this.formatCoord(latitude);
      const lon = this.formatCoord(longitude);
      return await this.db.get(
        'SELECT * FROM locations WHERE latitude = ? AND longitude = ?',
        [lat, lon]
      );
    } catch (error) {
      console.error('❌ Erro ao buscar localização do cache:', error.message);
      return null;
    }
  }

  _parseRow(row) {
    if (!row) return row;
    return this._parseOutrosDados(row);
  }

  _parseOutrosDados(row) {
    if (row.outros_dados) row.outros_dados = JSON.parse(row.outros_dados);
    return row;
  }

  // === SETTERS ===
  async set(data) {
    await this.ready;
    const { lat, lon } = this._prepareInsertData(data);

    if (!this._validateCoords(lat, lon, data)) return;
    await this._tryInsertLocation({ ...this._prepareInsertData(data), lat, lon });
  }

  async _tryInsertLocation(dataObj) {
    try {
      await this._insertLocation(dataObj);
    } catch (error) {
      console.error('❌ Erro ao salvar localização no cache:', error.message);
    }
  }

  async _insertLocation(dataObj) {
    await this.db.run(
      `INSERT OR REPLACE INTO locations 
        (latitude, longitude, cidade, estado, pais, bairro, cep, endereco, tipo, outros_dados, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dataObj.lat,
        dataObj.lon,
        dataObj.cidade,
        dataObj.estado,
        dataObj.pais,
        dataObj.bairro,
        dataObj.cep,
        dataObj.endereco,
        dataObj.tipo,
        dataObj.outros_dados,
        dataObj.created_at
      ]
    );
  }

  _prepareInsertData(data) {
    return {
      lat: this.formatCoord(data.latitude),
      lon: this.formatCoord(data.longitude),
      cidade: this._getOrNull(data.cidade),
      estado: this._getOrNull(data.estado),
      pais: this._getOrNull(data.pais),
      bairro: this._getOrNull(data.bairro),
      cep: this._getOrNull(data.cep),
      endereco: this._getOrNull(data.endereco),
      tipo: this._getOrNull(data.tipo),
      outros_dados: this._getOutrosDados(data.outros_dados),
      created_at: Date.now()
    };
  }

  _getOrNull(value) {
    return value || null;
  }

  _getOutrosDados(value) {
    return value ? JSON.stringify(value) : null;
  }

  // === VALIDATION HELPERS ===
  _isValidCoord(value) {
    const n = Number(value);
    return Number.isFinite(n) && !isNaN(n);
  }

  _validateLatitude(lat, data) {
    if (!this._isValidCoord(lat)) {
      console.warn('Tentativa de salvar localização inválida (latitude):', data);
      return false;
    }
    return true;
  }

  _validateLongitude(lon, data) {
    if (!this._isValidCoord(lon)) {
      console.warn('Tentativa de salvar localização inválida (longitude):', data);
      return false;
    }
    return true;
  }

  _validateCoords(lat, lon, data) {
    return this._validateLatitude(lat, data) && this._validateLongitude(lon, data);
  }

  // === REMOVER / LIMPAR / LISTAR ===
  async delete(latitude, longitude) {
    try {
      await this.ready;
      const lat = this.formatCoord(latitude);
      const lon = this.formatCoord(longitude);
      await this.db.run(
        'DELETE FROM locations WHERE latitude = ? AND longitude = ?',
        [lat, lon]
      );
    } catch (error) {
      console.error('❌ Erro ao deletar localização do cache:', error.message);
    }
  }

  async listarTodos() {
    await this.ready;
    const rows = await this.db.all('SELECT * FROM locations ORDER BY created_at DESC');
    return rows.map(row => {
      if (row.outros_dados) row.outros_dados = JSON.parse(row.outros_dados);
      return row;
    });
  }

  async limparTodos() {
    await this.ready;
    await this.db.run('DELETE FROM locations');
  }

  // === CONSULTAS ESPECIAIS ===
  async getByCityState(cidade, estado) {
    await this.ready;
    return await this.db.all(
      'SELECT * FROM locations WHERE cidade = ? AND estado = ?',
      [cidade, estado]
    );
  }

  async forceExpire() {
    await this.ready;
    await this.db.run('UPDATE locations SET created_at = created_at - ?', [365 * 24 * 60 * 60 * 1000 + 1]);
  }
}

// export default new LocationCache(); // VERSÃO ANTES DOS TESTES

let instance = null;

if (process.env.NODE_ENV !== 'test') {
  instance = new LocationCache();
}

// 🔁 Exporta a instância como default (como já era)
export default instance;

