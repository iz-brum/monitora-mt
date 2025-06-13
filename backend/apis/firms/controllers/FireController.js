//FILE_PATH: backend/apis/firms/controllers/FireController.js

/**
 * 🚦 Responsável por receber, validar e encaminhar requisições HTTP relacionadas a focos de calor.
 * Não implementa regras de negócio — apenas orquestra chamadas entre requisições, serviços e respostas.
 */

/**
 * 🕒 dayjs
 *
 * Biblioteca leve para manipulação e formatação de datas e horários, usada para tratar
 * parâmetros temporais das requisições.
 */
import dayjs from 'dayjs';

/**
 * 🔥 FireService
 *
 * Serviço responsável pelas operações principais de busca e manipulação de focos de calor.
 */
import FireService from '#firms_services/FireService.js';

/**
 * 🗺️ MapboxReverseGeocoder
 *
 * Serviço para geocodificação de coordenadas e enriquecimento dos dados de focos com informações de localização.
 */
import MapboxReverseGeocoder from '#mapbox_services/MapboxReverseGeocoder .js';

/**
 * 📈 FireStatsService
 *
 * Serviço responsável por cálculos e agregações estatísticas dos focos de calor.
 */
import FireStatsService from '#firms_services/FireStatsService.js';

import { calculateFireRadiativePowerMetrics } from '#firms_services/stats/frp.js';
import { aggregateBrightnessTemperatureData } from '#firms_services/stats/temperatures.js';

import { validateDateRange, DATE_CONFIG } from '#firms_utils/dateValidation.js';

import { debugLog, debugJsonLog } from "#backend_utils/debugLog.js";

import { CacheCore } from '#firms_utils/CacheCore.js';

const { fireStatsCache, gerarChaveFireStats, isAtivo: isCacheAtivo } = CacheCore;

CacheCore.desativarCache(); // DESATIVAR CACHE PARA BUSCA DOS DADOS

/**
 * 🔥 FireController
 *
 * Controller principal da API FIRMS, responsável por orquestrar rotas e lógica
 * de focos de calor, incluindo busca, localização, estatísticas e agregações.
 * Todos os métodos estáticos da classe são utilizados diretamente nas rotas Express.
 */
export default class FireController {

  // == Funções Públicas ==

  /**
   * 🔥 getFires
   *
   * Controller para buscar todos os focos de calor formatados e paginados.
   * Responde em JSON os dados vindos do serviço FireService.
   *
   * @param {Request} req - Objeto da requisição Express (query string pode conter filtros/paginação)
   * @param {Response} res - Objeto da resposta Express
   * @param {Function} next - Função de erro Express
   */
  static getFires = (req, res, next) => {
    debugLog('GET /firms/fires', {
      query: req.query,
      origem: 'FireController.getFires'
    });

    FireService.listAllFormattedPaginated(req.query)
      .then(data => res.json(data))
      .catch(next);
  };

  /**
   * 📍 getFireLocations
   *
   * Controller que retorna a lista de focos de calor já enriquecidos com localização geocodificada.
   * Busca os focos, extrai as coordenadas, envia para o serviço de geocodificação em batch
   * e responde com a localização agregada aos dados.
   *
   * @param {Request} req - Objeto da requisição Express (query string pode conter filtros)
   * @param {Response} res - Objeto da resposta Express
   * @param {Function} next - Função de erro Express
   */
  // static getFireLocations = async (req, res, next) => {
  //   try {
  //     // Garante que 'all=true' esteja presente na query
  //     const query = { ...req.query, all: 'true' };

  //     // Busca todos os focos de queimada (não paginado)
  //     const response = await FireService.listAllFormattedPaginated(query);
  //     const { dados: fires, metadados } = response;

  //     // Prepara coordenadas para geocodificação
  //     const coordinates = fires.map(fire => ({
  //       longitude: parseFloat(fire.longitude),
  //       latitude: parseFloat(fire.latitude),
  //       fireData: fire
  //     }));

