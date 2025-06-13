// backend/apis/firms/services/FirmsAuth.js

/**
 * 🔐 FirmsAuth.js
 *
 * Responsável pelo gerenciamento e carregamento de variáveis de ambiente sensíveis
 * utilizadas para autenticação em serviços externos (ex: credenciais de APIs da FIRMS).
 * 
 * Utiliza o pacote `dotenv` para garantir que as configurações sensíveis estejam disponíveis
 * a partir de um arquivo `.env` durante o processo de execução.
 */

// Importa o pacote dotenv para gerenciamento de variáveis de ambiente
import dotenv from 'dotenv';

// Carrega as variáveis definidas no arquivo .env para o process.env
dotenv.config();

/**
 * 🔑 getFirmsApiKey
 *
 * Recupera a chave de API FIRMS definida na variável de ambiente `FIRMS_API_KEY`.
 * Essa chave é obrigatória para autenticação em todas as requisições à API FIRMS.
 *
 * @returns {string} Chave de API FIRMS
 * @throws {Error} Se a variável de ambiente FIRMS_API_KEY não estiver definida
 *
 * @example
 * const apiKey = getFirmsApiKey();
 * // => 'abcdef123456...'
 */
export function getFirmsApiKey() {
  // eslint-disable-next-line no-undef
  const key = process.env.FIRMS_API_KEY
  if (!key) {
    throw new Error('FIRMS_API_KEY não definida no .env')
  }
  return key
}
