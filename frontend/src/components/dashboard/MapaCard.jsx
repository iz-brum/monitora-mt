// frontend/src/components/dashboard/MapaCard.jsx

// 📁 Importa o CSS específico para o cartão de mapa (estilização visual/layout)
import '@styles/MapaCard.css'

// 🗺️ Importa o container principal do mapa e o controle de escala do Leaflet via React
import { MapContainer, ScaleControl, GeoJSON, useMap, useMapEvent } from 'react-leaflet'

// 🔇 Declarações void para evitar warnings de "imports não utilizados" em análises estáticas
void MapContainer, ScaleControl, GeoJSON

// 📦 Estilo base da biblioteca Leaflet para funcionamento correto dos mapas
import 'leaflet/dist/leaflet.css'

// 🔄 Hook de estado do React, usado para armazenar focos selecionados e visibilidade de popups
import { useState, useEffect } from 'react'

// 🧩 Conjunto de utilitários visuais e funcionais para o mapa:
// - BaseLayers: camadas base (OSM, satélite, etc.)
// - FullscreenButton: botão para alternar tela cheia
// - SearchControl: controle de busca usando Mapbox
import {
  BaseLayers,
  FullscreenButton,
  SearchControl
} from '@components/mapa/MapHelpers'

// 🔇 Garante que os utilitários importados não sejam eliminados por otimizadores
void BaseLayers, FullscreenButton, SearchControl

// 📂 Componente que permite o upload e leitura de arquivos geográficos (.geojson, .kml, .kmz)
import GeoFileLoader from '@components/geofiles/GeoFileLoader'
void GeoFileLoader // Supressão de warning de uso

// 🔥 Painel de controle de camadas com focos de calor (marcadores, cluster, toggle)
import FocosLayerControlPanel from '@components/layers/FocosLayerControlPanel'
void FocosLayerControlPanel

// 🧾 Componente de popup flutuante com detalhes sobre focos selecionados (clicados)
import FocoDetalhesFlutuante from '@components/mapa/FocoDetalhes/FocoDetalhesFlutuante'
void FocoDetalhesFlutuante

import RotasControl from '@components/mapa/RotasControl';
void RotasControl
import RotasToggleControl from '@components/mapa/RotasToggleControl';
void RotasToggleControl

import { normalizeString } from '@utils/normalizeCityName' // Ajuste o caminho conforme seu projeto

import { useMapaContexto } from '@context/MapaContexto'
import { useMapEvents } from 'react-leaflet';

// 🔐 Token de autenticação Mapbox retirado das variáveis de ambiente (.env)
// Usado pelo controle de busca por localização
const mapboxApiKey = import.meta.env.VITE_MAPBOX_TOKEN

/**
 * 🗺️ MapaCard
 *
 * Componente central de visualização geográfica.
 * Este card encapsula um mapa interativo com funcionalidades robustas:
 *
 * - Camadas base (satélite, OSM, etc.)
 * - Escala métrica
 * - Botão de tela cheia
 * - Busca por localidade (via Mapbox)
 * - Suporte a upload e visualização de arquivos GeoJSON/KML/KMZ
 * - Painel de controle de focos de calor com clusterização
 * - Popup flutuante de detalhes ao clicar em marcadores
 *
 * A área do mapa cobre inicialmente o estado do Mato Grosso (MT).
 *
 * @returns {JSX.Element} Card visual com mapa Leaflet interativo.
 */
