// src/components/layout/GeocodedFeatureViewer.jsx

// 🎯 Importações essenciais para composição do componente React
import React, {
    useLayoutEffect,  // ⏱️ Permite executar lógica imediatamente após o layout ser calculado
    useRef,           // 📌 Utilizado para criar referências mutáveis a elementos DOM
    useState,         // 🔁 Hook para estado reativo local
    useEffect         // 🔄 Executa efeitos colaterais após renderizações
} from 'react';
void React // 📦 Garante que o React seja mantido no bundle mesmo que não haja JSX direto

// 🧭 Biblioteca Leaflet para manipulação de eventos no DOM do mapa
import { DomEvent } from 'leaflet';

// 🔌 Utilitário do React para renderizar elementos fora da hierarquia tradicional de componentes
import { createPortal } from 'react-dom';

// 🎨 Estilo CSS específico para o painel visualizador de feições geocodificadas
import '@styles/GeocodedFeatureViewer.css';

/**
 * 📍 GeocodedFeatureViewer
 * 
 * Componente visual que exibe uma HUD (janela flutuante) com os dados geográficos geocodificados.
 * Permite:
 * - Navegar entre múltiplas entradas
 * - Fechar abas individualmente
 * - Movê-la na tela via arrasto
 * 
 * @param {Object[]} entries - Lista de features geocodificadas
 * @param {number} activeIndex - Índice da feature atualmente ativa
 * @param {Function} onSelectTab - Função de callback para trocar de aba
 * @param {Function} onCloseTab - Função de callback para fechar aba
 * @param {Object} leafletMap - Instância do mapa Leaflet
 */
export default function GeocodedFeatureViewer({ entries, activeIndex, onSelectTab, onCloseTab, leafletMap }) {
    const data = entries[activeIndex];                    // 🎯 Feature ativa no momento
    const containerRef = useRef(null);                    // 📦 Referência ao DOM da HUD
    const offsetRef = useRef({ x: 0, y: 0 });             // ✋ Armazena offset para arrasto
    const [pos, setPos] = useState({ x: 100, y: 100 });   // 📍 Estado reativo da posição
    const [dragging, setDragging] = useState(false);      // 🖱️ Estado do arrasto
    const [portalContainer, setPortalContainer] = useState(() => document.body); // 🌀 Onde será montado o portal da HUD

    // 🧠 Efeitos auxiliares de comportamento da HUD
    useEfeitosHud(containerRef, leafletMap, setPos, setPortalContainer, portalContainer, pos, setPos, dragging, setDragging, offsetRef);

    // 🎨 Renderização condicional: só exibe se houver dado ativo
    return data
        ? renderizarHud(data, entries, activeIndex, onSelectTab, onCloseTab, containerRef, pos, dragging, portalContainer)
        : null;
}

/**
 * 🧩 useEfeitosHud
 * Composição de hooks auxiliares de comportamento:
 * - Centraliza a HUD ao iniciar
 * - Sincroniza com container do mapa
 * - Permite arrastar o painel
 */
function useEfeitosHud(ref, map, setPos, setPortalContainer, portalContainer, pos, setPos2, dragging, setDragging, offsetRef) {
    useCentralizarHud(ref, setPos); // 🧭 Centraliza no primeiro render
    useFullscreenPortal(map, setPortalContainer); // 🔗 Alinha com container Leaflet
    useHudDrag(ref, map, pos, setPos2, dragging, setDragging, offsetRef, portalContainer); // ✋ Ativa o drag-and-drop
}

/**
 * 🎨 renderizarHud
 * Gera o componente visual da HUD e o injeta via portal.
 * 
 * @returns {JSX.Element}
 */
function renderizarHud(data, entries, activeIndex, onSelectTab, onCloseTab, ref, pos, dragging, container) {
    return createPortal(
        <div
            className="geo-flutuante"
            ref={ref}
            style={{
                top: pos.y,
                left: pos.x,
                zIndex: 9999,
                cursor: dragging ? 'grabbing' : 'default' // 🖱️ Muda ícone ao arrastar
            }}
        >
            {/* Cabeçalho da HUD com abas e botão de fechar */}
            <Header
                entries={entries}
                activeIndex={activeIndex}
                onSelectTab={onSelectTab}
                onCloseTab={onCloseTab}
            />
            {/* Tabela com os dados geocodificados da feature */}
            <div className="geo-table-container">
                <TabelaDados data={data} />
            </div>
        </div>,
        container
    );
}

