// src/components/layout/ImportedFeatureViewer.jsx

// 🎯 Importações essenciais do React para composição de componentes com estado e efeitos
import React, {
    useLayoutEffect, // ⏱️ Hook usado para medir e ajustar layout após renderização
    useRef,          // 📌 Cria referência mutável para acessar elementos DOM
    useState,        // 🔁 Hook de estado local reativo
    useEffect        // 🔄 Hook para efeitos colaterais após renderizações
} from 'react';
void React // 📦 Garante inclusão do React no bundle final mesmo sem JSX no topo do arquivo

// 🧭 DomEvent: Módulo da biblioteca Leaflet para manipulação de eventos nativos no DOM
import { DomEvent } from 'leaflet';

// 🔌 createPortal: Permite renderizar componentes fora da hierarquia de componentes pai
// Muito útil para HUDs (interfaces flutuantes), modais ou tooltips dinâmicos
import { createPortal } from 'react-dom';

// 🎨 Estilos aplicados especificamente à HUD flutuante de visualização de features importadas
// Este arquivo define a aparência da janela flutuante (posição, cores, responsividade, etc.)
import '@styles/GeocodedFeatureViewer.css';

/**
 * 🧭 ImportedFeatureViewer
 *
 * Componente flutuante que exibe atributos de uma ou mais features geográficas importadas no mapa.
 * - Stateless: todo o controle de features e abas é feito pelo componente pai!
 * - Suporta posicionamento inicial personalizado (via props)
 * - Pode ser arrastado (drag and drop)
 * - Ajusta o container automaticamente para fullscreen do Leaflet
 *
 * @component
 *
 * @param {Object} props - Propriedades do componente
 * @param {Array<Object>} props.features - Lista de features importadas para exibição (GeoJSON-like)
 * @param {number} props.activeIndex - Índice da aba atualmente ativa
 * @param {Function} props.onSelectTab - Função callback chamada ao trocar de aba
 * @param {Function} props.onCloseTab - Função callback chamada ao fechar uma aba (ou todas, passando -1)
 * @param {Function} props.onClose - Função callback chamada ao fechar o painel inteiro
 * @param {Object} props.leafletMap - Instância do mapa Leaflet em uso
 * @param {{ x: number, y: number }} [props.posicaoInicial] - Posição inicial opcional do painel flutuante
 *
 * @returns {JSX.Element|null} Painel flutuante com tabela de atributos da feature
 */
export default function ImportedFeatureViewer({
    features = [],
    activeIndex = 0,
    onSelectTab,
    onCloseTab,
    onClose,
    leafletMap,
    posicaoInicial
}) {
    // 📌 Referência ao DOM da HUD (usada para centralização e drag)
    const containerRef = useRef(null);
    // ↔️ Offset relativo para arrastar a HUD
    const offsetRef = useRef({ x: 0, y: 0 });
    // 📍 Estado da posição atual da HUD
    const [pos, setPos] = useState(definirPosicaoInicial(posicaoInicial));
    // 🖱️ Flag que indica se está sendo arrastado
    const [dragging, setDragging] = useState(false);
    // 🌀 Container onde o portal será injetado
    const [portalContainer, setPortalContainer] = useState(() => document.body);

    // 🌐 Efeitos que controlam o comportamento do painel:
    useEffectCentralizar(containerRef, posicaoInicial, setPos);     // 📍 Centraliza a HUD se necessário
    useEffectFullscreen(leafletMap, setPortalContainer);            // 🔁 Troca de portal ao alternar para fullscreen
    useEffectDrag(                                                  // 🖱️ Comportamento de arrastar
        containerRef,
        leafletMap,
        pos,
        setPos,
        dragging,
        setDragging,
        offsetRef,
        portalContainer
    );

    void React // 📦 Garante que o React seja mantido mesmo sem JSX direto no escopo

    // Só renderiza se houver features e índice válido
    if (!features.length || activeIndex < 0 || activeIndex >= features.length) return null;

    // Propriedades da feature ativa
    const props = extrairPropriedadesDaFeature(features[activeIndex]);

    // 🚀 Renderiza o portal flutuante contendo os dados da feature importada
    return createPortal(
        <div
            className="geo-flutuante"
            ref={containerRef}
            style={{
                top: pos.y,
                left: pos.x,
                zIndex: 9999,
                cursor: dragging ? 'grabbing' : 'default'
            }}
        >
            <Header
                entries={features}
                activeIndex={activeIndex}
                onSelectTab={onSelectTab}
                onCloseTab={onCloseTab}
            />
            {renderTabela(extrairLinhasTabela(props))}
        </div>,
        portalContainer
    );
}


