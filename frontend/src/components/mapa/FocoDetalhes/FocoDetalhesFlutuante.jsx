// src/components/mapa/FocoDetalhes/FocoDetalhesFlutuante.jsx

// 🎯 Importações essenciais para composição do componente React
import React, {
  useRef,     // 📌 Hook para manter referências entre renders (ex: DOM ou posição)
  useState    // 🔁 Estado local para controle de interações (ex: posição)
} from 'react';
void React // 🔒 Garante que o React seja incluído no bundle mesmo sem uso direto

// 🧱 ReactDOM.createPortal permite renderizar um componente fora da hierarquia padrão
import { createPortal } from 'react-dom';

// 🎨 Estilo visual específico para o painel flutuante de focos
import '@styles/FocoDetalhesFlutuante.css';

// 🧭 Hook customizado: calcula a posição inicial do painel com base na localização dos focos
import { useInitialCenter } from './useInitialCenter';

// 🔄 Hook customizado: alterna o contêiner do portal quando o mapa entra em fullscreen
import { useFullscreenPortal } from './useFullscreenPortal';

// 🖱️ Hook customizado: adiciona suporte a drag-and-drop da HUD flutuante
import { useDraggable } from './useDraggable';


/**
 * 🔥 FocoHeader
 * 
 * Componente visual responsável por renderizar o cabeçalho da HUD flutuante de detalhes.
 * Exibe:
 * - A quantidade total de focos selecionados
 * - Um botão de fechar, que dispara `onClose`
 * 
 * @param {Object} props
 * @param {number} props.count - Quantidade de focos selecionados
 * @param {Function} props.onClose - Callback executado ao clicar no botão de fechar
 */
function FocoHeader({ count, onClose }) {
  const handleClose = e => {
    e.stopPropagation(); // ⛔ Impede propagação do clique para o mapa
    onClose();           // 🔄 Dispara ação de fechamento
  };

  return (
    <div className="foco-header">
      <strong>Focos de calor ({count})</strong>
      <button className="fechar" onClick={handleClose}>×</button>
    </div>
  );
}
void FocoHeader // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX

/**
 * 🧩 FocoTableHead
 * 
 * Renderiza o cabeçalho da tabela de detalhes de focos.
 * Define os nomes das colunas com dados relevantes: data, horário, FRP, temperatura, etc.
 * 
 * @returns {JSX.Element} <thead> com títulos das colunas
 */
function FocoTableHead() {
  return (
    <thead>
      <tr>
        <th>Data</th>
        <th>Hora UTC+0</th>
        <th>FRP (MW)</th>
        <th>Temp. Brilho (K)</th>
        <th>Temp. sec. (K)</th>
        <th>Satélite</th>
        <th>Sensor</th>
        <th>Confiança</th>
        <th>Produto</th>
        <th>Período</th>
      </tr>
    </thead>
  );
}
void FocoTableHead // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX

/**
 * 📄 FocoRow
 *
 * Componente que renderiza uma linha (row) na tabela de focos de calor.
 * Cada linha corresponde a um único foco, exibindo seus atributos principais.
 * Utiliza `Array.map` para gerar dinamicamente cada célula da tabela.
 *
 * @param {Object} props
 * @param {Object} props.foco - Objeto contendo os dados de um foco individual
 * @returns {JSX.Element} <tr> com as células do foco
 */
function FocoRow({ foco }) {
  const values = [
    foco.dataAquisicao,
    foco.horaAquisicao,
    foco.potenciaRadiativa,
    foco.temperaturaBrilho,
    foco.temperaturaBrilhoSecundaria,
    foco.nomeSatelite,
    foco.instrumentoSensor,
    foco.nivelConfianca,
    foco.versaoProduto,
    foco.indicadorDiaNoite
  ];

  return (
    <tr>
      {values.map((val, i) => (
        <td key={i}>{val ?? '--'}</td> // Preenche com "--" se valor estiver ausente
      ))}
    </tr>
  );
}
void FocoRow // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX

/**
 * 📊 FocoTable
 *
 * Tabela que exibe múltiplos focos de calor com seus respectivos dados.
 * Monta o cabeçalho com <FocoTableHead /> e mapeia cada foco como linha via <FocoRow />.
 *
 * @param {Object} props
 * @param {Array<Object>} props.focos - Lista de focos para exibição
 * @returns {JSX.Element} <table> com cabeçalho e corpo dinâmico
 */
function FocoTable({ focos }) {
  return (
    <table>
      <FocoTableHead />
      <tbody>
        {focos.map((foco, i) => (
          <FocoRow key={i} foco={foco} />
        ))}
      </tbody>
    </table>
  );
}
void FocoTable // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX


