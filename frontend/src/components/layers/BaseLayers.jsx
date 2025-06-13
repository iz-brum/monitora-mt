// src/components/mapa/BaseLayers.jsx

// 📦 React Hooks
import { useEffect, useRef } from 'react';

// 🌍 Componentes de controle de camadas do Leaflet via react-leaflet
import {
  LayersControl,   // Componente pai que encapsula múltiplas camadas base/overlay
  TileLayer,       // Representa um tile de mapa (como OSM, Esri, etc.)
  LayerGroup,      // Agrupa múltiplas camadas como se fosse uma única
  WMSTileLayer,
  useMap           // Hook para acessar o mapa atual (instância Leaflet)
} from 'react-leaflet';

// 📌 Declarações void apenas para evitar warnings de imports não utilizados diretamente
void LayersControl, TileLayer, LayerGroup, WMSTileLayer, useMap;

// 🧱 Leaflet base (para acesso direto a APIs de baixo nível, como DOMUtil)
import L from 'leaflet';
void L; // Manter L visível para bundlers/linters


/** 
 * Desestruturação do componente `BaseLayer` a partir do `LayersControl` do React-Leaflet.
 * Esse componente representa uma camada base (ex: mapas de fundo como satélite ou OSM),
 * e deve ser usado dentro de `<LayersControl>` para permitir alternância entre múltiplas bases.
 */
const { BaseLayer } = LayersControl;
void BaseLayer; // Garante que o símbolo seja mantido no bundle final (uso implícito)

/**
 * ============================
 * == Utilitários DOM/Controle ==
 * ============================
 * Estas funções oferecem compatibilidade entre diferentes formatos de acesso
 * aos containers dos controles do Leaflet (via React-Leaflet ou API nativa).
 */

/**
 * Verifica se o controle fornecido contém um elemento interno do Leaflet.
 * @param {any} controle - Referência potencialmente enriquecida com leafletElement
 * @returns {boolean} Verdadeiro se contém um leafletElement válido
 */
function temLeafletElement(controle) {
  return !!controle?.leafletElement;
}

/**
 * Verifica se o elemento do Leaflet possui o método getContainer().
 * @param {any} controle - Controle do Leaflet
 * @returns {boolean} Se é possível extrair um container do elemento interno
 */
function temLeafletContainer(controle) {
  return temLeafletElement(controle) &&
    typeof controle.leafletElement.getContainer === 'function';
}

/**
 * Verifica se o controle tem um método getContainer direto (sem usar leafletElement).
 * @param {any} controle - Objeto controle possivelmente customizado
 * @returns {boolean} Se o controle já expõe getContainer diretamente
 */
function temContainerDireto(controle) {
  return controle?.getContainer;
}

/**
 * Resolve o container DOM via elemento interno do Leaflet.
 * Útil para controles integrados via react-leaflet.
 * @param {any} controle
 * @returns {HTMLElement|null} Container do controle
 */
function resolveLeafletContainer(controle) {
  return temLeafletContainer(controle)
    ? controle.leafletElement.getContainer()
    : null;
}

/**
 * Resolve o container diretamente (fallback para casos fora do react-leaflet).
 * @param {any} controle
 * @returns {HTMLElement|null}
 */
function resolveDiretoContainer(controle) {
  return temContainerDireto(controle)
    ? controle.getContainer()
    : null;
}

/**
 * Tenta resolver o container DOM do controle, considerando todas as estratégias conhecidas.
 * @param {any} controle - Controle de camadas, botão ou similar
 * @returns {HTMLElement|null} Elemento DOM do container
 */
function resolveContainer(controle) {
  return resolveLeafletContainer(controle)
    ?? resolveDiretoContainer(controle);
}

/**
 * Interface segura para extrair o container do controle.
 * Retorna null se o controle for inválido.
 * @param {any} controle
 * @returns {HTMLElement|null}
 */
function obterContainerDeControle(controle) {
  return controle ? resolveContainer(controle) : null;
}

/**
 * Aplica uma classe CSS personalizada ao container do controle.
 * Permite estilização específica via CSS externo (ex: `.base-layer-control`)
 * @param {any} controle - Controle alvo para estilização
 */
