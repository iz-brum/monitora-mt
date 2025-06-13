// src/components/mapa/SearchControl.jsx

/**
 * ⏰ React Hooks
 *
 * - useEffect: Gerencia efeitos colaterais, especialmente integração com plugins externos.
 * - useRef: Cria referências persistentes a elementos ou valores, sem causar novos renders.
 */
import { useEffect, useRef } from 'react';

/**
 * 🌍 React-Leaflet Hook
 *
 * Importa o hook `useMap`, fornecendo acesso à instância do mapa Leaflet atual.
 */
import { useMap } from 'react-leaflet';

/**
 * 🗺️ Leaflet Core
 *
 * Importa a biblioteca principal do Leaflet (`L`), base para extensões e plugins do mapa.
 */
import L from 'leaflet';

/**
 * 🧭 Leaflet Control Geocoder
 *
 * Plugin para adicionar um controle de busca por geocodificação ao mapa.
 * Permite ao usuário pesquisar localidades diretamente no mapa.
 */
import 'leaflet-control-geocoder';

/**
 * 🎨 Leaflet Geocoder Styles
 *
 * Importa o CSS necessário para estilização do controle de geocodificação.
 */
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';

/**
 * 🪴 React DOM
 *
 * Importa `createRoot` para criar o ponto de montagem da aplicação React em uma árvore de componentes moderna,
 * permitindo o uso do modo concorrente (Concurrent Mode) e outras otimizações do React 18+.
 */
import { createRoot } from 'react-dom/client';

/**
 * 📍 GeocodedFeatureViewer
 *
 * Importa o componente responsável por exibir os detalhes da feição geocodificada no layout da aplicação.
 */
import GeocodedFeatureViewer from '@components/layout/GeocodedFeatureViewer';
void GeocodedFeatureViewer; // 🔒 Garante inclusão no bundle, mesmo sem uso direto no JSX

/**
 * ⚙️ configurarGeocoder
 *
 * Adiciona ao mapa Leaflet um controle de geocodificação (busca de endereço).
 * Garante que o controle seja adicionado apenas uma vez e integra busca reversa
 * para detalhar o endereço selecionado pelo usuário.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {Function} adicionarMarcador - Função para adicionar marcador no mapa com detalhes de endereço
 */