//
// == Helpers de posicionamento e efeitos ==
//

// 📍 define posição inicial — usa a fornecida ou fallback (100,100)
/**
 * Define a posição inicial do painel flutuante.
 * Se o chamador passou uma posição inicial (como coordenada do clique),
 * ela será usada. Caso contrário, aplica o fallback padrão (100,100).
 *
 * @param {{x: number, y: number}|null} posicao
 * @returns {{x: number, y: number}}
 */
function definirPosicaoInicial(posicao) {
    return posicao ?? { x: 100, y: 100 };
}

// 🛰️ Centraliza a HUD se não houver posição definida
/**
 * Centraliza o painel flutuante na tela, somente se não foi definida
 * uma posição inicial. Executa após o layout ser calculado (useLayoutEffect).
 *
 * @param {RefObject} ref - Referência ao container DOM
 * @param {{x:number, y:number}|null} posicaoInicial - Posição fornecida
 * @param {Function} setPos - Setter para atualizar a posição
 */
function useEffectCentralizar(ref, posicaoInicial, setPos) {
    useLayoutEffect(
        () => centralizarPopup(ref, posicaoInicial, setPos),
        [posicaoInicial]
    );
}

/**
 * 📺 useEffectFullscreen
 * 
 * Hook de efeito que monitora a entrada e saída do modo fullscreen no mapa Leaflet.
 * Quando o mapa entra em fullscreen, o portal que renderiza a HUD é movido para dentro do container do mapa.
 * Isso garante que elementos flutuantes continuem visíveis e corretamente posicionados.
 * 
 * @param {Object} leafletMap - Instância do mapa Leaflet
 * @param {Function} setPortalContainer - Função setter para atualizar o container onde o portal será renderizado
 */
function useEffectFullscreen(leafletMap, setPortalContainer) {
    useEffect(
        () => configurarFullscreenPortal(leafletMap, setPortalContainer),
        [leafletMap]
    );
}

/**
 * 🖱️ useEffectDrag
 * 
 * Hook que configura a lógica de drag and drop para o painel flutuante (HUD).
 * Permite mover o painel pela tela com o mouse, integrando com o controle de zoom/pan do Leaflet.
 * O comportamento é ativado apenas quando `dragging` está true.
 * 
 * @param {Object} ref - Ref para o elemento DOM da HUD
 * @param {Object} map - Instância do mapa Leaflet
 * @param {{ x: number, y: number }} pos - Posição atual da HUD
 * @param {Function} setPos - Setter para atualizar a posição (usado durante o drag)
 * @param {boolean} dragging - Flag indicando se o painel está em movimento
 * @param {Function} setDragging - Setter que ativa/desativa o estado de arraste
 * @param {Object} offsetRef - Ref contendo o deslocamento relativo do clique inicial
 * @param {HTMLElement} portalContainer - Container atual onde o portal está montado
 */
function useEffectDrag(
    ref,
    map,
    pos,
    setPos,
    dragging,
    setDragging,
    offsetRef,
    portalContainer
) {
    useEffect(
        () =>
            configurarDrag(
                ref,
                map,
                pos,
                setPos,
                dragging,
                setDragging,
                offsetRef
            ),
        [dragging, map, pos, portalContainer]
    );
}

/**
 * 🧩 configurarFullscreenPortal
 * 
 * Registra um listener para eventos de `fullscreenchange` no container do mapa Leaflet.
 * Essa função garante que o portal (HUD flutuante) seja renderizado no container correto,
 * seja ele `document.body` ou o próprio mapa, dependendo se está em modo fullscreen.
 * 
 * @param {L.Map} leafletMap - Instância ativa do mapa Leaflet
 * @param {Function} setPortalContainer - Função para atualizar o container usado pelo portal React
 * @returns {Function|undefined} Função de cleanup para remover o listener, ou undefined se o mapa for inválido
 */