/**
 * 🏙️ extrairNomeDaCidade
 * Extrai um nome humano de cidade a partir de um objeto `address` (usualmente do Nominatim).
 * 
 * @param {Object} address - Objeto de endereço
 * @returns {string} Nome da localidade ou "Localização desconhecida"
 */
function extrairNomeDaCidade(address = {}) {
    return primeiroValorOuFallback(address, [
        'city',
        'town',
        'village',
        'municipality',
        'county',
        'state_district',
        'state'
    ], 'Localização desconhecida');
}

/**
 * 🔍 primeiroValorOuFallback
 *
 * Percorre uma lista de chaves e retorna o primeiro valor existente no objeto.
 * Caso nenhuma chave seja encontrada, retorna o valor `fallback`.
 *
 * @param {Object} obj - Objeto de origem
 * @param {string[]} chaves - Lista de chaves prioritárias
 * @param {*} fallback - Valor de retorno padrão
 * @returns {*} Valor encontrado ou fallback
 */
function primeiroValorOuFallback(obj, chaves, fallback) {
    const chaveEncontrada = chaves.find((chave) => !!obj[chave]);
    return obj[chaveEncontrada] || fallback;
}

/**
 * 🧭 useCentralizarHud
 *
 * Hook que centraliza visualmente a HUD (painel flutuante) na tela
 * assim que ela é montada no DOM. Usa `useLayoutEffect` para garantir
 * que o cálculo seja preciso após renderização.
 *
 * @param {React.RefObject} ref - Referência ao DOM da HUD
 * @param {Function} setPos - Setter de posição (x, y)
 */
function useCentralizarHud(ref, setPos) {
    useLayoutEffect(() => {
        if (!ref.current) return;

        const { width, height } = ref.current.getBoundingClientRect();

        setPos({
            x: window.innerWidth / 1.3 - width / 2.2,
            y: window.innerHeight / 1.3 - height / 2.2
        });
    }, []);
}

/**
 * 🔄 useFullscreenPortal
 *
 * Hook que monitora o modo de tela cheia no mapa.
 * Se o mapa for expandido em tela cheia, o portal da HUD será
 * realocado para dentro do container do Leaflet. Caso contrário, permanece em `document.body`.
 *
 * @param {L.Map} leafletMap - Instância do mapa Leaflet
 * @param {Function} setPortalContainer - Setter do container para o portal
 */
function useFullscreenPortal(leafletMap, setPortalContainer) {
    useEffect(() => {
        if (!leafletMap) return;

        const mapEl = leafletMap.getContainer();
        const updateContainer = criarAtualizadorDeContainer(mapEl, setPortalContainer);

        mapEl.addEventListener('fullscreenchange', updateContainer);
        updateContainer(); // 🔄 Inicializa container correto

        return () => mapEl.removeEventListener('fullscreenchange', updateContainer);
    }, [leafletMap]);
}

/**
 * 🛠️ criarAtualizadorDeContainer
 *
 * Cria uma função que atualiza o destino do portal da HUD
 * com base no estado de tela cheia.
 *
 * @param {HTMLElement} mapEl - Container DOM do Leaflet
 * @param {Function} setPortalContainer - Setter do container de destino
 * @returns {Function} Função de atualização do container
 */
function criarAtualizadorDeContainer(mapEl, setPortalContainer) {
    return () => {
        const isFullscreen = estaEmFullscreen(mapEl);
        setPortalContainer(isFullscreen ? mapEl : document.body);
    };
}

/**
 * 🔍 estaEmFullscreen
 *
 * Detecta se um elemento (normalmente o mapa) está em modo de tela cheia.
 * Considera tanto a classe CSS quanto o DOM fullscreen API.
 *
 * @param {HTMLElement} el - Elemento a ser testado
 * @returns {boolean} Verdadeiro se estiver em fullscreen
 */
function estaEmFullscreen(el) {
    return (
        el.classList.contains('leaflet-fullscreen-on') ||
        document.fullscreenElement === el
    );
}

