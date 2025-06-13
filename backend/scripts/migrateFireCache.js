import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Caminho correto baseado na localização real do banco de dados
const dbPath = path.join(__dirname, '..', 'apis', 'shared', 'cache', 'fires', 'firecache.db')

const migrate = async () => {
  try {
    const db = await open({ filename: dbPath, driver: sqlite3.Database })

    // Verifica se a tabela antiga existe
    const check = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='fires';`)
    if (!check) {
      console.log('⚠️ Tabela "fires" não encontrada. Nada para migrar.')
      return
    }

    // Etapa 1: Renomeia a tabela atual para manter backup
    await db.exec(`ALTER TABLE fires RENAME TO fires_old;`)
    console.log('🔁 Tabela original renomeada para "fires_old".')

    // Etapa 2: Cria nova tabela com suporte a múltiplas entradas por key
    await db.exec(`
      CREATE TABLE fires (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        key           TEXT,
        data          TEXT,
        created_at    INTEGER,
        last_fetched  TEXT
      );
    `)
    console.log('🆕 Nova tabela "fires" criada com suporte a histórico.')

    // Etapa 3: Copia os dados do backup
    await db.exec(`
      INSERT INTO fires (key, data, created_at, last_fetched)
      SELECT key, data, created_at, last_fetched FROM fires_old;
    `)
    console.log('📥 Dados migrados da tabela antiga para a nova.')

    // Etapa 4: (opcional) manter o backup
    // await db.exec(`DROP TABLE fires_old;`)
    console.log('✅ Migração concluída com sucesso (backup mantido como "fires_old").')

  } catch (err) {
    console.error('❌ Erro durante a migração:', err.message)
  }
}

migrate()
