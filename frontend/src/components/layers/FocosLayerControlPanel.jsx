// src/components/layers/FocoslayerControlPanel.jsx

// =============================
// 📦 Importações Principais
// =============================

// 🎣 React Hooks
import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

// 🗺️ Leaflet e suas extensões
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster'; // 📍 Plugin de clusterização de marcadores
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'; // 🎨 Estilo padrão do cluster

// 🎨 Estilos personalizados do painel de camadas
import '@styles/LayersControl.css';

// 📋 Componente flutuante para exibição de detalhes do foco
import FocoDetalhesFlutuante from '@components/mapa/FocoDetalhes/FocoDetalhesFlutuante';
// ⚠️ `void` para evitar warnings de importação não utilizada por ferramentas de análise estática
void FocoDetalhesFlutuante;

// 🔁 Função principal de sincronização de camadas no mapa
import { atualizarCamadasFocos } from '@components/layers/atualizarCamadasFocos';

// 📡 Funções de API
import { buscarFocos } from '@utils/api';

/**
 * @function FocosLayerControlPanel
 * @description
 * Componente React responsável por coordenar a lógica e interface de visualização dos focos de calor no mapa.
 * Ele controla a busca de dados, alternância de visualização (agrupada ou simples), camadas visuais e o painel de detalhes.
 *
 * 🔧 Internamente, o componente:
 * - Inicializa e atualiza os dados de focos de calor do dia atual.
 * - Gerencia três camadas principais do Leaflet: markers simples, clusterizados e destaques (highlight).
 * - Controla o painel flutuante de detalhes de focos quando o usuário interage.
 * - Permite alternar dinamicamente entre modo de exibição "Simples" ou "Cluster".
 *
 * @returns {JSX.Element} Elemento React que representa o controle visual e interativo dos focos no mapa.
 *
 * @example
 * <FocosLayerControlPanel />
 */
