// src/components/mapa/FocoDetalhes/useFullscreenPortal.js

/**
 * ⚛️ React Hooks
 *
 * Importa hooks essenciais do React:
 * - useEffect: gerencia efeitos colaterais (ciclo de vida).
 * - useState: controla o estado local dentro do componente.
 */
import { useEffect, useState } from 'react';

/**
 * 🌐 useFullscreenPortal
 *
 * Hook que determina dinamicamente o container DOM onde o conteúdo flutuante deve ser renderizado.
 * Alterna entre o corpo do documento (`document.body`) e o elemento do mapa (`leafletMap`)
 * dependendo do estado de tela cheia (fullscreen).
 *
 * @param {Object} leafletMap - Instância do mapa Leaflet utilizada para obter o container atual
 * @returns {HTMLElement} portalContainer - Elemento DOM que deve ser utilizado como portal de renderização
 */
export function useFullscreenPortal(leafletMap) {
  const [portalContainer, setPortalContainer] = useState(() => document.body);

  useEffect(() => {
    if (!leafletMap) return; // único ponto de decisão dentro do useEffect

    const mapEl = leafletMap.getContainer();

    // Atualiza o container dependendo do estado de fullscreen (complexidade cicl. = 2)
    const updatePortal = () => {
      setPortalContainer(
        document.fullscreenElement === mapEl
          ? mapEl
          : document.body
      );
    };

    mapEl.addEventListener('fullscreenchange', updatePortal);
    updatePortal();

    return () => mapEl.removeEventListener('fullscreenchange', updatePortal);
  }, [leafletMap]);

  return portalContainer;
}
