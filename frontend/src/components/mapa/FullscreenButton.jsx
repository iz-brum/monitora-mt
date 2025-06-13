// src/components/mapa/FullscreenButton.jsx

/**
 * 🌍 React-Leaflet Hook
 *
 * Importa o hook `useMap`, que retorna a instância atual do mapa Leaflet.
 * Essencial para manipular diretamente o estado e controles do mapa.
 */
import { useMap } from 'react-leaflet';

/**
 * 🗺️ Leaflet Core
 *
 * Importa a biblioteca principal do Leaflet (`L`), utilizada para criação e manipulação
 * direta de mapas e controles personalizados.
 */
import L from 'leaflet';

/**
 * 📺 Leaflet Fullscreen Plugin
 *
 * Importa o plugin de controle fullscreen do Leaflet, permitindo que o mapa
 * seja expandido para tela cheia por meio de um controle integrado.
 */
import 'leaflet.fullscreen/Control.FullScreen.js';

/**
 * 🎨 Leaflet Fullscreen Styles
 *
 * Importa a folha de estilos CSS necessária para estilização correta
 * do controle fullscreen do Leaflet.
 */
import 'leaflet.fullscreen/Control.FullScreen.css';

/**
 * 📺 FullscreenButton
 *
 * Componente React que adiciona um controle de tela cheia ao mapa Leaflet.
 * Garante que o controle seja inserido apenas uma vez, evitando duplicações.
 *
 * @returns {null} Não renderiza elementos diretamente no React DOM (controle adicionado diretamente ao Leaflet)
 */
export default function FullscreenButton() {
  const map = useMap();

  // Adiciona controle fullscreen uma única vez
  if (!map._fullscreenControlAdded) {
    L.control.fullscreen({ position: 'topleft' }).addTo(map);
    map._fullscreenControlAdded = true;
  }

  return null; // Não renderiza nada diretamente (Leaflet controla o DOM)
}