export default function MapaCard({ cidadesSelecionadas, onDesmarcarCidade }) {

  const {
    mapPosition, setMapPosition, hydrated,
    popupVisivel, setPopupVisivel,
    focosSelecionados, setFocosSelecionados,
    // ... outros estados que queira pegar!
  } = useMapaContexto();

  const [limitesGeoJson, setLimitesGeoJson] = useState(null);
  const [rotasModeAtivo, setRotasModeAtivo] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [rotaInfo, setRotaInfo] = useState(null);



  // Adicione a função para gerenciar cliques no mapa
  const HandleMapClick = () => {

    useMapEvent('click', (e) => {
      // --- Verifica se o clique foi em painel flutuante:
      if (
        e.originalEvent.target.closest('.route-info-panel') ||
        e.originalEvent.target.closest('.floating-panel')
      ) {
        // Se foi, não faz nada!
        return;
      }
      // Só adiciona ponto se NÃO foi no painel!
      if (rotasModeAtivo) {
        setWaypoints(prev => [...prev, {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }]);
      }
    });

    return null;
  }
  void HandleMapClick

  // Carregar o arquivo GeoJSON ao montar
  useEffect(() => {
    fetch('assets/geo/limites_administrativos.json')
      .then(res => res.json())
      .then(data => setLimitesGeoJson(data));
  }, []);

  // Aguarde a hidratação antes de renderizar o MapContainer
  if (!hydrated) return <div>Carregando mapa...</div>; // Ou pode exibir um loading spinner
  // console.log('mapPosition', mapPosition)


  /**
   * 🔄 Handler chamado ao clicar em um marcador de foco no mapa.
   * Define os focos selecionados e exibe o popup.
   *
   * @param {Array<Object>} focos - Lista de focos de calor próximos ao clique.
   */
  const abrirPopupFocos = (focos) => {
    setFocosSelecionados(focos);
    setPopupVisivel(true);
  };

  /**
   * ❌ Fecha o popup de detalhes e limpa os focos selecionados.
   */
  const fecharPopup = () => {
    setPopupVisivel(false);
    setFocosSelecionados([]);
  };

  function MapPositionTracker() {
    useMapEvents({
      moveend: (e) => {
        const map = e.target;
        setMapPosition({
          center: [map.getCenter().lat, map.getCenter().lng],
          zoom: map.getZoom(),
        });
      },
      zoomend: (e) => {
        const map = e.target;
        setMapPosition({
          center: [map.getCenter().lat, map.getCenter().lng],
          zoom: map.getZoom(),
        });
      },
    });
    return null;
  }
  void MapPositionTracker

  return (
    <div className="mapa-card">
      <MapContainer
        center={mapPosition.center}
        zoom={mapPosition.zoom}
        scrollWheelZoom={true}
        className="mapa-leaflet"
        whenCreated={mapInstance => { window.LEAFLET_MAP_REF = mapInstance }}
      >

        <MapPositionTracker />

        {/* Zoom nas cidades selecionadas */}
        {Array.isArray(cidadesSelecionadas) &&
          cidadesSelecionadas.map(cidade => (
            <ZoomCidade key={cidade.cidade + (cidade.clickId || '')} cidade={cidade} />
          ))
        }
        {/* Camadas base */}
        <BaseLayers />

        {/* Limites dos municípios selecionados */}
        {Array.isArray(cidadesSelecionadas) && cidadesSelecionadas.map(cidade => {
          const features = limitesGeoJson?.features.filter(
            feature =>
              feature.properties.name &&
              normalizeString(feature.properties.name) === normalizeString(cidade.cidade)
          );
          if (!features || !features.length) return null;

          const municipioSelecionadoGeoJson = {
            type: 'FeatureCollection',
            features,
          };

          return (
            <GeoJSON
              key={cidade.cidade}
              data={municipioSelecionadoGeoJson}
              style={{
                color: "#2e3bea",
                weight: 2,
                dashArray: "8, 4",
                fillOpacity: 0.05,
                opacity: 1,
              }}
              // Aqui você garante o handler individual
              eventHandlers={{
                contextmenu: (e) => onDesmarcarCidade(cidade.cidade)
              }}
            />
          );
        })}

        {/* Demais camadas e controles... */}
        <ScaleControl position="bottomleft" metric={true} imperial={false} />

        <FullscreenButton />

        <SearchControl mapboxApiKey={mapboxApiKey} />

        <RotasToggleControl
          isActive={rotasModeAtivo}
          onToggle={(active) => {
            setRotasModeAtivo(active);
            if (!active) {
              setWaypoints([]); // Limpa os waypoints ao desativar
            }
          }}
        />

        <GeoFileLoader />
        <FocosLayerControlPanel onMarkerClick={abrirPopupFocos} />

        <HandleMapClick />
        {waypoints.length > 0 && rotasModeAtivo && (
          <RotasControl
            waypoints={waypoints}
            onRouteCalculated={(info) => {
              if (info && info.clear) {
                setWaypoints([]);
                return;
              }
              setRotaInfo(info);
            }}
          />
        )}

      </MapContainer>

      {popupVisivel && (
        <FocoDetalhesFlutuante
          focos={focosSelecionados}
          onFechar={fecharPopup}
        />
      )}
    </div>
  );
}

void ZoomCidade
function ZoomCidade({ cidade }) {
  const map = useMap();
  useEffect(() => {
    if (cidade && cidade.lat && cidade.lng) {
      map.setView([cidade.lat, cidade.lng], 8); // 8 é um bom zoom para cidades
    }
  }, [cidade, map]);
  return null;
}