function configurarFullscreenPortal(leafletMap, setPortalContainer) {
    if (!leafletMap) return;

    const mapEl = leafletMap.getContainer();
    const atualizarContainer = criarAtualizadorDeContainer(
        mapEl,
        setPortalContainer
    );

    mapEl.addEventListener('fullscreenchange', atualizarContainer);
    atualizarContainer(); // Executa a lógica imediatamente ao montar

    return () => mapEl.removeEventListener('fullscreenchange', atualizarContainer);
}

/**
 * 📦 criarAtualizadorDeContainer
 * 
 * Retorna uma função que atualiza dinamicamente o local onde o portal será renderizado.
 * Se o mapa estiver em fullscreen, o portal é renderizado dentro do próprio mapa;
 * caso contrário, permanece em `document.body`.
 * 
 * @param {HTMLElement} mapEl - Elemento DOM do mapa
 * @param {Function} setPortalContainer - Setter que define o novo container do portal
 * @returns {Function} Função que aplica a lógica de verificação e atribuição do container
 */
function criarAtualizadorDeContainer(mapEl, setPortalContainer) {
    return () => {
        const isFs = estaEmFullscreen(mapEl);
        setPortalContainer(isFs ? mapEl : document.body);
    };
}

/**
 * 🧠 estaEmFullscreen
 * 
 * Verifica se o mapa Leaflet está atualmente em modo fullscreen.
 * A detecção é feita tanto por classe CSS (Leaflet) quanto pela Web API nativa.
 * 
 * @param {HTMLElement} el - Elemento DOM a ser verificado
 * @returns {boolean} Verdadeiro se estiver em fullscreen; falso caso contrário
 */
function estaEmFullscreen(el) {
    return (
        el.classList.contains('leaflet-fullscreen-on') ||
        document.fullscreenElement === el
    );
}

/**
 * 🚀 renderizado
 * 
 * Responsável por iniciar a renderização da HUD flutuante contendo os dados da feature.
 * Esta HUD é criada fora da árvore padrão de React usando um portal (via `createPortal`),
 * sendo útil para elementos sobrepostos ao mapa como popups, tooltips ou caixas flutuantes.
 * 
 * @param {Array} features - Lista de features geográficas importadas (GeoJSON)
 * @param {React.RefObject} ref - Referência ao elemento DOM do container da HUD
 * @param {HTMLElement} portalContainer - Elemento DOM onde o portal será injetado (ex: body ou mapa)
 * @param {{x: number, y: number}} pos - Posição absoluta onde a HUD será colocada na tela
 * @param {boolean} dragging - Indica se a HUD está sendo arrastada (muda o cursor)
 * @param {Function} onClose - Callback chamado ao fechar a HUD
 * @returns {JSX.Element|null} HUD renderizada ou `null` se não houver dados
 */
function renderizado(features, activeIndex, ref, portalContainer, pos, dragging, onSelectTab, onCloseTab) {
    if (!features.length) return null;
    // Mostra a feature ativa pela aba selecionada
    const props = extrairPropriedadesDaFeature(features[activeIndex]);
    return portalComTabela(
        ref,
        portalContainer,
        pos,
        dragging,
        props,
        onCloseTab, // passamos a função de fechar aba (gerencia tudo)
        features,
        activeIndex,
        onSelectTab,
        onCloseTab
    );
}

/**
 * 🌀 portalComTabela
 * 
 * Cria um portal React com um painel flutuante contendo título e uma tabela de dados.
 * É renderizado fora da árvore principal de React, dentro do `portalContainer` definido
 * dinamicamente (document.body ou o container do mapa se estiver fullscreen).
 * 
 * @param {React.RefObject} ref - Referência para o DOM da HUD flutuante
 * @param {HTMLElement} container - Container externo onde o portal será anexado
 * @param {{x: number, y: number}} pos - Posição absoluta da HUD
 * @param {boolean} dragging - Se estiver sendo arrastado, ativa cursor especial
 * @param {Object} props - Propriedades da feature a serem exibidas
 * @param {Function} onClose - Callback para fechar a HUD
 * @returns {JSX.Element} Componente JSX com título e tabela, injetado via portal
 */