function configurarGeocoder(map, adicionarMarcador) {
  if (map._geocoderAdded) return;

  const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    position: 'topleft',
    placeholder: 'Buscar endereço...',
    geocoder: L.Control.Geocoder.nominatim()
  });

  geocoder.on('markgeocode', async (e) => {
    const { center } = e.geocode;
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${center.lat}&lon=${center.lng}`);
    const data = await res.json();
    adicionarMarcador(center.lat, center.lng, data.address || {});
    map.setView(center, 14);
  });

  geocoder.addTo(map);
  map._geocoderAdded = true;
}

/**
 * 🚫 deveIgnorarClique
 *
 * Função auxiliar que determina se o clique no mapa deve ser ignorado,
 * normalmente quando o evento de clique já foi tratado por outra feature.
 *
 * @param {Object} e - Evento de clique do Leaflet
 * @returns {boolean} True se o clique deve ser ignorado
 */
function deveIgnorarClique(e) {
  return !!e.originalEvent?.__featureClick;
}

/**
 * 🖱️ registrarCliqueNoMapa
 *
 * Remove listeners antigos e registra um novo listener de clique no mapa Leaflet,
 * encaminhando o evento para o tratamento adequado.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {Function} adicionarMarcador - Função para adicionar marcador no mapa
 */
function registrarCliqueNoMapa(map, adicionarMarcador) {
  map.off('click');
  map.on('click', (e) => tratarCliqueNoMapa(e, adicionarMarcador));
}

/**
 * 🖱️ tratarCliqueNoMapa
 *
 * Função principal que trata o clique do usuário no mapa.
 * Ignora cliques em features já tratadas e tenta adicionar um novo marcador com endereço.
 *
 * @param {Object} e - Evento de clique do Leaflet (contém latlng e originalEvent)
 * @param {Function} adicionarMarcador - Função para adicionar marcador ao mapa
 */
async function tratarCliqueNoMapa(e, adicionarMarcador) {
  if (deveIgnorarClique(e)) return;

  await tentarAdicionarMarcador(e.latlng, adicionarMarcador);
}

/**
 * 📍 tentarAdicionarMarcador
 *
 * Tenta obter o endereço via geocodificação reversa e adicionar um marcador ao mapa.
 * Em caso de erro, trata a exceção.
 *
 * @param {{ lat: number, lng: number }} param0 - Coordenadas do ponto clicado
 * @param {Function} adicionarMarcador - Função para adicionar marcador ao mapa
 */
async function tentarAdicionarMarcador({ lat, lng }, adicionarMarcador) {
  try {
    const endereco = await obterEnderecoViaReverso(lat, lng);
    adicionarMarcador(lat, lng, endereco);
  } catch (err) {
    tratarErroGeocodificacao(err);
  }
}

/**
 * ⚠️ tratarErroGeocodificacao
 *
 * Encapsula o tratamento de erros ocorridos durante a geocodificação reversa.
 * Atualmente apenas faz o log, mas pode ser expandido para exibir feedback ao usuário.
 *
 * @param {Error} err - Erro capturado durante a geocodificação
 */
function tratarErroGeocodificacao(err) {
  logErroGeocodificacao(err);
}

/**
 * 📦 obterEnderecoViaReverso
 *
 * Obtém o endereço de um ponto geográfico via requisição reversa
 * e retorna apenas o endereço seguro (ou objeto vazio).
 *
 * @param {number} lat - Latitude do ponto
 * @param {number} lng - Longitude do ponto
 * @returns {Promise<Object>} Endereço retornado ou objeto vazio
 */
async function obterEnderecoViaReverso(lat, lng) {
  const data = await buscarEnderecoReverso(lat, lng);
  return obterEnderecoSeguro(data);
}

/**
 * 🌐 buscarEnderecoReverso
 *
 * Realiza uma requisição à API Nominatim (OpenStreetMap) para obter dados completos de endereço
 * a partir de coordenadas geográficas.
 *
 * @param {number} lat - Latitude do ponto
 * @param {number} lng - Longitude do ponto
 * @returns {Promise<Object>} Dados retornados da API Nominatim
 */
async function buscarEnderecoReverso(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url);
  return res.json();
}

/**
 * 🛡️ obterEnderecoSeguro
 *
 * Garante que será retornado apenas o endereço do resultado, ou objeto vazio se inexistente.
 *
 * @param {Object} data - Objeto retornado da API Nominatim
 * @returns {Object} Endereço extraído ou objeto vazio
 */
function obterEnderecoSeguro(data) {
  return data.address || {};
}

/**
 * 🪲 logErroGeocodificacao
 *
 * Função utilitária para registrar erros ocorridos durante a geocodificação reversa no console,
 * facilitando o debugging.
 *
 * @param {Error} err - Objeto de erro capturado
 */
function logErroGeocodificacao(err) {
  console.error('[Reverse Geocoding] Erro ao buscar endereço:', err);
}

/**
 * ⎋ registrarEscapeHandler
 *
 * Registra um listener global para a tecla "Escape". Ao pressionar Escape,
 * a função `limparTodosMarcadores` é chamada. Retorna uma função para remoção do listener.
 *
 * @param {Function} limparTodosMarcadores - Função para limpar todos os marcadores do mapa
 * @returns {Function} Função para remover o listener de teclado
 */
function registrarEscapeHandler(limparTodosMarcadores) {
  const handler = (e) => {
    if (e.key === 'Escape') {
      limparTodosMarcadores();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

/**
 * 🗑️ limparTodosMarcadoresDoMapa
 *
 * Remove todos os marcadores do mapa e limpa a referência à lista de marcadores.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {React.MutableRefObject<Array>} markersRef - Referência à lista de marcadores adicionados
 */
function limparTodosMarcadoresDoMapa(map, markersRef) {
  markersRef.current.forEach((m) => map.removeLayer(m));
  markersRef.current = [];
}

/**
 * 🪟 currentHud
 *
 * Variável global que armazena a instância atual do HUD flutuante no mapa,
 * permitindo controle e atualização de suas entradas sem múltiplas instâncias concorrentes.
 *
 * @type {Object|null}
 */
let currentHud = null;

/**
 * 📊 mostrarHudComTabela
 *
 * Gerencia a exibição de um HUD (painel flutuante) contendo tabela de endereços e coordenadas no mapa Leaflet.
 * Se já existe um HUD, adiciona ou ativa a entrada correspondente; caso contrário, cria um novo HUD.
 *
 * @param {Object} leafletMap - Instância do mapa Leaflet
 * @param {Object} address - Objeto de endereço geocodificado
 * @param {number} lat - Latitude da localização
 * @param {number} lng - Longitude da localização
 */
function mostrarHudComTabela(leafletMap, address, lat, lng) {
  const chave = gerarChaveLatLng(lat, lng);
  const novaEntrada = { ...address, lat, lng };

  if (currentHud) {
    lidarComHudExistente(chave, novaEntrada, leafletMap);
    return;
  }

  criarNovaHud(chave, novaEntrada, leafletMap);
}

/**
 * ♻️ lidarComHudExistente
 *
 * Atualiza o HUD existente, ativando a entrada já presente ou adicionando uma nova entrada.
 * Atualiza o índice ativo para a entrada correspondente e re-renderiza o componente HUD.
 *
 * @param {string} chave - Chave única para identificar a entrada (baseada em lat/lng)
 * @param {Object} novaEntrada - Dados completos da entrada (endereço + coordenadas)
 * @param {Object} leafletMap - Instância do mapa Leaflet
 */
function lidarComHudExistente(chave, novaEntrada, leafletMap) {
  const indexExistente = currentHud.entries.findIndex(
    (e) => gerarChaveLatLng(e.lat, e.lng) === chave
  );

  if (indexExistente !== -1) {
    currentHud.activeIndex = indexExistente;
  } else {
    currentHud.entries.push(novaEntrada);
    currentHud.activeIndex = currentHud.entries.length - 1;
  }

  currentHud.root.render(criarComponente(leafletMap));
}

/**
 * 🆕 criarNovaHud
 *
 * Cria um novo HUD (painel flutuante) no mapa Leaflet, inicializando seu estado e propriedades,
 * e renderiza o componente HUD pela primeira vez.
 *
 * @param {string} chave - Chave única identificadora (baseada em lat/lng)
 * @param {Object} entrada - Dados completos da entrada inicial (endereço + coordenadas)
 * @param {Object} leafletMap - Instância do mapa Leaflet
 */
function criarNovaHud(chave, entrada, leafletMap) {
  const { container, root } = criarContainerDeHud();
  const handleClose = () => removerHud(container, root);

  currentHud = {
    chave,
    entries: [entrada],
    activeIndex: 0,
    root,
    container,
    props: {
      leafletMap,
      onSelectTab: (index) => {
        currentHud.activeIndex = index;
        root.render(criarComponente(leafletMap));
      },
      onCloseTab: (index) => {
        if (deveFecharHud(index)) {
          return removerHud(container, root);
        }

        processarFechamentoDeAba(index, leafletMap, root);
      },
      onClose: handleClose
    }
  };

  root.render(criarComponente(leafletMap));
}

/**
 * ❌ deveFecharHud
 *
 * Determina se o HUD deve ser totalmente fechado com base no índice da aba e
 * na quantidade de entradas ainda existentes.
 *
 * @param {number} index - Índice da aba selecionada para fechamento
 * @returns {boolean} True se o HUD deve ser fechado
 */
function deveFecharHud(index) {
  return index === -1 || currentHud.entries.length === 1;
}

/**
 * 🗂️ processarFechamentoDeAba
 *
 * Remove uma entrada (aba) do HUD, ajusta o índice da aba ativa e re-renderiza o componente HUD.
 *
 * @param {number} index - Índice da aba a ser removida
 * @param {Object} leafletMap - Instância do mapa Leaflet
 * @param {Object} root - Instância do React root usada para renderização
 */
function processarFechamentoDeAba(index, leafletMap, root) {
  currentHud.entries.splice(index, 1);
  ajustarAbaAtiva(index);
  root.render(criarComponente(leafletMap));
}

/**
 * 🔄 ajustarAbaAtiva
 *
 * Garante que o índice da aba ativa permaneça válido após remoção de uma aba,
 * ajustando o valor conforme necessário.
 *
 * @param {number} indexRemovido - Índice da aba que foi removida
 */
function ajustarAbaAtiva(indexRemovido) {
  tentarReduzirIndice(indexRemovido);
  tentarAjustarParaUltimaAba();
}

/**
 * ⬇️ tentarReduzirIndice
 *
 * Reduz o índice da aba ativa se uma aba anterior foi removida,
 * mantendo a seleção na aba correta.
 *
 * @param {number} indexRemovido - Índice da aba removida
 */
function tentarReduzirIndice(indexRemovido) {
  if (currentHud.activeIndex > indexRemovido) {
    currentHud.activeIndex--;
  }
}

/**
 * 🔚 tentarAjustarParaUltimaAba
 *
 * Ajusta o índice da aba ativa caso ele fique fora do limite após remoção de uma aba,
 * garantindo que sempre a última aba válida seja selecionada.
 */
function tentarAjustarParaUltimaAba() {
  if (currentHud.activeIndex >= currentHud.entries.length) {
    currentHud.activeIndex = currentHud.entries.length - 1;
  }
}

/**
 * 🧩 criarComponente
 *
 * Cria e retorna o componente <GeocodedFeatureViewer /> configurado com os dados do HUD atual.
 *
 * @param {Object} leafletMap - Instância do mapa Leaflet (passada como prop)
 * @returns {JSX.Element} Componente React pronto para renderização
 */
function criarComponente(leafletMap) {
  return (
    <GeocodedFeatureViewer
      entries={currentHud.entries}
      activeIndex={currentHud.activeIndex}
      onSelectTab={currentHud.props.onSelectTab}
      onCloseTab={currentHud.props.onCloseTab}
      onClose={currentHud.props.onClose}
      leafletMap={leafletMap}
    />
  );
}

/**
 * 🔑 gerarChaveLatLng
 *
 * Gera uma chave única baseada em latitude e longitude, com 5 casas decimais.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Chave formatada no padrão "lat|lng"
 */
function gerarChaveLatLng(lat, lng) {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}`;
}

/**
 * 🏗️ criarContainerDeHud
 *
 * Cria um novo elemento container na árvore DOM para o HUD flutuante e
 * inicializa um React root usando `createRoot`. Retorna ambos para controle do HUD.
 *
 * @returns {{ container: HTMLDivElement, root: React.Root }} Container DOM e React root prontos para uso
 */
function criarContainerDeHud() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

/**
 * 🗑️ removerHud
 *
 * Remove o HUD flutuante do DOM, desmonta o React root e zera a referência global.
 *
 * @param {HTMLDivElement} container - Elemento container criado para o HUD
 * @param {React.Root} root - Instância do React root associada ao HUD
 */
function removerHud(container, root) {
  root.unmount();
  document.body.removeChild(container);
  currentHud = null;
}

/**
 * 📍 adicionarMarcadorNoMapa
 *
 * Adiciona um marcador ao mapa Leaflet nas coordenadas especificadas, anexando dados do endereço.
 * Permite interação de reabertura da HUD ao clicar e remoção ao clicar com o botão direito.
 * Garante que o marcador seja rastreado pela referência de marcadores (`markersRef`).
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {React.MutableRefObject<Array>} markersRef - Referência ao array de marcadores no mapa
 * @param {number} lat - Latitude do marcador
 * @param {number} lng - Longitude do marcador
 * @param {Object} address - Objeto com dados do endereço a serem vinculados ao marcador
 */
function adicionarMarcadorNoMapa(map, markersRef, lat, lng, address) {
  const marker = L.marker([lat, lng], {
    geocodeData: { ...address, lat: lat.toFixed(5), lng: lng.toFixed(5) } // ← 🧠
  }).addTo(map);

  // ✅ Reabre a HUD ao clicar no marcador
  marker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);

    const data = e.target.options.geocodeData;
    mostrarHudComTabela(map, data, lat, lng);
  });

  // 🗑️ Remove marcador e aba correspondente no HUD ao clicar com o botão direito
  marker.on('contextmenu', () => {
    map.removeLayer(marker);
    markersRef.current = markersRef.current.filter((m) => m !== marker);

    // Fecha apenas a aba correspondente no HUD, se existir
    if (currentHud) {
      const chave = gerarChaveLatLng(lat, lng);
      const index = currentHud.entries.findIndex(
        (e) => gerarChaveLatLng(e.lat, e.lng) === chave
      );

      if (index !== -1) {
        processarFechamentoDeAba(index, map, currentHud.root);
      }
    }
  });

  markersRef.current.push(marker);

  // Sempre mostra o HUD para o novo marcador
  // mostrarHudComTabela(map, address, lat, lng);
}