export default function FocosLayerControlPanel() {
    const map = useMap(); // 🗺️ Hook do React Leaflet que fornece o mapa atual

    // 🎯 Estado global e refs de controle para layers, HUD e interações
    const {
        clusterGroupRef,           // Ref do grupo de clusters (Leaflet.markercluster)
        markerLayerRef,            // Ref da camada base de marcadores
        proxyLayerRef,             // Ref da camada intermediária (decide exibir cluster ou não)
        highlightLayerRef,         // Ref da camada de destaque (círculo amarelo ou roxo)
        controlRef,                // Ref do controle de camadas no mapa
        focos: [focos, setFocos],                      // 🔥 Estado com todos os focos do dia
        useCluster: [useCluster, setUseCluster],       // ⚙️ Flag de modo (agrupado ou individual)
        focosSelecionados: [focosSelecionados, setFocosSelecionados], // 📍 Focos atualmente destacados
        posicaoTabela: [posicaoTabela, setPosicaoTabela],              // 📌 Posição do popup flutuante
        highlightData: [highlightData, setHighlightData],
    } = useFocosInternos(); // 🧬 Hook customizado que encapsula a estrutura reativa

    /**
     * 📡 useEffect #1 — Carrega focos ao montar o componente.
     * Faz a requisição dos dados dos focos do dia atual (UTC) assim que o painel é iniciado.
     */
    useEffect(() => {
        // const hoje = new Date(Date.now() - 24 * 60 * 60 * 1000)
        //     .toISOString()
        //     .split('T')[0];

        const hoje = new Date().toISOString().split('T')[0]; // (DES)COMENTAR PARA ALTERAR DATA PARA HOJE.

        // Função para buscar e atualizar os focos
        function atualizarFocos() {
            fetchFocosDoDia(hoje, setFocos);
        }

        atualizarFocos(); // Fetch inicial

        // Atualiza a cada 30 minutos
        const interval = setInterval(atualizarFocos, 30 * 60 * 1000);

        return () => clearInterval(interval); // Limpa ao desmontar
    }, []);


    const [viewportKey, setViewportKey] = useState(0);
    useMapEvents({
        moveend: () => setViewportKey(k => k + 1),
        zoomend: () => setViewportKey(k => k + 1),
    });

    /**
     * 🧠 useEffect #2 — Atualiza camadas ao carregar mapa ou focos.
     * Essa é a renderização inicial completa das camadas.
     * Também cuida da limpeza ao desmontar ou quando o mapa/focos mudam.
     */
    useEffect(() => {
        if (!podeAtualizarMapa(map, focos)) return;

        // 1️⃣ Pegue os bounds atuais do mapa
        const bounds = map.getBounds();

        // 2️⃣ Filtre os focos dentro do viewport
        const focosVisiveis = focos.filter(foco =>
            bounds.contains([foco.latitude, foco.longitude]) // ajuste conforme seus campos
        );

        // 4️⃣ Passe só os focos visíveis
        atualizarCamadasFocos({
            map,
            focos: focosVisiveis,
            useCluster,
            clusterGroupRef, markerLayerRef, proxyLayerRef,
            highlightLayerRef, controlRef,
            setFocosSelecionados, setPosicaoTabela,
            setHighlightData
        });

        configurarControleDeCamadas(map, controlRef, proxyLayerRef);
        prepararToggle(map, controlRef, useCluster, proxyLayerRef, setUseCluster);

        return () => limparCamadas(
            map,
            clusterGroupRef,
            markerLayerRef,
            proxyLayerRef,
            highlightLayerRef,
            controlRef
        );
    }, [map, focos, useCluster, viewportKey, highlightData]);

    /**
     * 🔁 useEffect #3 — Atualiza a visualização quando muda o modo de exibição (cluster/simples).
     * Garante que a camada proxy reflita corretamente o novo modo ativo.
     */
    useEffect(() => {
        atualizarCamadasFocos({
            map, focos, useCluster,
            clusterGroupRef, markerLayerRef, proxyLayerRef,
            highlightLayerRef, controlRef,
            setFocosSelecionados, setPosicaoTabela
        });
    }, [useCluster, focos]);

    useEffect(() => {
        if (!map) return;
        // Se highlightData não existe, limpe o highlight sempre!
        if (!highlightData || !highlightData.focos || highlightData.focos.length === 0) {
            highlightLayerRef.current.clearLayers();
            return;
        }

        // Só desenhe se o centro do círculo está no bounds atual
        const bounds = map.getBounds();
        if (bounds.contains(highlightData.centro)) {
            highlightLayerRef.current.clearLayers();
            const circle = L.circle(highlightData.centro, {
                radius: highlightData.raio,
                color: '#8A2BE2',
                weight: 2,
                fillOpacity: 0.25,
                fillColor: '#8A2BE2'
            });
            highlightLayerRef.current.addLayer(circle);
            map.addLayer(highlightLayerRef.current);
        } else {
            // Fora do viewport, só limpa
            highlightLayerRef.current.clearLayers();
        }
    }, [map, highlightData, viewportKey]);

    /**
     * 🧼 handleFecharDetalhes
     * 
     * Callback chamado ao fechar o painel flutuante de detalhes.
     * Limpa seleção e removes destaques do mapa.
     */
    const handleFecharDetalhes = () => {
        highlightLayerRef.current.clearLayers();     // ❌ Remove círculo de destaque
        setFocosSelecionados([]);                    // 🔄 Limpa seleção atual
    };

    /**
     * 🖥️ Renderização da HUD flutuante (detalhes de foco)
     * 
     * Exibe um painel flutuante quando há focos selecionados.
     */
    return (
        <Flutuante
            focosSelecionados={focosSelecionados}
            posicaoTabela={posicaoTabela}
            map={map}
            onClose={handleFecharDetalhes}
        />
    );
}

function useViewportUpdate(onMove) {
    useMapEvents({
        moveend: onMove,
        zoomend: onMove,
    });
}

/**
 * Extrai o valor `.current` de uma ref do React.
 * @param {React.RefObject} ref - Referência React.
 * @returns {any|null} Valor da ref ou null se ausente.
 */
