// apis/shared/cache/indicadores/IndicadoresCache.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

class IndicadoresCache {
    constructor(customDbPath = null) {
        this.dbPath = customDbPath || path.join(
            // eslint-disable-next-line no-undef
            process.cwd(),
            'apis',
            'shared',
            'cache',
            'indicadoresMetricos',
            'indicadores.db'
        );
        this.ready = this.init();
    }

    async init() {
        await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });
        this.db = await open({ filename: this.dbPath, driver: sqlite3.Database });
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS indicadores (
                dataColeta         TEXT PRIMARY KEY,
                dia                TEXT,
                hora               TEXT,
                totalFocos         INTEGER,
                frpMedio           REAL,
                temperaturaMedia   REAL,
                totalFocosMax      INTEGER,
                totalFocosMin      INTEGER,
                temperaturaMax     REAL,
                temperaturaMin     REAL,
                frpMax             REAL,
                frpMin             REAL,
                criadoEm           INTEGER
            );
        `);
    }

    // CRUD BÁSICO
    async set(data) {
        await this.ready;

        // Validação básica
        if (!data || !data.dataColeta) throw new Error('dataColeta é obrigatório!');
        const dia = data.dia || data.dataColeta.split('T')[0];
        const hora = data.hora || (data.dataColeta.split('T')[1] ? data.dataColeta.split('T')[1].slice(0, 5) : null);

        await this.db.run(
            `INSERT OR REPLACE INTO indicadores 
                (dataColeta, dia, hora, totalFocos, frpMedio, temperaturaMedia, totalFocosMax, totalFocosMin,
                 temperaturaMax, temperaturaMin, frpMax, frpMin, criadoEm)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.dataColeta,
                dia,
                hora,
                data.totalFocos ?? null,
                data.frpMedio ?? null,
                data.temperaturaMedia ?? null,
                data.totalFocosMax ?? null,
                data.totalFocosMin ?? null,
                data.temperaturaMax ?? null,
                data.temperaturaMin ?? null,
                data.frpMax ?? null,
                data.frpMin ?? null,
                data.criadoEm ?? Date.now()
            ]
        );
    }

    async get(dataColeta) {
        await this.ready;
        const row = await this.db.get(
            `SELECT * FROM indicadores WHERE dataColeta = ?`,
            [dataColeta]
        );
        return row || null;
    }

    async listarTodos() {
        await this.ready;
        return await this.db.all(
            `SELECT * FROM indicadores ORDER BY dataColeta DESC`
        );
    }

    async limparTodos() {
        await this.ready;
        await this.db.run('DELETE FROM indicadores');
    }


    // CONSULTA SIMPLES
    // async getMaisRecente() { }
    // async getPrimeiro() { }
    // async getPorDia(dia) { }
    // async getPorPeriodo(inicio, fim) { }

    // MÁXIMOS/MÍNIMOS
    // async getDiaComMaisFocos() { }     
    // Dia com maior totalFocos
    // async getDiaComMenosFocos() { }
    // async getHoraComMaisFocos(dia) { }  
    // Hora específica com mais focos
    // async getHoraComMenosFocos(dia) { }

    // async getMaiorTemperatura() { }
    // async getMenorTemperatura() { }

    // async getMaiorFrp() { }
    // async getMenorFrp() { }

    // AGREGADOS E MÉDIAS
    // async getMediaPorDia() { }
    // async getMediaPorPeriodo(inicio, fim) { }

    // TENDÊNCIAS E DELTAS
    // async getTrendUltimosNDias(n = 7) { }
    // async getDeltaEntrePeriodos(inicio1, fim1, inicio2, fim2) { }

    // RANKINGS
    // async rankDiasPorFocos(topN = 5) { }
    // async rankHorasPorFocos(dia, topN = 5) { }

    // OUTROS INSIGHTS
    // async getDiasComFocosZero() { }
    // async getSequenciaDiasEmAlta(quantidade = 3) { } 
    // dias seguidos de alta

    // UTILIDADES
    // formatDiaFromISO(dataColetaISO) { }
    // isValidRegistro(row) { }

}

export { IndicadoresCache }; // Exporta a classe