function portalComTabela(
    ref,
    container,
    pos,
    dragging,
    props,
    onCloseTab,
    features,
    activeIndex,
    onSelectTab,
    handleCloseTab
) {
    return createPortal(
        <div
            className="geo-flutuante"
            ref={ref}
            style={{
                top: pos.y,
                left: pos.x,
                zIndex: 9999,
                cursor: dragging ? 'grabbing' : 'default'
            }}
        >
            <Header
                entries={features}
                activeIndex={activeIndex}
                onSelectTab={onSelectTab}
                onCloseTab={handleCloseTab}
            />
            {renderTabela(extrairLinhasTabela(props))}
        </div>,
        container
    );
}

/**
 * 🧠 extrairPropriedadesDaFeature
 * 
 * Garante que a feature recebida é válida e extrai suas propriedades.
 * Utiliza a estrutura padrão de objetos GeoJSON (`feature.properties`).
 *
 * @param {Object} feature - Objeto GeoJSON contendo a feature a ser analisada
 * @returns {Object} Propriedades extraídas da feature, ou objeto vazio
 */
function extrairPropriedadesDaFeature(feature) {
    if (!temFeature(feature)) return {}; // ❌ Nenhuma feature fornecida
    return obterProps(feature);          // ✅ Extrai propriedades da feature válida
}

/**
 * ✅ temFeature
 * 
 * Verifica se a feature é um valor definido (não nulo/não undefined).
 *
 * @param {*} f - Valor genérico a ser testado
 * @returns {boolean} Verdadeiro se a feature for válida
 */
function temFeature(f) {
    return f != null;
}

/**
 * 📦 obterProps
 * 
 * Extrai o campo `.properties` de uma feature GeoJSON.
 * Se o campo estiver ausente, retorna um objeto vazio.
 *
 * @param {Object} f - Feature GeoJSON contendo propriedades
 * @returns {Object} Objeto de propriedades ou `{}` vazio
 */
function obterProps(f) {
    return f.properties || {};
}

/**
 * 🧾 extrairLinhasTabela
 * 
 * Extrai linhas de dados para exibição na tabela.
 * Tenta usar uma tabela HTML embutida na `description`, se existir.
 * Caso contrário, retorna um array de pares [chave, valor] com base nas propriedades.
 *
 * @param {Object} props - Objeto com as propriedades da feature
 * @returns {Array<[string, any]>} Array de pares chave-valor para renderização
 */
function extrairLinhasTabela(props) {
    // Se description é objeto com value, use o value
    const desc = props.description;
    if (desc && typeof desc === 'object' && desc['@type'] === 'html' && desc.value) {
        return extrairTabelaDeDescription(desc.value) ?? Object.entries(props);
    }
    // Se description é string, tenta extrair tabela normalmente
    if (typeof desc === 'string') {
        return extrairTabelaDeDescription(desc) ?? Object.entries(props);
    }
    // Fallback: retorna todas as propriedades
    return Object.entries(props);
}

/**
 * 📦 Header
 * 
 * Renderiza o cabeçalho com abas das features importadas.
 * Cada aba mostra o nome (ou fallback) da feature.
 * 
 * @param {Object[]} entries - Features importadas
 * @param {number} activeIndex - Índice da aba ativa
 * @param {Function} onSelectTab - Seleciona uma aba
 * @param {Function} onCloseTab - Fecha aba (ou todas)
 */
function Header({ entries, activeIndex, onSelectTab, onCloseTab }) {
    return (
        <div className="geo-header">
            {entries.map((entry, i) =>
                renderAba(entry, i, activeIndex, onSelectTab, onCloseTab)
            )}
            {renderBotaoFecharTudo(onCloseTab)}
        </div>
    );
}

function renderAba(entry, i, activeIndex, onSelectTab, onCloseTab) {
    const isAtiva = i === activeIndex;
    return (
        <span
            key={i}
            className={`aba ${isAtiva ? 'ativa' : ''}`}
            onClick={() => onSelectTab(i)}
            onContextMenu={e => handleContextMenu(e, i, onCloseTab)}
        >
            {extrairNomeDaFeature(entry)}
            {isAtiva && renderBotaoFecharAba(i, onCloseTab)}
        </span>
    );
}
function handleContextMenu(e, i, onCloseTab) {
    e.preventDefault();
    onCloseTab(i);
}
function renderBotaoFecharAba(i, onCloseTab) {
    return (
        <button
            className="fechar"
            onClick={e => {
                e.stopPropagation();
                onCloseTab(i);
            }}
        >
            ×
        </button>
    );
}
function renderBotaoFecharTudo(onCloseTab) {
    return (
        <button
            className="geo-close-all"
            onClick={e => {
                e.stopPropagation();
                onCloseTab(-1);
            }}
            title="Fechar tudo"
        >
            ×
        </button>
    );
}