function extrairCurrent(ref) {
    return ref.current ?? null;
}

/**
 * Verifica se um objeto possui o método `.getContainer()`, típico de controles Leaflet.
 * @param {any} obj - Objeto a ser inspecionado.
 * @returns {boolean} `true` se for um objeto com `.getContainer()`.
 */
function temGetContainer(obj) {
    return !!obj && typeof obj.getContainer === 'function';
}

/**
 * Retorna o container DOM de um objeto com `.getContainer()`, se válido.
 * @param {any} obj - Objeto com potencial de ser um controle Leaflet.
 * @returns {HTMLElement|null} Container DOM ou null.
 */
function obterContainerSeValido(obj) {
    if (!temGetContainer(obj)) return null;
    return obj.getContainer();
}

/**
 * Caminho completo e seguro para extrair o container DOM a partir de uma ref.
 * @param {React.RefObject} ref - Referência React para um controle Leaflet.
 * @returns {HTMLElement|null} Container extraído ou null.
 */
function obterContainerSeguro(ref) {
    if (!ref) return null;
    const current = extrairCurrent(ref);
    return obterContainerSeValido(current);
}

/**
 * Verifica se o elemento é um nó DOM que permite `querySelector`.
 * @param {any} container - Elemento DOM.
 * @returns {boolean} `true` se for possível usar `querySelector` nele.
 */
function podeSelecionarLabel(container) {
    return !!container && typeof container.querySelector === 'function';
}

/**
 * Tenta localizar o primeiro `<label>` dentro da seção de overlays do Leaflet.
 * @param {HTMLElement|null} container - Container DOM potencialmente válido.
 * @returns {HTMLElement|null} Elemento `<label>` ou null se não encontrado.
 */
function selecionarLabel(container) {
    if (!podeSelecionarLabel(container)) return null;
    return container.querySelector('.leaflet-control-layers-overlays label');
}

/**
 * Roteia toda a jornada: de uma ref até o `<label>` relevante no controle de camadas.
 * @param {React.RefObject} ref - Ref para o controle de camadas do Leaflet.
 * @returns {HTMLElement|null} Elemento `<label>` ou null.
 */
function encontrarLabel(ref) {
    const container = obterContainerSeguro(ref);
    return container ? selecionarLabel(container) : null;
}

/**
 * Determina se é seguro injetar o botão de modo ('Cluster/Simples') dentro do label.
 * Impede duplicações acidentais.
 * @param {HTMLElement|null} label - Label DOM alvo.
 * @returns {boolean} `true` se ainda não houver botão `.toggle-mode` dentro.
 */
function podeInjetarBotao(label) {
    return !!label && !label.querySelector('.toggle-mode');
}

/**
 * 🚀 Cria um botão de alternância entre os modos de visualização: Cluster vs Simples.
 * @param {boolean} useCluster - Indica se o modo atual é Cluster.
 * @returns {HTMLButtonElement} Botão DOM pronto para inserção.
 */
function criarBotaoAlternancia(useCluster) {
    const btn = document.createElement('button');
    btn.className = 'toggle-mode';
    btn.innerHTML = useCluster ? 'Cluster' : 'Simples';

    // Previne que o botão propague eventos que interfiram no mapa
    L.DomEvent.disableClickPropagation(btn);
    L.DomEvent.disableScrollPropagation(btn);

    return btn;
}

/**
 * 🧭 Associa ao botão o comportamento de alternância de modo de visualização no mapa.
 * @param {HTMLButtonElement} btn - Botão criado dinamicamente.
 * @param {L.Map} map - Instância atual do Leaflet.
 * @param {React.RefObject} proxyLayerRef - Referência da camada intermediária.
 * @param {Function} setUseCluster - Setter React para alternar o estado do modo.
 */
function configurarEventoToggle(btn, map, proxyLayerRef, setUseCluster) {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!map.hasLayer(proxyLayerRef.current)) return;

        // Alterna o estado de clusterização
        setUseCluster(prev => !prev);
    });
}