/**
 * 📦 FocoContainer
 *
 * Container flutuante responsável por aplicar estilos de posicionamento e
 * gerenciar eventos de mouse (como movimentação e clique). Encapsula qualquer
 * conteúdo passado via `children`.
 *
 * @param {Object} props
 * @param {JSX.Element|JSX.Element[]} props.children - Conteúdo interno a ser renderizado
 * @param {{ x: number, y: number }} props.pos - Posição absoluta do container (em pixels)
 * @param {boolean} props.dragging - Indica se o container está sendo arrastado
 * @param {React.RefObject<HTMLDivElement>} props.containerRef - Referência ao DOM para controle externo
 * @returns {JSX.Element} <div> com conteúdo posicionado e estilizado
 */
function FocoContainer({ children, pos, dragging, containerRef }) {
  const handleMouseDown = e => {
    if (!e.target.closest('.fechar')) e.stopPropagation();
  };

  return (
    <div
      className="foco-flutuante"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onClick={handleMouseDown}
      style={{
        position: 'absolute',
        top: pos.y,
        left: pos.x,
        zIndex: 9999,
        cursor: dragging ? 'grabbing' : 'default'
      }}
    >
      {children}
    </div>
  );
}
void FocoContainer // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX

/**
 * 🧩 FocoContent
 *
 * Componente de alto nível que encapsula a visualização de focos de calor.
 * Usa <FocoContainer /> como estrutura externa e inclui cabeçalho e tabela de dados.
 *
 * @param {Object} props
 * @param {Array<Object>} props.focos - Lista de focos a serem exibidos
 * @param {Function} props.onClose - Função chamada ao fechar o painel
 * @param {{ x: number, y: number }} props.pos - Posição absoluta do container
 * @param {boolean} props.dragging - Indica se está sendo arrastado
 * @param {React.RefObject<HTMLDivElement>} props.containerRef - Referência ao container DOM
 * @returns {JSX.Element} Componente com cabeçalho e tabela dentro de container flutuante
 */
function FocoContent({ focos, onClose, pos, dragging, containerRef }) {
  return (
    <FocoContainer pos={pos} dragging={dragging} containerRef={containerRef}>
      <FocoHeader count={focos.length} onClose={onClose} />
      <FocoTable focos={focos} />
    </FocoContainer>
  );
}
void FocoContent // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX


/**
 * 📐 calculateInitial
 *
 * Calcula a posição inicial do container flutuante.
 * Retorna a posição fornecida ou uma posição padrão (0,0).
 *
 * @param {{ x: number, y: number } | undefined} posicaoInicial - Posição inicial opcional
 * @returns {{ x: number, y: number }} Posição inicial com fallback
 */
function calculateInitial(posicaoInicial) {
  return posicaoInicial || { x: 0, y: 0 };
}

/**
 * 🧱 FocoRender
 *
 * Componente funcional responsável por renderizar o painel de focos flutuante.
 * Utiliza hooks para calcular posicionamento, drag e portal.
 * Não toma decisões de lógica — apenas configura e renderiza.
 *
 * @param {Object} props
 * @param {Array<Object>} props.focos - Lista de focos a serem exibidos
 * @param {Function} props.onClose - Função chamada ao fechar o painel
 * @param {Object} props.leafletMap - Instância do mapa Leaflet para referência e posicionamento
 * @param {{ x: number, y: number } | undefined} props.posicaoInicial - Posição inicial opcional do container
 * @returns {JSX.Element} Portal com <FocoContent /> posicionado e interativo
 */
function FocoRender({ focos, onClose, leafletMap, posicaoInicial }) {
  const containerRef = useRef(null);
  const [pos, setPos] = useState(() => calculateInitial(posicaoInicial));

  useInitialCenter(containerRef, posicaoInicial, setPos);
  const portalContainer = useFullscreenPortal(leafletMap);
  const dragging = useDraggable(containerRef, leafletMap, pos, setPos, portalContainer);

  return createPortal(
    <FocoContent
      focos={focos}
      onClose={onClose}
      pos={pos}
      dragging={dragging}
      containerRef={containerRef}
    />,
    portalContainer
  );
}
void FocoRender // 🔒 Garante a inclusão no bundle, mesmo sem uso direto no JSX

/**
 * 🚀 FocoDetalhesFlutuante
 *
 * Componente exportado que inicializa o painel flutuante de focos.
 * Atua como um alias simples para <FocoRender />, repassando todas as props.
 *
 * @param {Object} props - Todas as props necessárias para FocoRender
 * @returns {JSX.Element} Instância de <FocoRender />
 */
export default function FocoDetalhesFlutuante(props) {
  return <FocoRender {...props} />;
}
