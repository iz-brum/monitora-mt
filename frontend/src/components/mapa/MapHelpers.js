// src/components/mapa/MapHelpers.js

/**
 * 📦 Exports dos Componentes de Controle e Camada do Mapa
 *
 * Exporta componentes essenciais para manipulação de camadas, tela cheia e busca no mapa,
 * facilitando a organização e importação centralizada em outras partes da aplicação.
 */

// 🗺️ Camadas base do mapa
export { default as BaseLayers } from '@components/layers/BaseLayers';

// 📺 Botão para fullscreen do mapa
export { default as FullscreenButton } from './FullscreenButton';

// 🔎 Controle de busca no mapa
export { default as SearchControl } from './SearchControl';