/**
 * 📡 Realiza a busca assíncrona de dados de focos de calor para uma data específica.
 * @param {string} dataISO - Data no formato ISO (YYYY-MM-DD).
 * @param {Function} setFocos - Função que atualiza o estado de focos no React.
 */
async function fetchFocosDoDia(dataISO, setFocos) {
    try {
        const focos = await buscarFocos(dataISO);
        setFocos(focos);
    } catch (e) {
        lidarComErro(e);
    }
}

/**
 * 🚨 lidarComErro
 * Handler padrão para falhas ao buscar focos de calor.
 * @param {Error} e - Objeto de erro capturado.
 */
function lidarComErro(e) {
    console.error('Erro ao buscar focos de calor:', e);
}

/**
 * 🧭 configurarControleDeCamadas
 * Configura o painel de camadas do Leaflet com a camada de focos.
 * Garante que a configuração só seja feita uma vez.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {React.RefObject} controlRef - Referência reativa do controle.
 * @param {React.RefObject} proxyRef - Camada proxy que será controlada.
 */
function configurarControleDeCamadas(map, controlRef, proxyRef) {
    if (controlRef.current) return;

    const control = L.control.layers(null, {
        'Focos de Calor': proxyRef.current
    }, {
        collapsed: true,
        position: 'topright'
    }).addTo(map);

    control.getContainer().classList.add('focos-layer-control');
    controlRef.current = control;
}

/**
 * 🔁 prepararToggle
 * Injeta dinamicamente o botão de alternância de modo (Cluster vs Simples) dentro do controle do Leaflet.
 * A injeção é segura, evita duplicações e funciona com delay para garantir DOM pronto.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {React.RefObject} controlRef - Referência do controle de camadas.
 * @param {boolean} useCluster - Estado atual do modo cluster.
 * @param {React.RefObject} proxyRef - Camada proxy ativa.
 * @param {Function} setUseCluster - Setter React para alternância de modo.
 */
function prepararToggle(map, controlRef, useCluster, proxyRef, setUseCluster) {
    const inject = () => {
        const label = encontrarLabel(controlRef);
        if (!podeInjetarBotao(label)) return;

        const btn = criarBotaoAlternancia(useCluster);
        configurarEventoToggle(btn, map, proxyRef, setUseCluster);
        label.appendChild(btn);
    };

    // Delay curto para garantir que o DOM do controle já exista
    setTimeout(() => inject(), 80);

    // Listener reativo: reinjeta botão ao reabrir camada
    map.on('overlayadd', (e) => {
        if (e.name === 'Focos de Calor') {
            setTimeout(() => inject(), 80);
        }
    });
}

/**
 * 🧹 prepararCamadas
 * Limpa os dados visuais anteriores dos grupos de clusters e marcadores.
 * Garante que o mapa esteja pronto para nova renderização.
 *
 * @param {React.RefObject} clusterRef - Referência do grupo de clusters.
 * @param {React.RefObject} markerRef - Referência da camada de marcadores.
 */
// function prepararCamadas(clusterRef, markerRef) {
//     clusterRef.current.clearLayers();
//     markerRef.current.clearLayers();
// }

/**
 * 🔴 adicionarMarcadores
 * Injeta marcadores no mapa a partir dos focos de calor, com comportamento interativo.
 * - Cria marcadores circulares.
 * - Define comportamento ao clicar (seleciona focos próximos e posiciona HUD).
 * - Agrupa em cluster e adiciona ao proxy.
 * - Garante que a camada final esteja no mapa.
 *
 * @param {Array} focos - Lista de focos de calor (com latitude e longitude).
 * @param {L.Map} map - Instância ativa do Leaflet.
 * @param {boolean} useCluster - Se true, ativa agrupamento (cluster).
 * @param {React.RefObject} markerRef - Camada intermediária dos marcadores simples.
 * @param {React.RefObject} clusterRef - Agrupador de marcadores.
 * @param {React.RefObject} proxyRef - Camada de exibição final.
 * @param {Function} setSelecionados - Setter de estado para os focos clicados.
 * @param {Function} setPosicao - Setter da posição do painel de detalhes flutuante.
 */