/**
 * 🧹 prepararLimpeza
 *
 * Cria uma função para limpar todos os marcadores do mapa quando chamada.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {React.MutableRefObject<Array>} markersRef - Referência ao array de marcadores
 * @returns {Function} Função que, ao ser chamada, remove todos os marcadores do mapa
 */
function prepararLimpeza(map, markersRef) {
  return () => limparTodosMarcadoresDoMapa(map, markersRef);
}

/**
 * ➕ criarAdicionadorDeMarcador
 *
 * Retorna uma função de conveniência que adiciona um marcador ao mapa usando os parâmetros fornecidos.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {React.MutableRefObject<Array>} markersRef - Referência ao array de marcadores
 * @returns {Function} Função que adiciona um marcador ao mapa
 */
function criarAdicionadorDeMarcador(map, markersRef) {
  return (lat, lng, address) => adicionarMarcadorNoMapa(map, markersRef, lat, lng, address);
}

/**
 * 🚫 deveIgnorarConfiguracao
 *
 * Determina se a configuração de interações no mapa deve ser ignorada,
 * caso o mapa não esteja disponível ou o Geocoder não esteja carregado.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @returns {boolean} True se a configuração deve ser ignorada
 */
function deveIgnorarConfiguracao(map) {
  return !map || !L.Control.Geocoder;
}

