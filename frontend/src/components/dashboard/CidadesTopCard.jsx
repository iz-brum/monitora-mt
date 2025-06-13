// src/components/dashboard/CidadesTopCard.jsx

import { useEffect, useState } from 'react';
import '@styles/CidadesTopCard.css';
import { buscarCidadesComFocos } from '@services/cityService'

/**
 * Componente de ranking de cidades com focos de calor
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {string} props.titulo - Título dinâmico do card (deve conter 'FOCOS' para ativar funcionalidades)
 * 
 * @example
 * <CidadesTopCard titulo="TOP 10 CIDADES COM FOCOS" />
 * 
 * @description
 * - Exibe lista paginada de cidades com maior incidência
 * - Integra com serviço de indicadores para dados em tempo real
 * - Implementa virtualização básica para performance (slice de array)
 * 
 * @architecture
 * - Separação clara entre lógica de apresentação e gestão de dados
 * - Custom hook para gestão de estado assíncrono
 * - Componentes puros para renderização otimizada
 */
export default function CidadesTopCard({ titulo, onCidadeClick }) {
  const isFogo = titulo.includes('FOCOS'); // Determina modo de operação pelo título
  const cidades = useCidadesComFocos(isFogo); // Gestão de estado assíncrono via hook customizado
  const [mostrarTodas, setMostrarTodas] = useState(false); // Controle de visualização

  // Virtualização básica - exibe 10 itens inicialmente para performance
  const exibidas = mostrarTodas ? cidades : cidades.slice(0, 10);

  return (
    <div className={definirEstiloCard(isFogo)} role="region" aria-labelledby="cardTitle">
      <div id="cardTitle" className="titulo">{titulo}</div>

      <div className="conteudo" aria-live="polite">
        {renderizarConteudo(isFogo, exibidas, onCidadeClick)}
      </div>

      <BotaoToggle
        mostrar={mostrarTodas}
        total={cidades.length}
        onClick={() => setMostrarTodas(prev => !prev)}
      />
    </div>
  );
}

/**
 * Hook customizado para gestão de dados de cidades
 * 
 * @param {boolean} ativo - Flag para ativar/desativar o fetching
 * @returns {Array} Lista de cidades formatadas
 * 
 * @performance
 * - Evita chamadas desnecessárias quando componente está inativo
 * - Cache básico via estado local (considerar SWR/React Query para versão futura)
 */
function useCidadesComFocos(ativo) {
  const [cidades, setCidades] = useState([]);

  useEffect(() => {
    if (!ativo) return; // Bail-out pattern para evitar fetch desnecessário

    // Função fetch (pode ser extraída para fora do useEffect, se preferir)
    const fetchCidades = () => {
      buscarCidadesComFocos()
        .then(setCidades)
        .catch(console.error); // TODO: Implementar tratamento de erro global
    };

    // Fetch inicial
    fetchCidades();

    // Intervalo periódico (30 minutos)
    const interval = setInterval(fetchCidades, 30 * 60 * 1000);

    // Cleanup para desmontagem
    return () => clearInterval(interval);
  }, [ativo]);

  return cidades;
}

// ------------------------------
// Funções de Utilidade (Pure Functions)
// ------------------------------

/**
 * Define classes CSS baseado no modo de operação
 * 
 * @param {boolean} isFogo - Flag para modo de focos ativos
 * @returns {string} Classes CSS combinadas
 * 
 * @note Estilos são definidos em:
 * @see src/styles/CidadesTopCard.css
 */
function definirEstiloCard(isFogo) {
  return `cidades-top-card${isFogo ? ' cidades-top-card-fogo' : ''}`;
}

/**
 * Renderiza conteúdo condicional baseado no modo de operação
 * 
 * @param {boolean} isFogo - Flag para modo de focos ativos
 * @param {Array} exibidas - Lista de cidades a exibir
 * @returns {JSX.Element} Componente apropriado para o estado
 * 
 * @todo Implementar componente para modo alternativo
 */
function renderizarConteudo(isFogo, exibidas, onCidadeClick) {
  return isFogo
    ? <ListaCidades cidades={exibidas} onCidadeClick={onCidadeClick} />
    : <p style={{ color: '#fff' }}>[Dados de cidades aqui]</p>;
}