/**
 * 🧲 useHudDrag
 *
 * Hook que adiciona comportamento de arrastar à HUD flutuante do mapa.
 * Permite clicar e mover a janela interativa sobre a tela, enquanto desativa temporariamente o "drag" do mapa.
 *
 * @param {React.RefObject} ref - Referência ao elemento da HUD (DOM)
 * @param {L.Map} leafletMap - Instância do mapa Leaflet
 * @param {{x: number, y: number}} pos - Posição atual da HUD
 * @param {Function} setPos - Setter da nova posição
 * @param {boolean} dragging - Flag de estado atual de arrasto
 * @param {Function} setDragging - Setter do estado de arrasto
 * @param {React.MutableRefObject} offsetRef - Referência à diferença entre mouse e HUD no início do arrasto
 * @param {HTMLElement} portalContainer - Container onde a HUD está sendo renderizada (usado para escopo de eventos)
 */
function useHudDrag(ref, leafletMap, pos, setPos, dragging, setDragging, offsetRef, portalContainer) {
    useEffect(() => {
        const el = ref.current;
        if (!podeConfigurarDrag(el, leafletMap)) return;

        prepararElementoParaDrag(el);

        const handleMouseDown = criarHandleMouseDown(pos, offsetRef, setDragging, leafletMap);
        const handleMouseMove = criarHandleMouseMove(dragging, offsetRef, setPos);
        const handleMouseUp = criarHandleMouseUp(dragging, setDragging, leafletMap);

        const header = el.querySelector('.geo-header');
        registrarEventosDrag(header, handleMouseDown, handleMouseMove, handleMouseUp);

        return () => removerEventosDrag(header, handleMouseDown, handleMouseMove, handleMouseUp);
    }, [dragging, leafletMap, pos, portalContainer]);
}

/**
 * 🔒 podeConfigurarDrag
 *
 * Verifica se há elementos e mapa válidos antes de ativar o comportamento de arrasto.
 *
 * @param {HTMLElement} el
 * @param {L.Map} map
 * @returns {boolean}
 */
function podeConfigurarDrag(el, map) {
    return el && map;
}

/**
 * 🛡️ prepararElementoParaDrag
 *
 * Evita que o clique e rolagem sobre a HUD interfiram no comportamento do mapa.
 *
 * @param {HTMLElement} el
 */
function prepararElementoParaDrag(el) {
    DomEvent.disableClickPropagation(el);
    DomEvent.disableScrollPropagation(el);
}

/**
 * 🧱 criarHandleMouseDown
 *
 * Retorna o callback do evento de `mousedown`:
 * - Inicia o modo de arrasto
 * - Calcula o offset entre mouse e HUD
 * - Desativa drag do mapa
 *
 * @param {{x: number, y: number}} pos
 * @param {React.MutableRefObject} offsetRef
 * @param {Function} setDragging
 * @param {L.Map} map
 * @returns {Function}
 */
function criarHandleMouseDown(pos, offsetRef, setDragging, map) {
    return (e) => {
        if (deveIgnorarCliqueDrag(e)) return;

        prepararOffsetInicial(e, pos, offsetRef);
        setDragging(true);
        map.dragging.disable(); // impede que o mapa reaja enquanto a HUD é arrastada
    };
}

/**
 * ❌ deveIgnorarCliqueDrag
 *
 * Impede início de arrasto caso:
 * - Clique não seja com botão esquerdo (e.button !== 0)
 * - Clique seja sobre botão de fechar (evita conflito)
 *
 * @param {MouseEvent} e
 * @returns {boolean}
 */
function deveIgnorarCliqueDrag(e) {
    return e.button !== 0 || e.target.closest('.fechar');
}

/**
 * 🎯 prepararOffsetInicial
 *
 * Calcula o deslocamento (offset) entre o ponto do mouse e a posição atual da HUD,
 * para que o arrasto ocorra de forma natural (sem "pular").
 *
 * @param {MouseEvent} e - Evento do clique do mouse
 * @param {{x: number, y: number}} pos - Posição atual da HUD
 * @param {React.MutableRefObject<{x: number, y: number}>} offsetRef - Ref que armazenará a diferença entre mouse e HUD
 */
function prepararOffsetInicial(e, pos, offsetRef) {
    e.preventDefault(); // ⛔ Evita seleção de texto e outros efeitos nativos

    // Calcula a diferença entre onde o mouse clicou e a posição da HUD
    offsetRef.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y
    };
}