/**
 * ⚙️ configurarInteracoesDoMapa
 *
 * Inicializa a configuração de todos os eventos e interações do mapa,
 * caso o mapa e o Geocoder estejam disponíveis.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {React.MutableRefObject<Array>} markersRef - Referência ao array de marcadores
 * @returns {any} Retorno da função de configuração de eventos, caso aplicável
 */
function configurarInteracoesDoMapa(map, markersRef) {
  if (deveIgnorarConfiguracao(map)) return;

  return configurarTodosEventos(map, markersRef);
}

/**
 * 🧩 configurarTodosEventos
 *
 * Orquestra a configuração de todos os eventos do mapa e do geocoder.
 * Retorna uma função de limpeza (tecla Escape) para remover todos os marcadores.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {React.MutableRefObject<Array>} markersRef - Referência ao array de marcadores
 * @returns {Function} Função de cleanup (remover marcadores ao pressionar Escape)
 */
function configurarTodosEventos(map, markersRef) {
  const limpar = prepararLimpeza(map, markersRef);
  const adicionar = criarAdicionadorDeMarcador(map, markersRef);

  configurarEventosDeMapa(map, adicionar, markersRef);
  configurarEventosDeGeocoder(map, adicionar);

  return registrarEscapeHandler(limpar);
}