  //     // Geocodifica as coordenadas
  //     const locations = await MapboxReverseGeocoder.batchGeocode(coordinates);

  //     // Combina os dados e retorna
  //     const responseData = {
  //       metadados,
  //       dados: locations.map(item => ({
  //         ...item.fireData,
  //         localizacao: item.localizacao
  //       }))
  //     };

  //     res.json(responseData);
  //   } catch (error) {
  //     next(error);
  //   }
  // };
  static getFireLocations = async (req, res, next) => {
    try {
      // Garante que 'all=true' esteja presente na query
      const query = { ...req.query, all: 'true' };

      // Busca todos os focos de queimada (não paginado)
      const response = await FireService.listAllFormattedPaginated(query);
      const { dados: fires, metadados } = response;

      // Prepara coordenadas para geocodificação
      const coordinates = fires.map(fire => ({
        longitude: parseFloat(fire.longitude),
        latitude: parseFloat(fire.latitude),
        fireData: fire
      }));

      // Geocodifica as coordenadas
      const locations = await MapboxReverseGeocoder.batchGeocode(coordinates);

      const responseData = {
        metadados: {
          ...metadados,
          parametrosBusca: {
            ...metadados.parametrosBusca,
            limitesConsulta: {
              diasPassados: 10,
              diasFuturos: 0
            }
          }
        },
        dados: locations.map(item => ({
          ...item.fireData,
          localizacao: item.localizacao
        }))
      };

      res.json(responseData);
    } catch (error) {
      // Trata erros específicos da validação de data
      if (error.message?.includes('Data inválida') ||
        error.message?.includes('Range inválido')) {
        return res.status(400).json({
          error: error.message,
          limites: {
            diasPassados: 10,
            diasFuturos: 0
          }
        });
      }
      next(error);
    }
  };

  /**
   * 📊 getFireStats
   *
   * Controller que retorna estatísticas agregadas sobre os focos de calor, além de dados de resumo e data de coleta.
   * Integra informações espaciais, temporais e estatísticas conforme solicitado pelo front-end.
   *
   * @param {Request} req - Objeto da requisição Express (query string pode conter filtros e parâmetros de agregação)
   * @param {Response} res - Objeto da resposta Express
   * @param {Function} next - Função de erro Express
   */
  static getFireStats = async (req, res, next) => {
    try {
      const { q } = req.query;

      // Cria chave composta simples para cache
      const cacheKey = gerarChaveFireStats(req.query);

      // Verifica cache
      if (isCacheAtivo() && fireStatsCache.has(cacheKey)) {
        debugLog('📦 Cache hit (/fires/stats)', {
          chave: cacheKey,
          origem: 'FireController.getFireStats'
        });
        return res.json(fireStatsCache.get(cacheKey));
      }

      // Geração dos dados normalmente
      const { firesWithLocation, metadados } =
        await FireService.listAllWithLocation(req.query);

      const { stats, dadosResumo, dataColeta } =
        FireController.processarDados(q, firesWithLocation, metadados);

      const resposta = FireController.montarResposta(stats, dadosResumo, dataColeta);

      // Armazena no cache
      if (isCacheAtivo()) {
        fireStatsCache.set(cacheKey, resposta);

        debugLog('📦 Cache miss (/fires/stats)', {
          chave: cacheKey,
          origem: 'FireController.getFireStats'
        });
      }


      return res.json(resposta);
    } catch (error) {
      return next(error);
    }
  };