/**
 * 🖱️ criarHandleMouseMove
 *
 * Retorna o handler do evento de movimento do mouse.
 * Enquanto o mouse se move e o estado `dragging` for verdadeiro,
 * atualiza a posição da HUD com base no deslocamento calculado.
 *
 * @param {boolean} dragging - Estado atual de arrasto
 * @param {React.MutableRefObject<{x: number, y: number}>} offsetRef - Diferença inicial entre mouse e HUD
 * @param {Function} setPos - Setter da nova posição da HUD
 * @returns {Function} - Handler para o evento 'mousemove'
 */
function criarHandleMouseMove(dragging, offsetRef, setPos) {
    return (e) => {
        if (!dragging) return;

        setPos({
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y
        });
    };
}

/**
 * 🛑 criarHandleMouseUp
 *
 * Retorna o handler do evento de soltar o botão do mouse (fim do arrasto).
 * Restaura o comportamento padrão de movimentação do mapa.
 *
 * @param {boolean} dragging - Estado atual de arrasto
 * @param {Function} setDragging - Setter que finaliza o estado de arrasto
 * @param {L.Map} map - Instância do mapa Leaflet
 * @returns {Function} - Handler para o evento 'mouseup'
 */
function criarHandleMouseUp(dragging, setDragging, map) {
    return () => {
        if (!dragging) return;

        setDragging(false);      // 🧯 Finaliza o arrasto
        map.dragging.enable();   // 🗺️ Reativa arrasto do mapa
    };
}

/**
 * 🧷 registrarEventosDrag
 *
 * Registra os ouvintes de eventos necessários para permitir arrastar a HUD.
 * O mouse down é aplicado apenas no cabeçalho da HUD,
 * enquanto os eventos de movimento e soltura do mouse são globais (document).
 *
 * @param {HTMLElement} header - Elemento DOM que serve como alça de arrasto
 * @param {Function} down - Handler para o evento 'mousedown'
 * @param {Function} move - Handler para o evento 'mousemove'
 * @param {Function} up - Handler para o evento 'mouseup'
 */
function registrarEventosDrag(header, down, move, up) {
    header?.addEventListener('mousedown', down);  // Inicia arrasto ao clicar no header
    document.addEventListener('mousemove', move); // Move a HUD conforme o mouse
    document.addEventListener('mouseup', up);     // Finaliza o arrasto ao soltar
}

/**
 * 🧼 removerEventosDrag
 *
 * Remove os listeners registrados anteriormente para arrastar a HUD.
 * Essencial para evitar vazamento de memória e comportamentos inesperados.
 *
 * @param {HTMLElement} header - Elemento DOM que servia como alça de arrasto
 * @param {Function} down - Handler do evento 'mousedown' a ser removido
 * @param {Function} move - Handler do evento 'mousemove' a ser removido
 * @param {Function} up - Handler do evento 'mouseup' a ser removido
 */
function removerEventosDrag(header, down, move, up) {
    header?.removeEventListener('mousedown', down);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
}

// Prevent unused import warning
void Header;

/**
 * 📦 Header
 *
 * Componente React que representa o cabeçalho da HUD geocodificada.
 * Responsável por:
 * - Mostrar as abas disponíveis
 * - Destacar a aba ativa
 * - Permitir alternância e fechamento individual
 * - Exibir o botão de fechar todas as abas
 *
 * @param {Object[]} entries - Lista de entradas (features geocodificadas)
 * @param {number} activeIndex - Índice da aba atualmente ativa
 * @param {Function} onSelectTab - Callback para selecionar uma aba
 * @param {Function} onCloseTab - Callback para fechar uma aba ou todas
 * @returns {JSX.Element} Cabeçalho renderizado com abas interativas
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

/**
 * 📌 renderAba
 *
 * Renderiza uma aba individual no cabeçalho da HUD.
 * A aba representa uma feature geocodificada e pode ser:
 * - Selecionada com clique esquerdo
 * - Fechada com clique direito (context menu)
 * - Decorada com botão de fechar se estiver ativa
 *
 * @param {Object} entry - Entrada (feature geocodificada)
 * @param {number} i - Índice da aba atual
 * @param {number} activeIndex - Índice da aba ativa
 * @param {Function} onSelectTab - Função para ativar aba ao clicar
 * @param {Function} onCloseTab - Função para fechar aba (ou todas)
 * @returns {JSX.Element} Elemento de aba interativa
 */