/**
 * 🗺️ configurarEventosDeMapa
 *
 * Configura o evento de clique no mapa para adicionar marcadores.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {Function} adicionar - Função para adicionar marcador ao mapa
 * @param {React.MutableRefObject<Array>} markersRef - Referência ao array de marcadores
 */
function configurarEventosDeMapa(map, adicionar, markersRef) {
  registrarCliqueNoMapa(map, adicionar, markersRef);
}

/**
 * 📦 configurarEventosDeGeocoder
 *
 * Adiciona o controle de geocodificação ao mapa e integra o evento de adicionar marcador.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {Function} adicionar - Função para adicionar marcador ao mapa
 */
function configurarEventosDeGeocoder(map, adicionar) {
  configurarGeocoder(map, adicionar);
}

/**
 * 🚫 removerEventosDoMapa
 *
 * Remove todos os listeners de clique do mapa Leaflet.
 *
 * @param {Object} map - Instância do mapa Leaflet
 */
function removerEventosDoMapa(map) {
  if (map) {
    map.off('click');
  }
}

/**
 * 🧽 executarRemocaoSeFuncao
 *
 * Executa a função recebida para remover o listener do Escape, caso seja de fato uma função.
 *
 * @param {Function|any} removerEscape - Função de cleanup (ou qualquer valor)
 */
function executarRemocaoSeFuncao(removerEscape) {
  if (typeof removerEscape === 'function') {
    removerEscape();
  }
}

/**
 * 🧹 limparInteracoes
 *
 * Remove todos os eventos e listeners relacionados ao mapa e tecla Escape.
 *
 * @param {Object} map - Instância do mapa Leaflet
 * @param {Function|any} removerEscape - Função para remover listener de Escape
 */
function limparInteracoes(map, removerEscape) {
  removerEventosDoMapa(map);
  executarRemocaoSeFuncao(removerEscape);
}

/**
 * 🔎 SearchControl
 *
 * Componente React que adiciona ao mapa Leaflet um controle de busca geocodificada,
 * permitindo pesquisar endereços e adicionar marcadores interativos.
 * Garante a configuração e limpeza de todos os eventos e controles ao montar/desmontar.
 *
 * @returns {null} Não renderiza elementos visuais; manipula apenas o mapa e controles externos
 */
export default function SearchControl() {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    const removerEscape = configurarInteracoesDoMapa(map, markersRef);
    return () => limparInteracoes(map, removerEscape);
  }, [map]);

  return null;
}

// Sugestões futuras (se quiser evoluir):
// - Internacionalização: traduzir os labels dinamicamente com base na língua do usuário.
// - Salvar o histórico de buscas com localizações favoritas.