  /**
  * 📈 getWeeklyFireStats
  * 
  * Retorna estatísticas dos últimos 7 dias dos focos de calor.
  * Busca todos os dados sem paginação usando all: true.
  * 
  * @param {Request} req - Requisição Express
  * @param {Response} res - Resposta Express
  * @param {NextFunction} next - Próximo middleware
  */
  static getWeeklyFireStats = async (req, res, next) => {
    try {
      debugLog('GET /firms/fires/weekly-stats', {
        query: req.query,
        origem: 'FireController.getWeeklyFireStats'
      });

      const hoje = dayjs.utc();
      const inicioSemana = hoje.subtract(6, 'day');

      // Verifica se a data está dentro do limite permitido
      if (!validateDateRange(inicioSemana.format('YYYY-MM-DD'))) {
        return res.status(400).json({
          error: 'Data fora do intervalo permitido',
          limites: {
            maxDiasPassados: DATE_CONFIG.MAX_DAYS_IN_PAST,
            maxDiasFuturos: DATE_CONFIG.MAX_DAYS_IN_FUTURE
          }
        });
      }

      const queryParams = {
        dt: inicioSemana.format('YYYY-MM-DD'),
        dr: '7',
        all: true
      };

      const response = await FireService.listAllFormattedPaginated(queryParams);
      if (!response?.dados) {
        return res.status(404).json({
          error: 'Nenhum dado encontrado',
          dadosDiarios: []
        });
      }

      const weeklyStats = FireStatsService.aggregateWeeklyFireStats(response.dados);
      const dadosCompletos = this.#preencherDiasVazios(
        weeklyStats.dadosDiarios,
        inicioSemana.format('YYYY-MM-DD'),
        hoje.format('YYYY-MM-DD')
      );


      debugJsonLog('Weekly Fire Stats - Final', {
        dadosDiarios: { value: dadosCompletos, maxItems: 7 }
      });

      res.json({ dadosDiarios: dadosCompletos });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 📅 #preencherDiasVazios
   * 
   * Helper que garante que todos os dias do período tenham entrada,
   * mesmo que não tenham focos registrados.
   * 
   * @private
   * @param {Array} dadosDiarios - Array com dados existentes
   * @param {string} dataInicio - Data inicial (YYYY-MM-DD)
   * @param {string} dataFim - Data final (YYYY-MM-DD)
   * @returns {Array} Array completo com todos os dias
   */
  static #preencherDiasVazios(dadosDiarios, dataInicio, dataFim) {
    const dadosPorData = dadosDiarios.reduce((acc, dia) => {
      acc[dia.data] = dia.focos;
      return acc;
    }, {});

    const datas = [];
    const dataAtual = new Date(dataInicio);
    const dataLimite = new Date(dataFim);

    while (dataAtual <= dataLimite) {
      const dataFormatada = dataAtual.toISOString().split('T')[0];
      datas.push({
        data: dataFormatada,
        focos: dadosPorData[dataFormatada] || 0
      });
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return datas;
  }

  // == Helpers ==

  /**
   * 🧮 processarDados
   *
   * Pipeline helper que processa os dados dos focos agregando estatísticas, resumo e data de coleta.
   *
   * @param {string} q - Parâmetro de agregação ou consulta
   * @param {Array<Object>} firesWithLocation - Lista de focos já com localização/geocodificação
   * @param {Object} metadados - Metadados dos focos retornados do serviço
   * @returns {{ stats: any, dadosResumo: any, dataColeta: string }}
   */
  static processarDados(q, firesWithLocation, metadados) {
    const stats = FireController.buildStats(q, firesWithLocation, metadados);
    const dadosResumo = FireController.resumirDados(q, stats, metadados);
    const dataColeta = FireController.definirDataColeta(firesWithLocation);
    return { stats, dadosResumo, dataColeta };
  }

  /**
   * 📉 #resumoFrp
   *
   * Retorna um objeto com o campo `frpMedio` caso o parâmetro 'frp' tenha sido solicitado.
   *
   * @private
   * @param {Array<string>} requested - Lista de agregações solicitadas (ex: ['frp', 'tdb'])
   * @param {Object} stats - Estatísticas agregadas já calculadas
   * @returns {Object} Objeto parcial de resumo (pode estar vazio)
   */
  static #resumoFrp(requested, stats) {
    return requested.includes('frp')
      ? { frpMedio: FireController.extrairFrpMedio(stats) }
      : {};
  }

