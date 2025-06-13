import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';
import '@styles/MapaCard.css';
import RotasFlutuante from './RotasFlutuante';
void RotasFlutuante

export default function RotasControl({ waypoints, onRouteCalculated }) {
    const map = useMap();
    const [routeInfo, setRouteInfo] = useState(null);
    const [activeRouteIndex, setActiveRouteIndex] = useState(0);
    const [allRoutes, setAllRoutes] = useState([]);
    const [instructionsContainer, setInstructionsContainer] = useState(null);
    const [portalTarget, setPortalTarget] = useState(document.body);
    // Array de cores para diferentes segmentos
    const segmentColors = [
        '#2196F3', // Azul
        '#4CAF50', // Verde
        '#FFC107', // Amarelo
        '#9C27B0', // Roxo
        '#FF5722', // Laranja
        '#E91E63', // Rosa
        '#00BCD4', // Ciano
        '#FF4081', // Rosa claro
        '#673AB7', // Roxo escuro
        '#795548'  // Marrom
    ];

    // Detecta mudança de fullscreen/mapa expandido
    useEffect(() => {
        if (!map) return;
        const mapEl = map.getContainer();

        const updatePortal = () => {
            const isFullscreen =
                mapEl.classList.contains('leaflet-fullscreen-on') ||
                document.fullscreenElement === mapEl;
            setPortalTarget(isFullscreen ? mapEl : document.body);
        };
        mapEl.addEventListener('fullscreenchange', updatePortal);
        updatePortal();
        return () => mapEl.removeEventListener('fullscreenchange', updatePortal);
    }, [map]);

    // Sempre que portalTarget, waypoints ou activeRouteIndex mudar, remonte LRM
    useEffect(() => {
        if (!map || !waypoints || waypoints.length < 2) {
            setRouteInfo(null);
            setAllRoutes([]);
            setInstructionsContainer(null);
            return;
        }

        let routingControl = L.Routing.control({
            waypoints: waypoints.map(point => L.latLng(point.lat, point.lng)),
            routeWhileDragging: true,
            showAlternatives: true,
            numberOfAlternatives: 3,
            containerClassName: 'routing-container-embed',
            lineOptions: {
                styles: [] // Remove linha padrão da rota principal
            },
            altLineOptions: {
                styles: [] // Remove linhas alternativas também
            }
        }).addTo(map);

        routingControl.on('routesfound', (e) => {
            const routes = e.routes;
            setAllRoutes(routes);
            const activeRoute = routes[activeRouteIndex];
            setRouteInfo({
                distance: (activeRoute.summary.totalDistance / 1000).toFixed(2),
                time: Math.round(activeRoute.summary.totalTime / 60),
                alternatives: routes.length - 1,
                currentRoute: activeRouteIndex + 1,
                totalRoutes: routes.length
            });

            // REMOVE polylines antigos
            map.eachLayer((layer) => {
                if (layer instanceof L.Polyline && layer.options.className?.includes('segment-colored')) {
                    map.removeLayer(layer);
                }
            });

            // Pinta os segmentos certos!
            const coords = activeRoute.coordinates;
            const wpIdx = activeRoute.waypointIndices || [];
            if (wpIdx.length >= 2) {
                for (let i = 0; i < wpIdx.length - 1; i++) {
                    const segCoords = coords.slice(wpIdx[i], wpIdx[i + 1] + 1);
                    if (segCoords.length >= 2) {
                        L.polyline(segCoords, {
                            color: segmentColors[i % segmentColors.length],
                            weight: 7,
                            opacity: 0.8,
                            className: `segment-colored segment-${i}`
                        }).addTo(map);
                    }
                }
            } else if (coords.length > 1) {
                // Caso só tenha dois pontos (A->B)
                L.polyline(coords, {
                    color: segmentColors[0],
                    weight: 7,
                    opacity: 0.8,
                    className: 'segment-colored'
                }).addTo(map);
            }
        });


        const container = routingControl.getContainer();
        container.className = 'routing-container-embed';
        setInstructionsContainer(container);

        // Cleanup
        return () => {
            map.removeControl(routingControl);
            setInstructionsContainer(null);
            // Também remove segmentos customizados ao desmontar
            map.eachLayer((layer) => {
                if (layer instanceof L.Polyline && layer.options.className?.includes('segment-colored')) {
                    map.removeLayer(layer);
                }
            });
        };
    }, [map, waypoints, activeRouteIndex, portalTarget]);


    const handleRouteChange = (index) => {
        setActiveRouteIndex(index);
    };

    return (
        <>
            {routeInfo && instructionsContainer && (
                <RotasFlutuante
                    leafletMap={map}
                    portalContainer={portalTarget}
                    routeInfo={routeInfo}
                    allRoutes={allRoutes}
                    activeRouteIndex={activeRouteIndex}
                    handleRouteChange={handleRouteChange}
                    onClearRoute={() => {
                        if (onRouteCalculated) onRouteCalculated({ clear: true });
                    }}
                    instructionsContainer={instructionsContainer}
                />
            )}
        </>
    );
}