// function adicionarMarcadores(focos, map, useCluster, markerRef, clusterRef, proxyRef, setSelecionados, setPosicao) {
//     focos.forEach(({ latitude, longitude }) => {
//         const marker = L.circleMarker([latitude, longitude], {
//             radius: 6,
//             color: 'red',
//             fillColor: 'orange',
//             fillOpacity: 0.8
//         });

//         marker.on('click', (e) => {
//             L.DomEvent.stopPropagation(e); // Evita que o clique afete outras camadas

//             // 📍 Localiza outros focos próximos ao ponto clicado
//             // 🔎 Distância usada: 0.1 grau (~11 km) para latitude e longitude
//             // Isso é uma checagem bruta baseada em diferença de coordenadas, não em distância geodésica real.
//             const proximos = focos.filter(f =>
//                 Math.abs(f.latitude - latitude) < 0.1 &&
//                 Math.abs(f.longitude - longitude) < 0.1
//             );
//             setSelecionados(proximos);

//             // Se não for modo cluster, posiciona o painel flutuante
//             if (!useCluster) {
//                 const pixel = map.latLngToContainerPoint([latitude, longitude]);
//                 setPosicao({ x: pixel.x + 20, y: pixel.y });
//             } else {
//                 setPosicao(null);
//             }
//         });

//         markerRef.current.addLayer(marker); // Adiciona ao layer de marcadores simples
//     });

//     clusterRef.current.addLayer(markerRef.current); // Agrupa
//     proxyRef.current.addLayer(clusterRef.current);  // Injeta no mapa via proxy

//     // Garante visibilidade da camada
//     if (!map.hasLayer(proxyRef.current)) {
//         map.addLayer(proxyRef.current);
//     }
// }

/**
 * ♻️ limparCamadas
 * Remove todas as camadas e controles relacionados ao sistema de focos.
 * Usado para resetar o estado visual ou durante desmontagens de componente.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {React.RefObject} clusterRef - Camada de agrupamento de focos.
 * @param {React.RefObject} markerRef - Camada com os marcadores simples.
 * @param {React.RefObject} proxyRef - Camada proxy de exibição.
 * @param {React.RefObject} highlightRef - Camada de destaque para áreas clicadas.
 * @param {React.RefObject} controlRef - Controle de camadas Leaflet.
 */
function limparCamadas(map, clusterRef, markerRef, proxyRef, highlightRef, controlRef) {
    map.removeLayer(clusterRef.current);
    map.removeLayer(markerRef.current);
    map.removeLayer(proxyRef.current);
    map.removeLayer(highlightRef.current);
    map.off('overlayadd');

    if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
    }
}

/**
 * 🔐 podeAtualizarMapa
 * Verifica se o mapa e os dados de focos estão prontos para atualização.
 *
 * @param {L.Map|null} map - Instância do mapa Leaflet.
 * @param {Array} focos - Lista de focos de calor.
 * @returns {boolean} true se ambos estiverem válidos.
 */
function podeAtualizarMapa(map, focos) {
    return !!map && focos.length > 0;
}

/**
 * 🚀 executarAtualizacaoMapa
 * Executa todas as etapas necessárias para atualizar a exibição dos focos de calor no mapa.
 * - Limpa camadas antigas
 * - Injeta novos marcadores
 * - Ativa controle de camadas
 * - Prepara botão de alternância (Cluster/Simples)
 *
 * @param {Object} params - Parâmetros agrupados para atualização
 * @param {L.Map} params.map - Instância do mapa Leaflet
 * @param {Array} params.focos - Lista de focos de calor
 * @param {boolean} params.useCluster - Estado atual de agrupamento
 * @param {Object} params.clusterGroupRef - Ref do grupo de clusters
 * @param {Object} params.markerLayerRef - Ref do layer com marcadores simples
 * @param {Object} params.proxyLayerRef - Ref do layer proxy de exibição
 * @param {Object} params.controlRef - Ref do controle de camadas
 * @param {Function} params.setFocosSelecionados - Atualizador da seleção
 * @param {Function} params.setPosicaoTabela - Atualizador da posição do painel flutuante
 * @param {Function} params.setUseCluster - Alternador de modo de exibição
 */
