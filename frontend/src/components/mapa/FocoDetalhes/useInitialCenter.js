// src/components/mapa/FocoDetalhes/useInitialCenter.js

/**
 * ⚛️ React Hook
 *
 * Importa o hook `useLayoutEffect` do React, que é semelhante ao `useEffect`,
 * porém executado após todas as mutações DOM, antes que o navegador atualize visualmente a tela.
 * Ideal para manipulações imediatas do DOM que requerem sincronicidade visual.
 */
import { useLayoutEffect } from 'react';

/**
 * 📏 getElementRect
 *
 * Função auxiliar que retorna as dimensões (`DOMRect`) do elemento referenciado.
 * Caso o elemento ainda não esteja disponível, retorna um fallback com dimensões zeradas.
 *
 * @param {React.RefObject<HTMLElement>} ref - Referência ao elemento DOM
 * @returns {{ width: number, height: number }} Dimensões do elemento ou fallback vazio
 */
function getElementRect(ref) {
  const el = ref.current;
  return el
    ? el.getBoundingClientRect()
    : { width: 0, height: 0 };
}

/**
 * 🎯 computeCenterPosition
 *
 * Função auxiliar que calcula a posição central da janela com base nas dimensões fornecidas.
 *
 * @param {{ width: number, height: number }} dimensions - Largura e altura do elemento
 * @returns {{ x: number, y: number }} Coordenadas para posicionar o elemento centralizado
 */
function computeCenterPosition({ width, height }) {
  return {
    x: window.innerWidth / 2 - width / 2,
    // x ao centro: 1/2 da tela
    y: window.innerHeight / 5 - height / 2
    // y próximo do topo: 1/5 da tela
  };
}

/**
 * 📌 useInitialCenter
 *
 * Hook que posiciona inicialmente o painel flutuante no centro da tela.
 * Caso receba uma posição inicial (`posicaoInicial`), utiliza-a diretamente.
 * Caso contrário, calcula automaticamente a posição central.
 *
 * @param {React.RefObject<HTMLElement>} ref - Referência ao container DOM do painel
 * @param {{ x: number, y: number } | undefined} posicaoInicial - Posição inicial opcional
 * @param {Function} setPos - Função para atualizar a posição do painel
 */
export function useInitialCenter(ref, posicaoInicial, setPos) {
  useLayoutEffect(() => {
    // Se houver posição inicial definida, utiliza diretamente
    if (posicaoInicial) {
      setPos(posicaoInicial);
      return;
    }

    // Calcula automaticamente a posição central com base nas dimensões
    const rect = getElementRect(ref);
    setPos(computeCenterPosition(rect));
  }, [ref, posicaoInicial, setPos]);
}