function renderAba(entry, i, activeIndex, onSelectTab, onCloseTab) {
    const isAtiva = i === activeIndex;

    return (
        <span
            key={i}
            className={`aba ${isAtiva ? 'ativa' : ''}`}
            onClick={() => onSelectTab(i)}                                // Seleciona a aba com clique
            onContextMenu={(e) => handleContextMenu(e, i, onCloseTab)}    // Fecha com botão direito
        >
            {extrairNomeDaCidade(entry)}                                   {/* Título da aba */}
            {renderBotaoFecharSeAtiva(isAtiva, i, onCloseTab)}             {/* [X] apenas se ativa */}
        </span>
    );
}

/**
 * 🖱️ handleContextMenu
 *
 * Trata o clique com botão direito sobre a aba.
 * O comportamento padrão do menu é bloqueado, e a aba é fechada via callback.
 *
 * @param {MouseEvent} e - Evento de clique com botão direito
 * @param {number} i - Índice da aba a ser fechada
 * @param {Function} onCloseTab - Callback de fechamento
 */
function handleContextMenu(e, i, onCloseTab) {
    e.preventDefault();    // Bloqueia menu de contexto padrão
    onCloseTab(i);         // Dispara remoção da aba
}

/**
 * ❌ renderBotaoFecharSeAtiva
 *
 * Renderiza o botão de fechar apenas se a aba estiver ativa.
 *
 * @param {boolean} isAtiva - Indica se a aba está atualmente selecionada
 * @param {number} i - Índice da aba
 * @param {Function} onCloseTab - Callback para fechar aba
 * @returns {JSX.Element|null} Botão de fechar, ou null se não ativo
 */
function renderBotaoFecharSeAtiva(isAtiva, i, onCloseTab) {
    if (!isAtiva) return null;
    return renderBotaoFecharAba(i, onCloseTab);
}

/**
 * ❌ renderBotaoFecharAba
 *
 * Renderiza o botão [×] para fechar uma aba individual.
 * O evento de clique é isolado para evitar propagação indesejada ao selecionar a aba.
 *
 * @param {number} i - Índice da aba a ser fechada
 * @param {Function} onCloseTab - Callback que fecha a aba
 * @returns {JSX.Element} Botão interativo [×]
 */
function renderBotaoFecharAba(i, onCloseTab) {
    return (
        <button
            className="fechar"
            onClick={(e) => {
                e.stopPropagation(); // 🚫 Impede que o clique afete seleção da aba
                onCloseTab(i);       // 🧹 Solicita o fechamento da aba
            }}
        >
            ×
        </button>
    );
}

/**
 * 🧨 renderBotaoFecharTudo
 *
 * Renderiza o botão global [×] para fechar todas as abas.
 * Passa o valor `-1` como sinal para indicar "fechar todas".
 *
 * @param {Function} onCloseTab - Callback de fechamento (aceita `-1` para todas)
 * @returns {JSX.Element} Botão interativo [×] com tooltip
 */
function renderBotaoFecharTudo(onCloseTab) {
    return (
        <button
            className="geo-close-all"
            onClick={(e) => {
                e.stopPropagation(); // 🚫 Isola o clique do restante do DOM
                onCloseTab(-1);      // 🧨 -1 → Fechar todas as abas
            }}
            title="Fechar tudo"
        >
            ×
        </button>
    );
}

/**
 * 📋 TabelaDados
 *
 * Renderiza uma tabela HTML com os pares chave/valor de uma feature geocodificada.
 * Objetos aninhados são serializados com `JSON.stringify`.
 *
 * @param {Object} props
 * @param {Object} props.data - Objeto contendo os dados a serem exibidos
 * @returns {JSX.Element} Tabela de dados formatada
 */
function TabelaDados({ data }) {
    return (
        <table className="geo-table">
            <thead>
                <tr>
                    <th className="geo-table-key">Campo</th>
                    <th className="geo-table-value">Valor</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(data).map(([key, value], i) => (
                    <tr key={i}>
                        <td className="geo-table-key">{key}</td>
                        <td className="geo-table-value">
                            {/* Objetos são convertidos para string JSON para legibilidade */}
                            {typeof value === 'object' ? JSON.stringify(value) : value}
                            
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
void TabelaDados; // Evita warning de importação não utilizada