// function executarAtualizacaoMapa({
//     map,
//     focos,
//     useCluster,
//     clusterGroupRef,
//     markerLayerRef,
//     proxyLayerRef,
//     controlRef,
//     setFocosSelecionados,
//     setPosicaoTabela,
//     setUseCluster
// }) {
//     prepararCamadas(clusterGroupRef, markerLayerRef); // 🧹 Limpa visualizações antigas.
//     adicionarMarcadores(focos, map, useCluster, markerLayerRef, clusterGroupRef, proxyLayerRef, setFocosSelecionados, setPosicaoTabela); // 🔥 Injeta novos focos.
//     configurarControleDeCamadas(map, controlRef, proxyLayerRef); // 🧭 Ativa controle de camadas.
//     prepararToggle(map, controlRef, useCluster, proxyLayerRef, setUseCluster); // 🔘 Adiciona toggle de modo.
// }

/**
 * 🎨 createClusterIcon
 * Gera dinamicamente o ícone visual para um cluster de focos.
 * A cor e o tamanho são escaláveis com base na quantidade de elementos agrupados.
 *
 * @param {number} count - Número de focos no cluster
 * @returns {L.DivIcon} - Ícone estilizado para representar agrupamento
 */
function createClusterIcon(count) {
    const ratio = Math.min(count / 100, 1);
    const hue = 30 - 30 * ratio;
    const bg = `hsl(${hue}, 100%, 50%)`;
    const diametro = 17;
    const fontSize = `${10 - (count >= 10) - (count >= 100)}px`;

    return L.divIcon({
        html: `<div style="
            width: ${diametro}px;
            height: ${diametro}px;
            line-height: ${diametro}px;
            background: ${bg};
            border: 2px solid #fff;
            border-radius: 50%;
            text-align: center;
            color: #fff;
            font-weight: bold;
            font-size: ${fontSize};
            box-sizing: border-box;
        ">${count}</div>`,
        className: '',
        iconSize: [diametro, diametro]
    });
}

/**
 * 🧬 criarClusterGroup
 * Cria um grupo de clusters de marcadores, utilizando o ícone dinâmico criado por `createClusterIcon`.
 * 
 * @returns {L.MarkerClusterGroup} - Grupo configurado para agrupar marcadores
 */
function criarClusterGroup() {
    return L.markerClusterGroup({
        maxClusterRadius: 15,
        iconCreateFunction: cluster =>
            createClusterIcon(cluster.getChildCount())
    });
}

/**
 * 📍 temY
 * Verifica se o objeto de posição contém a propriedade `y`.
 * 
 * @param {Object|null} posicao - Objeto de posição (x, y)
 * @returns {boolean} - true se possui `y` válido
 */
function temY(posicao) {
    return !!posicao && posicao.y != null;
}

/**
 * 📍 temX
 * Verifica se o objeto de posição contém a propriedade `x`.
 * 
 * @param {Object|null} posicao - Objeto de posição (x, y)
 * @returns {boolean} - true se possui `x` válido
 */
function temX(posicao) {
    return !!posicao && posicao.x != null;
}

/**
 * 🧮 calcularTop
 * Calcula a coordenada vertical (top) da HUD flutuante.
 * Se `y` não estiver presente, centraliza verticalmente.
 * 
 * @param {Object|null} posicao - Objeto de posição
 * @returns {number} - Posição `top` em pixels
 */
function calcularTop(posicao) {
    return temY(posicao)
        ? posicao.y
        : window.innerHeight / 2 - 150;
}