  /**
   * 🌡️ #resumoTdb
   *
   * Retorna um objeto com o campo `temperaturaMedia` caso o parâmetro 'tdb' tenha sido solicitado.
   *
   * @private
   * @param {Array<string>} requested - Lista de agregações solicitadas
   * @param {Object} stats - Estatísticas agregadas já calculadas
   * @returns {Object} Objeto parcial de resumo (pode estar vazio)
   */
  static #resumoTdb(requested, stats) {
    return requested.includes('tdb')
      ? { temperaturaMedia: FireController.extrairTemperaturaMedia(stats) }
      : {};
  }

  /**
   * ⏰ #resumoHorarioPico
   * Adiciona o horário de pico ao resumo, caso solicitado.
   */
  static #resumoHorarioPico(requested, stats) {
    if (!requested.includes('hdp')) return {};

    return {
      horarioPico: this.#extrairHorarioPico(stats),
      quantidadeHorarioPico: this.#extrairQuantidadeHorarioPico(stats)
    };
  }

  /**
   * Verifica se existe o caminho para dados de pico
   */
  static #temCaminhoPico(stats) {
    return Boolean(stats?.horarioDeteccaoPico);
  }

  /**
   * Verifica se o objeto de pico é válido
   */
  static #temPicoValido(stats) {
    return this.#temCaminhoPico(stats) && stats.horarioDeteccaoPico.pico;
  }

  /**
   * Verifica se o objeto de estatísticas contém dados de pico válidos
   */
  static #temDadosDePico(stats) {
    return Boolean(this.#temPicoValido(stats));
  }

  /**
   * Extrai horário de pico dos stats de forma segura
   */
  static #extrairHorarioPico(stats) {
    return this.#temDadosDePico(stats)
      ? stats.horarioDeteccaoPico.pico.hora
      : 'N/A';
  }

  /**
   * Extrai quantidade no horário de pico dos stats
   */
  static #extrairQuantidadeHorarioPico(stats) {
    if (!this.#temDadosDePico(stats)) return 'N/A';
    return stats.horarioDeteccaoPico.pico.quantidade;
  }

  /**
   * Extrai o CRBM com mais focos da lista
   */
  static #extrairCRBMComMaisFocos(lista) {
    return lista.length ? [lista[0]] : 'N/A';
  }

  /**
 * Lista padrão para quando não há comandos regionais
 */
  static #listaVaziaCRBM = [];

  /**
   * Verifica se existe lista de comandos regionais
   */
  static #temListaCRBM(stats) {
    return Boolean(stats?.focosPorComandoRegional);
  }

  /**
   * Extrai lista segura de focos por comando regional
   */
  static #extrairListaCRBM(stats) {
    return this.#temListaCRBM(stats)
      ? stats.focosPorComandoRegional
      : this.#listaVaziaCRBM;
  }

  /**
   * 🏛️ #resumoCrbm
   * Retorna o resumo dos comandos regionais com mais focos
   */
  static #resumoCrbm(requested, stats) {
    if (!requested.includes('crbm')) return {};

    return {
      CRBMComMaisFocos: this.#extrairCRBMComMaisFocos(
        this.#extrairListaCRBM(stats)
      )
    };
  }

  /**
   * 📋 resumirDados
   *
   * Gera um resumo dos dados agregados dos focos, como total, FRP médio e temperatura média.
   *
   * @param {Object} stats - Estatísticas agregadas
   * @param {Object} metadados - Metadados dos focos
   * @returns {{ totalFocos: number, frpMedio: number, temperaturaMedia: number }}
   */
  static resumirDados(queryStr, stats, metadados) {
    const requested = (queryStr || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    return Object.assign(
      { totalFocos: FireController.extrairTotalFocos(metadados) },
      this.#resumoFrp(requested, stats),
      this.#resumoTdb(requested, stats),
      this.#resumoHorarioPico(requested, stats),
      this.#resumoCrbm(requested, stats)
    );
  }

  /**
   * 🔢 extrairTotalFocos
   *
   * Retorna o total de registros de focos a partir dos metadados.
   *
   * @param {Object} metadados - Metadados dos focos
   * @returns {number} Total de focos ou N/A
   */
  static extrairTotalFocos(metadados) {
    return metadados.totalFocos || 'N/A';
  }

  /**
   * 🌡️ extrairTemperaturaMedia
   *
   * Retorna a temperatura média dos focos, caso seja válida; caso contrário, retorna 0.
   *
   * @param {Object} stats - Estatísticas agregadas
   * @returns {number} Temperatura média ou N/A
   */
  static extrairTemperaturaMedia(stats) {
    const val = FireController.calculateAverageTemperature(stats);
    return FireController.#isValidoPositivo(val) ? val : 'N/A';
  }

  static #isValidoPositivo(val) {
    return typeof val === 'number' && val > 0;
  }

  /**
   * 🗓️ definirDataColeta
   *
   * Define a data de coleta dos focos analisando o maior timestamp dos dados.
   * Se não houver dados, retorna a data/hora atual em ISO.
   *
   * @param {Array<Object>} focos - Lista de focos
   * @returns {string} Data de coleta (ISO)
   */
  static definirDataColeta(focos) {
    if (!focos.length) return new Date().toISOString();

    const datas = focos.map(FireController.parsearDataHoraFoco);
    return datas.reduce((a, b) => (a.isAfter(b) ? a : b)).toISOString();
  }

  /**
   * 🕑 parsearDataHoraFoco
   *
   * Constrói um objeto dayjs UTC a partir dos campos de data e hora de um foco.
   *
   * @param {Object} foco - Objeto de foco (deve conter dataAquisicao e horaAquisicao)
   * @returns {dayjs.Dayjs} Objeto dayjs UTC
   */
  static parsearDataHoraFoco(foco) {
    const rawDate = foco.dataAquisicao;
    const rawHora = (foco.horaAquisicao || '0000').padStart(4, '0');
    const horaFormatada = rawHora.replace(/(\d{2})(\d{2})/, '$1:$2');
    return dayjs.utc(`${rawDate}T${horaFormatada}`);
  }

  // == Helpers para Stats ==

  /**
   * 🚦 hasFrp
   *
   * Verifica se o objeto de estatísticas possui a propriedade FRP (Fire Radiative Power).
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se FRP existir
   */
  static hasFrp(stats) {
    return Boolean(stats && stats.FRP);
  }

  /**
   * 🟡 getGeral
   *
   * Retorna o objeto "geral" de FRP, se disponível.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {Object|undefined} Objeto geral de FRP
   */
  static getGeral(stats) {
    return stats.FRP ? stats.FRP.geral : undefined;
  }

  /**
   * 📊 hasGeral
   *
   * Verifica se existe o objeto geral de FRP.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se o geral existir
   */
  static hasGeral(stats) {
    const geral = FireController.getGeral(stats);
    return Boolean(geral);
  }

  /**
   * 🔥 getFrpMedio
   *
   * Retorna o valor de FRP médio do objeto geral, se disponível.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {number|undefined} FRP médio ou undefined
   */
  static getFrpMedio(stats) {
    const geral = FireController.getGeral(stats);
    return geral ? geral.frpMedio : undefined;
  }

  /**
   * 🟢 isFrpMedioValido
   *
   * Verifica se o valor de FRP médio é um número válido.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se o FRP médio for um número
   */
  static isFrpMedioValido(stats) {
    const frpMedio = FireController.getFrpMedio(stats);
    return typeof frpMedio === 'number';
  }

  /**
 * 🔥 extrairFrpMedio
 *
 * Retorna o FRP médio dos stats, caso seja válido; caso contrário, retorna 0.
 *
 * @param {Object} stats - Estatísticas agregadas
 * @returns {number} FRP médio ou N/A
 */
  static extrairFrpMedio(stats) {
    const val = FireController.getFrpMedio(stats);
    return FireController.#isValidoPositivo(val) ? val : 'N/A';
  }

  /** 
   * 📈 hasStats
   *
   * Verifica se o objeto de estatísticas existe.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se stats existir
   */
  static hasStats(stats) {
    return Boolean(stats);
  }

  /**
   * 🌡️ hasTemperaturaDoBrilho
   *
   * Verifica se o objeto de estatísticas possui a propriedade "temperaturaDoBrilho".
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se temperaturaDoBrilho existir
   */
  static hasTemperaturaDoBrilho(stats) {
    return Boolean(stats?.temperaturaDoBrilho);
  }

  /**
   * 🧲 getTemperaturaDoBrilho
   *
   * Retorna o objeto "temperaturaDoBrilho" das estatísticas.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {Object} Objeto temperaturaDoBrilho
   */
  static getTemperaturaDoBrilho(stats) {
    return stats.temperaturaDoBrilho;
  }

  /**
   * 🟤 hasGeralTemperatura
   *
   * Verifica se existe o objeto geral em "temperaturaDoBrilho".
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se brilho.geral existir
   */
  static hasGeralTemperatura(stats) {
    const brilho = FireController.getTemperaturaDoBrilho(stats);
    return Boolean(brilho?.geral);
  }

  /**
   * 🟠 getGeralTemperatura
   *
   * Retorna o objeto geral de temperatura do brilho, se disponível.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {Object|undefined} Objeto geral de temperatura do brilho
   */
  static getGeralTemperatura(stats) {
    const brilho = FireController.getTemperaturaDoBrilho(stats);
    return brilho.geral;
  }

  /**
   * 🌡️ calculateAverageTemperature
   *
   * Retorna a temperatura média do objeto geral de temperatura do brilho, se disponível.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {number|undefined} Temperatura média ou undefined
   */
  static calculateAverageTemperature(stats) {
    const geral = FireController.getGeralTemperatura(stats);
    return geral ? geral.tempMedia : undefined;
  }

  /**
   * 🟢 isTemperaturaMediaValida
   *
   * Verifica se o valor da temperatura média é um número válido.
   *
   * @param {Object} stats - Objeto de estatísticas
   * @returns {boolean} True se temperatura média for número
   */
  static isTemperaturaMediaValida(stats) {
    const tempMedia = FireController.calculateAverageTemperature(stats);
    return typeof tempMedia === 'number';
  }

  // == Helpers de Zerado ==

  /**
   * 🟦 isTotalFocosZerado
   *
   * Verifica se o resumo de dados apresenta total de focos igual a zero.
   *
   * @param {Object} resumo - Resumo dos dados (ex: resultado de resumirDados)
   * @returns {boolean} True se totalFocos for zero
   */
  static isTotalFocosZerado(resumo) {
    return resumo.totalFocos === 0;
  }

  /**
   * 🟨 isFrpMedioZerado
   *
   * Verifica se o resumo apresenta FRP médio igual a zero.
   *
   * @param {Object} resumo - Resumo dos dados
   * @returns {boolean} True se frpMedio for zero
   */
  static isFrpMedioZerado(resumo) {
    return resumo.frpMedio === 0;
  }

  /**
   * 🟥 isTemperaturaMediaZerada
   *
   * Verifica se o resumo apresenta temperatura média igual a zero.
   *
   * @param {Object} resumo - Resumo dos dados
   * @returns {boolean} True se temperaturaMedia for zero
   */
  static isTemperaturaMediaZerada(resumo) {
    return resumo.temperaturaMedia === 0;
  }

  /*
    Uso: combine no controle de fluxo conforme a necessidade
      if(
        FireController.isTotalFocosZerado(resumo) &&
        FireController.isFrpMedioZerado(resumo) &&
        FireController.isTemperaturaMediaZerada(resumo)
    ) {
      // TODOS ZERADOS
    }
  */

  // == Helpers de Resposta ==

  /**
   * 📦 montarResposta
   *
   * Monta o objeto de resposta final da API, agregando estatísticas, resumo e timestamp da coleta.
   *
   * @param {Object} stats - Estatísticas agregadas dos focos de calor
   * @param {Object} resumo - Resumo dos dados (total, médias, etc)
   * @param {string} coleta - Timestamp da coleta dos dados (formato ISO)
   * @returns {Object} Objeto de resposta formatado para a API
   */
  static montarResposta(stats, resumo, coleta) {
    return {
      ...stats,
      resumo: {
        atual: {
          ...resumo,
          timeStampColetaMaisRecente: coleta
        }
      }
    };
  }

  // == Helpers de Localização e Estatísticas ==

  /**
   * 📍 prepareFiresWithLocation
   *
   * Busca os focos formatados, geocodifica em lote suas coordenadas, e retorna os focos já enriquecidos
   * com o campo de localização (ex: município, estado, etc), além dos metadados.
   *
   * @param {Object} query - Parâmetros de consulta (ex: filtros, datas)
   * @returns {Promise<{ firesWithLocation: Array<Object>, metadados: Object }>}
   */
  static prepareFiresWithLocation = async (query) => {
    const response = await FireService.listAllFormatted(query);
    const { dados: fires, metadados } = response;

    const coordinates = fires.map(fire => ({
      longitude: parseFloat(fire.longitude),
      latitude: parseFloat(fire.latitude),
      fireData: fire
    }));

    const locations = await MapboxReverseGeocoder.batchGeocode(coordinates);

    const firesWithLocation = locations.map(item => ({
      ...item.fireData,
      localizacao: item.localizacao
    }));

    return { firesWithLocation, metadados };
  };

  /**
   * 📊 buildStats
   *
   * Constrói um objeto de estatísticas agregadas com base nos focos com localização,
   * a partir dos parâmetros de consulta (ex: "frp,tdb").
   *
   * - fpc: Focos por cidade
   * - frp: Fire Radiative Power (potência radiativa do fogo)
   * - tdb: Temperatura do brilho
   *
   * @param {string} query - String de queries separadas por vírgula (ex: 'frp,tdb')
   * @param {Array<Object>} firesWithLocation - Lista de focos já geocodificados
   * @param {Object} metadados - Metadados originais dos focos
   * @returns {Object} Objeto de estatísticas agregadas (stats)
   */
  static buildStats = (query, firesWithLocation, metadados) => {
    const stats = { metadados };
    const queries = (query || '').split(',').map(q => q.trim().toLowerCase());

    // Mapeamento de funções para cada tipo de estatística
    const statsHandlers = {
      fpc: () => ({ focosPorCidade: FireStatsService.aggregateAndRankMunicipalityFireStats(firesWithLocation) }),
      frp: () => ({ FRP: calculateFireRadiativePowerMetrics(firesWithLocation) }),
      tdb: () => ({ temperaturaDoBrilho: aggregateBrightnessTemperatureData(firesWithLocation) }),
      hdp: () => ({ horarioDeteccaoPico: FireStatsService.analyzeTemporalDistribution(firesWithLocation) }),
      crbm: () => ({ focosPorComandoRegional: FireStatsService.aggregateRegionalCommandData(firesWithLocation) })
    };

    // Itera sobre as queries e adiciona os resultados ao JSON final
    queries.forEach(query => {
      if (statsHandlers[query]) {
        Object.assign(stats, statsHandlers[query]());
      }
    });
    return stats;
  };
}