/**
 * 🏷️ extrairNomeDaFeature
 * Retorna o campo mais amigável para nomear a aba.
 * 
 * @param {Object} entry 
 * @returns {string}
 */
function extrairNomeDaFeature(entry = {}) {
    // Adapte aqui para o seu dado! Pode usar 'name', 'mn_no', etc.
    const props = entry.properties || {};
    return (
        props.name ||
        props.mn_no ||
        props.city ||
        props.municipality ||
        props.FID ||
        'Importado'
    );
}


/**
 * 📊 renderTabela
 * 
 * Renderiza uma tabela HTML com pares chave-valor.
 * - Cada linha representa um campo (propriedade) da feature importada.
 * - O valor é interpretado como HTML, permitindo formatações avançadas como links, negrito, etc.
 *
 * ⚠️ Usa `dangerouslySetInnerHTML` para permitir conteúdo HTML no valor.
 * Certifique-se de que os dados são confiáveis para evitar XSS.
 *
 * @param {Array<[string, string]>} linhas - Lista de pares [campo, valor] para exibir na tabela
 * @returns {JSX.Element} Tabela renderizada com dados da feature
 */
function renderTabela(linhas) {
    return (
        <div className="geo-table-container">
            <table className="geo-table">
                <thead>
                    <tr>
                        <th className="geo-table-key">Campo</th>
                        <th className="geo-table-value">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    {linhas.map(([chave, valor], i) => (
                        <tr key={i}>
                            <td className="geo-table-key">{chave}</td>
                            <td
                                className="geo-table-value"
                                dangerouslySetInnerHTML={{ __html: valor }}
                            />
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

//
// == Centralização da HUD flutuante ==
// Este módulo posiciona automaticamente o popup no centro da tela
// caso nenhuma posição específica tenha sido fornecida.
//

/**
 * 🎯 centralizarPopup
 *
 * Centraliza a HUD na tela ao carregar, se não houver `posicao` definida.
 * Usa a largura/altura do elemento para calcular a centralização.
 *
 * @param {React.RefObject<HTMLElement>} ref - Referência ao DOM da HUD
 * @param {Object|null} posicao - Posição fornecida (ou nula, para aplicar centralização)
 * @param {Function} setPos - Setter do hook de estado para atualizar a posição
 */
function centralizarPopup(ref, posicao, setPos) {
    if (naoPrecisaCentralizar(posicao, ref)) return; // 🔒 Evita sobrescrever posição já definida
    setPos(calcularCentro(ref.current));             // 📍 Aplica centralização baseada nas dimensões
}

/**
 * 🔐 naoPrecisaCentralizar
 *
 * Determina se a centralização é desnecessária.
 * Retorna `true` se já existe uma posição definida ou o DOM ainda não foi montado.
 *
 * @param {Object|null} posicao - Objeto de posição (x, y) ou null
 * @param {React.RefObject<HTMLElement>} ref - Referência ao DOM do elemento
 * @returns {boolean} Verdadeiro se deve pular a centralização
 */
function naoPrecisaCentralizar(posicao, ref) {
    return posicao || !ref.current;
}

/**
 * 🧮 calcularCentro
 *
 * Calcula a posição (x, y) para centralizar um elemento na tela
 * com base em seu tamanho e no tamanho da janela.
 *
 * @param {HTMLElement} el - Elemento DOM cujo tamanho será usado para centralizar
 * @returns {{x: number, y: number}} Coordenadas centralizadas
 */
function calcularCentro(el) {
    const { width, height } = el.getBoundingClientRect(); // 📏 Captura dimensões atuais do DOM
    return {
        x: window.innerWidth / 2 - width / 2,
        y: window.innerHeight / 2 - height / 2
    };
}

//
// == Configuração de Drag da HUD flutuante ==
// Este módulo implementa o comportamento completo de arrastar o painel de detalhes.
// Garante fluidez, precisão e integração com o estado da aplicação.
//

/**
 * 🔧 configurarDrag
 *
 * Aplica a lógica de drag manual à HUD. Conecta os eventos de mouse aos elementos e
 * ao mapa para permitir que o usuário arraste o painel livremente pela tela.
 * 
 * @param {React.RefObject<HTMLElement>} ref - Referência DOM do painel flutuante
 * @param {L.Map} map - Instância do mapa Leaflet (usada para desabilitar o pan durante drag)
 * @param {{x: number, y: number}} pos - Posição atual do painel
 * @param {Function} setPos - Setter de posição do painel (useState)
 * @param {boolean} dragging - Flag indicando se o painel está sendo arrastado
 * @param {Function} setDragging - Setter do estado de dragging
 * @param {React.MutableRefObject<{x: number, y: number}>} offsetRef - Offset calculado no clique inicial
 * @returns {Function|undefined} Função de cleanup (remove listeners) ou `undefined` se setup inválido
 */
function configurarDrag(ref, map, pos, setPos, dragging, setDragging, offsetRef) {
    const el = ref.current;
    if (!podeConfigurar(el, map)) return;

    prepararElementoParaDrag(el); // 🔒 Impede propagação indesejada de eventos ao mapa

    // 🎮 Define os handlers para os três estágios do drag
    const mover = criarHandlerMover(dragging, setPos, offsetRef);
    const soltar = criarHandlerSoltar(dragging, setDragging, map);
    const pegar = criarHandlerPegar(pos, offsetRef, setDragging, map);

    const header = el.querySelector('.geo-header'); // ⬆️ Área superior como gatilho de movimentação

    registrarEventos(header, pegar, mover, soltar); // 🧷 Ativa eventos globais

    return () => removerEventos(header, pegar, mover, soltar); // ♻️ Garante desmontagem segura
}

/**
 * ✅ podeConfigurar
 *
 * Verifica se o drag pode ser inicializado (DOM e mapa disponíveis).
 *
 * @param {HTMLElement|null} el - Elemento DOM da HUD
 * @param {L.Map|null} map - Instância do mapa
 * @returns {boolean} `true` se ambos estão definidos
 */
function podeConfigurar(el, map) {
    return el && map;
}

/**
 * 🧼 prepararElementoParaDrag
 *
 * Impede propagação de eventos de clique e rolagem do elemento HUD para o mapa.
 *
 * @param {HTMLElement} el - Elemento DOM a ser isolado do mapa
 */
function prepararElementoParaDrag(el) {
    DomEvent.disableClickPropagation(el);
    DomEvent.disableScrollPropagation(el);
}

/**
 * 📎 registrarEventos
 * 
 * Ativa os listeners necessários para que o drag funcione corretamente:
 * - mouse down no header inicia o movimento
 * - mouse move atualiza a posição da HUD
 * - mouse up encerra o movimento e libera o mapa
 * 
 * @param {HTMLElement|null} header - Elemento clicável que inicia o drag
 * @param {Function} pegar - Handler de início do drag (mousedown)
 * @param {Function} mover - Handler de movimento contínuo (mousemove)
 * @param {Function} soltar - Handler de finalização (mouseup)
 */
function registrarEventos(header, pegar, mover, soltar) {
    header?.addEventListener('mousedown', pegar);      // 🖱️ Início do arrasto.
    document.addEventListener('mousemove', mover);     // 🚛 Movimento contínuo.
    document.addEventListener('mouseup', soltar);      // 🧯 Soltar = encerrar drag.
}

/**
 * ❌ removerEventos
 * 
 * Remove os listeners de drag previamente registrados. Essencial para evitar:
 * - Vazamento de memória
 * - Duplicidade de eventos
 * 
 * @param {HTMLElement|null} header - Elemento onde o drag começa
 * @param {Function} pegar - Handler de mousedown
 * @param {Function} mover - Handler de mousemove
 * @param {Function} soltar - Handler de mouseup
 */
function removerEventos(header, pegar, mover, soltar) {
    header?.removeEventListener('mousedown', pegar);
    document.removeEventListener('mousemove', mover);
    document.removeEventListener('mouseup', soltar);
}

/**
 * 🧲 criarHandlerMover
 * 
 * Gera o callback de `mousemove` que recalcula a posição do painel de HUD
 * com base na posição atual do mouse e no offset de clique inicial.
 * 
 * @param {boolean} dragging - Indica se o drag está ativo
 * @param {Function} setPos - Setter de posição (via useState)
 * @param {React.MutableRefObject<{x: number, y: number}>} offsetRef - Offset entre clique e HUD
 * @returns {Function} Handler de `mousemove`
 */
function criarHandlerMover(dragging, setPos, offsetRef) {
    return e => {
        if (!dragging) return;
        setPos({
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y
        });
    };
}

/**
 * 🧯 criarHandlerSoltar
 * 
 * Finaliza o drag ao soltar o botão do mouse. Reativa a movimentação do mapa
 * caso tenha sido desativada durante o drag.
 * 
 * @param {boolean} dragging - Estado atual do movimento
 * @param {Function} setDragging - Setter para desativar o estado de dragging
 * @param {L.Map} map - Instância do mapa Leaflet
 * @returns {Function} Handler de `mouseup`
 */
function criarHandlerSoltar(dragging, setDragging, map) {
    return () => {
        if (!dragging) return;
        setDragging(false);
        map.dragging.enable(); // 🧭 Reativa o pan do mapa.
    };
}

//
// == Manipulação de drag na interface flutuante ==
// Permite que a HUD (painel flutuante) seja arrastada manualmente,
// sem ativar o comportamento padrão do mapa.
//

/**
 * 🖱️ criarHandlerPegar
 *
 * Cria o handler para o evento de `mousedown` no painel flutuante.
 * Responsável por iniciar a lógica de arrastar:
 * - Verifica se o clique é permitido
 * - Calcula o deslocamento (offset)
 * - Desativa o drag do mapa Leaflet
 *
 * @param {{x: number, y: number}} pos - Posição atual da HUD
 * @param {React.MutableRefObject<{x: number, y: number}>} offsetRef - Ref para armazenar o deslocamento
 * @param {Function} setDragging - Setter para ativar o estado de arrasto
 * @param {L.Map} map - Instância do mapa Leaflet
 * @returns {Function} Handler para o evento de `mousedown`
 */
function criarHandlerPegar(pos, offsetRef, setDragging, map) {
    return e => {
        if (deveIgnorarClique(e)) return;         // ❌ Cancela se o clique não for válido

        prepararDrag(e, pos, offsetRef);          // 📐 Define o deslocamento inicial com base no clique
        iniciarDrag(setDragging, map);            // 🧭 Ativa o estado de arrasto e desativa o pan do mapa
    };
}

/**
 * 🔒 deveIgnorarClique
 *
 * Valida se o clique é adequado para iniciar um arrasto:
 * - Aceita apenas botão esquerdo do mouse
 * - Ignora se clicou em um botão de fechar
 *
 * @param {MouseEvent} e - Evento de clique
 * @returns {boolean} Verdadeiro se deve ignorar o clique
 */
function deveIgnorarClique(e) {
    return e.button !== 0 || e.target.closest('.fechar');
}

/**
 * 📐 prepararDrag
 *
 * Calcula a diferença entre a posição do mouse e a posição atual do HUD.
 * Essa diferença é armazenada para manter o HUD fixo ao cursor durante o arrasto.
 *
 * @param {MouseEvent} e - Evento de clique
 * @param {{x: number, y: number}} pos - Posição atual da HUD
 * @param {React.MutableRefObject<{x: number, y: number}>} offsetRef - Ref com o offset calculado
 */
function prepararDrag(e, pos, offsetRef) {
    e.preventDefault(); // 🛑 Evita seleção de texto, imagens etc.
    offsetRef.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y
    };
}

/**
 * 🚀 iniciarDrag
 *
 * Ativa o estado de arrasto no componente HUD e desativa a movimentação (pan)
 * do mapa para evitar conflitos enquanto a HUD está sendo movida.
 *
 * @param {Function} setDragging - Setter para ativar estado de dragging
 * @param {L.Map} map - Mapa Leaflet onde o drag será temporariamente desativado
 */
function iniciarDrag(setDragging, map) {
    setDragging(true);        // 🎯 HUD entra em modo "arrastando"
    map.dragging.disable();   // 🧭 Pan do mapa desativado temporariamente
}

//
// == Extração de tabela de um HTML de descrição ==
// Este módulo interpreta uma string HTML, identifica a presença de uma <table>
// e extrai suas linhas em formato [chave, valor].
// Utilizado, por exemplo, para exibir metadados de uma feature geográfica
// importada via KML ou GeoJSON enriquecido.
//

// 🧾 extrairTabelaDeDescription:
// Ponto de entrada principal. Recebe uma string HTML contendo (ou não) uma <table>.
// Retorna uma lista de pares [chave, valor] ou null se não houver tabela.
function extrairTabelaDeDescription(descriptionHTML) {
    if (!temTabela(descriptionHTML)) return null;               // 🔒 Segurança: ignora se não houver <table>.
    return extrairLinhasDaTabela(descriptionHTML);              // ✅ Continua extraindo se for válido.
}

// 🔍 temTabela:
// Faz uma verificação rápida e segura para checar se o HTML inclui uma <table>.
// Ajuda a evitar operações desnecessárias de parsing no DOM.
function temTabela(html) {
    return typeof html === 'string' && html.includes('<table'); // 📌 Checagem mínima e eficiente.
}

// 📊 extrairLinhasDaTabela:
// Converte o HTML bruto em um fragmento DOM isolado e extrai todas as linhas <tr>.
// Cada linha é convertida em um par [campo, valor] usando a função extrairParChaveValor.
function extrairLinhasDaTabela(html) {
    const div = criarContainerHTML(html);
    // Seleciona todas as tabelas
    const tabelas = div.querySelectorAll('table');
    // Usa a segunda tabela (índice 1), que é a de dados
    const tabelaDados = tabelas.length > 1 ? tabelas[1] : tabelas[0];
    if (!tabelaDados) return [];
    // Seleciona apenas os <tr> dessa tabela
    const linhas = tabelaDados.querySelectorAll('tr');
    return Array.from(linhas).map(extrairParChaveValor);
}

// 🧪 criarContainerHTML:
// Transforma uma string HTML em um objeto DOM navegável.
// Permite fazer queries como querySelector em um ambiente controlado e isolado.
function criarContainerHTML(html) {
    const div = document.createElement('div'); // 🧱 Container temporário.
    div.innerHTML = html;                      // 🧠 Insere o HTML a ser processado.
    return div;                                // 🔙 Retorna para análise.
}

//
// == Extração de chave-valor a partir de linhas de tabela ==
// Esse módulo transforma elementos <tr> em pares de dados legíveis.
// Útil para ler estruturas HTML e convertê-las em objetos de dados.
// Geralmente utilizado para exibir propriedades de uma feature geoespacial.
//

/**
 * 🧮 extrairParChaveValor
 * Converte uma linha HTML (<tr>) em um par [chave, valor].
 * A primeira célula (td/th) é considerada a chave; a segunda, o valor.
 * 
 * @param {HTMLTableRowElement} tr - Linha da tabela contendo dados.
 * @returns {[string, string]} Par representando [campo, conteúdo].
 */
function extrairParChaveValor(tr) {
    const [chave, valor] = obterCelulas(tr); // 🔍 Divide a linha em partes.
    return [chave, valor];
}

/**
 * 📦 obterCelulas
 * Extrai as duas primeiras células (td ou th) de uma linha <tr>.
 * Usa textContent da primeira e innerHTML da segunda.
 * 
 * @param {HTMLTableRowElement} tr - Elemento de linha de tabela.
 * @returns {[string, string]} Texto puro da chave e HTML bruto do valor.
 */
function obterCelulas(tr) {
    // Filtra apenas elementos do tipo Element (td/th), ignora nós de texto
    const tds = Array.from(tr.childNodes).filter(
        node => node.nodeType === 1 && (node.tagName === 'TD' || node.tagName === 'TH')
    );
    return [extrairTexto(tds[0]), extrairHTML(tds[1])];
}

/**
 * 🔤 extrairTexto
 * Retorna apenas o texto limpo de um elemento DOM.
 * 
 * @param {HTMLElement} el - Célula da tabela (td ou th).
 * @returns {string} Conteúdo textual da célula.
 */
function extrairTexto(el) {
    if (!el) return '';             // 🚫 Fallback seguro.
    return el.textContent;          // 📄 Conteúdo limpo.
}

/**
 * 🧾 extrairHTML
 * Retorna o conteúdo HTML bruto de um elemento DOM.
 * 
 * @param {HTMLElement} el - Célula da tabela (geralmente <td>).
 * @returns {string} HTML interno da célula.
 */
function extrairHTML(el) {
    if (!el) return '';             // 🚫 Sem elemento, sem conteúdo.
    return el.innerHTML;            // 🧱 Preserva estrutura.
}