/**
 * 🧮 calcularLeft
 * Calcula a coordenada horizontal (left) da HUD flutuante.
 * Se `x` não estiver presente, centraliza horizontalmente.
 * 
 * @param {Object|null} posicao - Objeto de posição
 * @returns {number} - Posição `left` em pixels
 */
function calcularLeft(posicao) {
    return temX(posicao)
        ? posicao.x
        : window.innerWidth / 2 - 200;
}

/**
 * 🧠 deveRenderizarFlutuante
 * 
 * Determina se a interface flutuante deve ser renderizada com base na existência
 * de focos selecionados. Garante que o painel só apareça quando há dados a exibir.
 * 
 * @param {Array} focos - Lista de focos de calor selecionados.
 * @returns {boolean} - True se deve renderizar, false caso contrário.
 */
function deveRenderizarFlutuante(focos) {
    return Array.isArray(focos) && focos.length > 0;
}

/**
 * 🧊 renderizarFlutuante
 * 
 * Renderiza dinamicamente o painel flutuante de detalhes sobre os focos de calor.
 * Define posição absoluta com base no estado da aplicação e injeta o componente detalhista.
 * 
 * @param {Array} focos - Lista de focos a serem exibidos.
 * @param {Object|null} posicao - Coordenadas (x,y) para posicionamento do painel.
 * @param {Object} map - Instância do Leaflet map.
 * @param {Function} onClose - Callback para fechar o painel.
 * @returns {JSX.Element} - JSX do painel flutuante.
 */
function renderizarFlutuante(focos, posicao, map, onClose) {
    const top = calcularTop(posicao);     // 🎯 Coordenada Y.
    const left = calcularLeft(posicao);   // 🎯 Coordenada X.

    return (
        <div style={{ position: 'absolute', top, left, zIndex: 9999 }}>
            <FocoDetalhesFlutuante
                focos={focos}
                onClose={onClose}
                leafletMap={map}
            />
        </div>
    );
}

/**
 * 🚀 Flutuante
 * 
 * Componente de alto nível que encapsula a lógica de decisão e renderização
 * do painel de informações detalhadas. Apenas exibe se houver focos válidos.
 * 
 * @param {Object} props
 * @param {Array} props.focosSelecionados - Focos a exibir no painel.
 * @param {Object|null} props.posicaoTabela - Posição do painel flutuante.
 * @param {Object} props.map - Instância do mapa Leaflet.
 * @param {Function} props.onClose - Callback de fechamento do painel.
 * @returns {JSX.Element|null} - JSX do painel ou null.
 */
function Flutuante({ focosSelecionados, posicaoTabela, map, onClose }) {
    if (!deveRenderizarFlutuante(focosSelecionados)) return null;
    return renderizarFlutuante(focosSelecionados, posicaoTabela, map, onClose);
}
void Flutuante

/**
 * 🧠 useFocosInternos
 * 
 * Hook reativo e centralizado que fornece todas as referências e estados necessários
 * para controle de dados, interações e visualizações de focos térmicos no mapa.
 * Atua como um barramento completo do painel.
 * 
 * @returns {Object} - Objeto com todos os refs e estados controlados do sistema.
 */
function useFocosInternos() {
    return {
        clusterGroupRef: useRef(criarClusterGroup()),      // 🔁 Agrupamento inteligente.
        markerLayerRef: useRef(L.layerGroup()),            // 🎯 Camada de marcadores simples.
        proxyLayerRef: useRef(L.layerGroup()),             // 🛡️ Intermediário entre layers e mapa.
        highlightLayerRef: useRef(L.layerGroup()),         // ✨ Destaques temporários.
        highlightData: useState(null),
        controlRef: useRef(null),                          // 🧭 UI do controle de camadas.
        focos: useState([]),                               // 🔥 Lista de focos do backend.
        useCluster: useState(true),                        // ⚙️ Modo de visualização.
        focosSelecionados: useState([]),                   // 🎯 Focos selecionados para painel.
        posicaoTabela: useState(null),                     // 📍 Posição da interface flutuante.
    };
}