function aplicarEstiloAoContainer(controle) {
  const container = obterContainerDeControle(controle);
  if (container) {
    container.classList.add('base-layer-control'); // 📌 Classe para custom styling
  }
}

/**
 * ✅ Verifica se o controle pode ser atribuído ao mapa Leaflet.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {Object} controle - Controle do Leaflet (ex: LayersControl).
 * @returns {boolean} Retorna `true` se ambos `map` e `controle` estiverem definidos.
 *
 * 🔒 Utilizado como medida de segurança antes de atribuir o controle ao mapa,
 * evitando exceções por objetos indefinidos.
 */
const podeAtribuirControle = (map, controle) => Boolean(map && controle);

// ===================
// == Componente principal: BaseLayers
// ===================

/**
 * Componente React que injeta o controle de camadas base no mapa Leaflet.
 *
 * Este painel permite ao usuário alternar entre diferentes estilos de mapa (tiles),
 * como OpenStreetMap, Satélite e variações visuais (claro/escuro).
 *
 * Também garante que o controle seja acessível externamente via `map._layersControl`
 * e aplica uma classe customizada para permitir personalização visual via CSS.
 *
 * @returns {JSX.Element} LayersControl configurado com múltiplas opções de base layer.
 */
export default function BaseLayers() {
  const map = useMap();                  // 🌐 Hook do Leaflet para obter o mapa atual
  const layersControlRef = useRef();     // 🧭 Referência ao controle de camadas

  // 🎯 Efeito de inicialização para conectar o controle ao mapa e estilizar
  useEffect(() => {
    const controle = layersControlRef.current;

    // 🛡️ Evita erros caso mapa ou controle não estejam disponíveis
    if (!podeAtribuirControle(map, controle)) return;

    // 🔗 Expõe o controle dentro do objeto `map` para uso externo (ex: via `map._layersControl`)
    map._layersControl = controle;

    // 🎨 Aplica uma classe CSS ao container do controle para customização visual
    aplicarEstiloAoContainer(controle);
  }, [map]);

  return (
    <LayersControl ref={layersControlRef} position="topright">
      {/* == Camadas Base: OSM padrão (claro) == */}
      <BaseLayer checked name="OpenStreetMap">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
      </BaseLayer>

      {/* == Satélite puro (sem rótulos) via Esri == */}
      <BaseLayer name="Satélite (Esri)">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
          maxZoom={18}
        />
      </BaseLayer>

      {/* == Satélite com rótulos (camadas sobrepostas) == */}
      <BaseLayer name="Satélite com Rótulos (Esri)">
        <LayerGroup>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <TileLayer
            url="https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri — World Imagery + Boundaries"
          />
        </LayerGroup>
      </BaseLayer>

      {/* == Tema claro do CartoDB == */}
      <BaseLayer name="Carto Light">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
      </BaseLayer>

      {/* == Tema escuro do CartoDB == */}
      <BaseLayer name="Carto Dark">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
      </BaseLayer>
      {/* Topografia (OpenTopoMap) */}
      <BaseLayer name="Topografia (OpenTopoMap)">
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>, &copy; OpenStreetMap contributors'
          maxZoom={17}
        />
      </BaseLayer>

      {/* Humanitário (HOT) */}
      <BaseLayer name="Humanitário (HOT)">
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.hotosm.org">Humanitarian OSM Team</a>, &copy; OpenStreetMap contributors'
        />
      </BaseLayer>

      {/* Mapa de Relevo Sombreado */}
      <BaseLayer name="Relevo (OSM)">
        <TileLayer
          url="https://tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='<a href="https://opentopomap.org">OpenTopoMap</a>'
          maxZoom={17}
        />
      </BaseLayer>
      <BaseLayer name="Bacias">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          attribution='CartoDB'
          maxZoom={20}
        />
      </BaseLayer>

      {/* Satélite puro do Google */}
      <BaseLayer name="Satélite (Google)">
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="Map data &copy;2024 Google"
          maxZoom={20}
        />
      </BaseLayer>

      {/* Satélite puro do Google */}
      <BaseLayer name="Satélite Com Rótulos (Google)">
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          attribution="Map data &copy;2024 Google"
          maxZoom={20}
        />
      </BaseLayer>
    </LayersControl>
  );
}
