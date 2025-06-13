// src/components/shared/Loader.jsx

/**
 * Componente de indicação de carregamento universalmente acessível
 * 
 * @component
 * @example
 * // Uso típico em componentes
 * <Loader />
 * 
 * @description
 * - Implementa um spinner animado puramente via CSS para performance
 * - Segue diretrizes WCAG para indicadores de progresso:
 *   - Atributo `aria-label` para acessibilidade em leitores de tela
 *   - Animação não bloqueante para usuários com `prefers-reduced-motion`
 * - Estilos controlados pela classe CSS 'loader' para fácil customização
 * 
 * @note
 * - Não recebe props para manter-se como componente puro
 * - Tamanho e cores são controlados externamente via CSS
 * - Animação é definida em `styles/IndicadorMetric.css` com @keyframes
 */
export default function Loader() {
  return (
    <span 
      className="loader" 
      aria-label="Carregando..."
      role="status"  // Redundância para alguns leitores de tela
      /**
       * Estrutura visual otimizada:
       * 1. Elemento único para melhor renderização
       * 2. Sem conteúdo textual para evitar layout shifts
       * 3. Animação via CSS para suporte a `prefers-reduced-motion`
       */
    />
  );
}