/**
 * Componente de lista acessível para exibição de cidades
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.cidades - Lista de cidades formatadas
 * 
 * @accessibility
 * - Usa lista não ordenada para screen readers
 * - Índices visuais para claridade na ordenação
 * 
 * @warning
 * - Uso de índice como key pode causar issues em listas dinâmicas
 *   (aceitável neste caso pois a ordem é estática após carga)
 */
function ListaCidades({ cidades, onCidadeClick }) {
  return cidades.length === 0 ? (
    <p style={{ color: '#fff', textAlign: 'center' }}>
      [Nenhuma cidade com focos]
    </p>
  ) : (
    <ul className="lista-cidades" role="list">
      {cidades.map((cidade, idx) => (
        <li
          key={idx}
          role="listitem"
          style={{ cursor: onCidadeClick ? 'pointer' : 'default' }}
          onClick={() => {
            if (onCidadeClick) onCidadeClick(cidade)
          }}
          tabIndex={0}
          onKeyDown={e => handleCidadeKeyDown(e, onCidadeClick, cidade)}
        >
          <strong>{idx + 1} - {cidade.cidade}</strong>: {cidade.totalFocos} focos
        </li>
      ))}
    </ul>
  );
}
// Void statements para evitar warnings de build
void ListaCidades;

/**
 * Componente de toggle para controle de visualização
 * 
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.mostrar - Estado atual da exibição
 * @param {number} props.total - Total de itens disponíveis
 * @param {function} props.onClick - Handler de clique
 * 
 * @ux
 * - Oculto quando há menos de 10 itens
 * - Labels dinâmicos para melhor affordance
 * 
 * @todo Adicionar aria-labels para melhor acessibilidade
 */
function BotaoToggle({ mostrar, total, onClick }) {
  if (total <= 10) return null; // Limiar configurável

  return (
    <button
      className="toggle-cidades"
      onClick={onClick}
      aria-expanded={mostrar}
    >
      {obterLabelToggle(mostrar)}
    </button>
  );
}
// Void statements para evitar warnings de build
void BotaoToggle;

/**
 * Gera label dinâmico para o botão de toggle
 * 
 * @param {boolean} mostrar - Estado atual da exibição
 * @returns {string} Texto localizado para controle
 * 
 * @i18n
 * - Strings hardcoded - considerar sistema de tradução futuro
 */
function obterLabelToggle(mostrar) {
  return mostrar ? 'Mostrar menos' : 'Ver todas';
}

/**
 * 🖱️ hasCidadeClickHandler
 *
 * Verifica se o parâmetro onCidadeClick é uma função válida (handler de clique).
 *
 * @param {Function} onCidadeClick - Função de callback para clique na cidade
 * @returns {boolean} True se for uma função, false caso contrário
 */
function hasCidadeClickHandler(onCidadeClick) {
  return typeof onCidadeClick === 'function';
}

/**
 * ⌨️ isKeyAcionavel
 *
 * Verifica se a tecla pressionada é "Enter" ou "Espaço" (teclas acionáveis para acessibilidade).
 *
 * @param {KeyboardEvent} e - Evento de teclado
 * @returns {boolean} True se for tecla Enter ou Espaço
 */
function isKeyAcionavel(e) {
  return e.key === 'Enter' || e.key === ' ';
}

/**
 * 🔄 shouldHandleCidadeKeyDown
 *
 * Determina se o evento de teclado na cidade deve ser tratado,
 * considerando a existência do handler e se a tecla é acionável.
 *
 * @param {KeyboardEvent} e - Evento de teclado
 * @param {Function} onCidadeClick - Handler de clique na cidade
 * @returns {boolean} True se deve tratar o evento
 */
function shouldHandleCidadeKeyDown(e, onCidadeClick) {
  return hasCidadeClickHandler(onCidadeClick) && isKeyAcionavel(e);
}

/**
 * 🏙️ handleCidadeKeyDown
 *
 * Handler principal para eventos de teclado em cidades.
 * Executa o callback de clique se as condições forem atendidas.
 *
 * @param {KeyboardEvent} e - Evento de teclado
 * @param {Function} onCidadeClick - Função callback para o clique
 * @param {string} cidade - Nome da cidade
 */
function handleCidadeKeyDown(e, onCidadeClick, cidade) {
  if (!shouldHandleCidadeKeyDown(e, onCidadeClick)) return;
  e.preventDefault();
  onCidadeClick(cidade);
}
