import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { DomEvent } from 'leaflet';
import { createPortal } from 'react-dom';
import '@styles/MapaCard.css';

export default function RotasFlutuante({
    routeInfo,
    allRoutes,
    activeRouteIndex,
    handleRouteChange,
    onClearRoute,
    instructionsContainer,
    leafletMap,
}) {
    const panelRef = useRef(null);
    const instructionsHolderRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 });
    const [pos, setPos] = useState({ x: 100, y: 100 });
    const [dragging, setDragging] = useState(false);
    const [portalContainer, setPortalContainer] = useState(document.body);

    // Troca portal conforme fullscreen
    useEffect(() => {
        if (!leafletMap) return;
        const mapEl = leafletMap.getContainer();

        function updatePortal() {
            const isFullscreen =
                mapEl.classList.contains('leaflet-fullscreen-on') ||
                document.fullscreenElement === mapEl;
            setPortalContainer(isFullscreen ? mapEl : document.body);
        }

        mapEl.addEventListener('fullscreenchange', updatePortal);
        updatePortal();
        return () => mapEl.removeEventListener('fullscreenchange', updatePortal);
    }, [leafletMap]);

    // Centraliza ao abrir OU trocar portalContainer
    useLayoutEffect(() => {
        if (!panelRef.current || !portalContainer) return;
        // Use o container correto, não o window!
        const container = portalContainer;
        const { width, height } = panelRef.current.getBoundingClientRect();
        let containerWidth, containerHeight;
        if (container === document.body) {
            containerWidth = window.innerWidth;
            containerHeight = window.innerHeight;
        } else {
            const rect = container.getBoundingClientRect();
            containerWidth = rect.width;
            containerHeight = rect.height;
        }
        setPos({
            x: containerWidth / 2 - width / 2,
            y: containerHeight / 2 - height / 2,
        });
    }, [portalContainer]); // <--- CENTRALIZA SEMPRE QUE PORTAL TROCA!

    // Drag: calcula posição relativa ao portalContainer
    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        DomEvent.disableClickPropagation(el);
        DomEvent.disableScrollPropagation(el);

        function onDown(e) {
            if (e.button !== 0) return;
            if (!e.target.closest('.rota-panel-header')) return;
            e.preventDefault();
            // Container do drag: body ou mapEl
            const container = portalContainer;
            const baseRect = container === document.body
                ? { left: 0, top: 0 }
                : container.getBoundingClientRect();
            offsetRef.current = {
                x: e.clientX - (pos.x + baseRect.left),
                y: e.clientY - (pos.y + baseRect.top),
            };
            setDragging(true);
        }
        function onMove(e) {
            if (!dragging) return;
            const container = portalContainer;
            const baseRect = container === document.body
                ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
                : container.getBoundingClientRect();
            // Mantém dentro dos limites do container (opcional)
            let x = e.clientX - baseRect.left - offsetRef.current.x;
            let y = e.clientY - baseRect.top - offsetRef.current.y;
            // (Opcional: limitar para não sair do container)
            x = Math.max(0, Math.min(x, baseRect.width - el.offsetWidth));
            y = Math.max(0, Math.min(y, baseRect.height - el.offsetHeight));
            setPos({ x, y });
        }
        function onUp() {
            setDragging(false);
        }
        el.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            el.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [dragging, pos, portalContainer]);

    // Injeta o painel DOM do LRM no holder
    useEffect(() => {
        if (!instructionsHolderRef.current) return;
        if (!instructionsContainer) return;
        instructionsHolderRef.current.innerHTML = '';
        instructionsHolderRef.current.appendChild(instructionsContainer);
    }, [instructionsContainer]);

    // Render com portal dinâmico e posição robusta
    return createPortal(
        <div
            ref={panelRef}
            className="rota-flutuante"
            style={{
                top: pos.y,
                left: pos.x,
                zIndex: 9999,
                position: 'absolute',
                cursor: dragging ? 'grabbing' : 'default',
                minWidth: 340,
                minHeight: 60,
            }}
        >
            <div className="rota-panel-header">
                <h3>
                    Informações da Rota {routeInfo.currentRoute}/{routeInfo.totalRoutes}
                </h3>
                <button
                    className="clear-route-btn"
                    title="Limpar rota"
                    onClick={e => {
                        e.stopPropagation();
                        if (onClearRoute) onClearRoute();
                    }}
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>

            {/* Route details fora do holder LRM */}
            <div className="route-details">
                <div>
                    <span className="route-label">Distância:</span>
                    <span className="route-value">{routeInfo.distance} km</span>
                </div>
                <div>
                    <span className="route-label">Tempo:</span>
                    <span className="route-value">{routeInfo.time} min</span>
                </div>
            </div>

            {allRoutes.length > 1 && (
                <div className="route-alternatives">
                    <h4>Rotas Alternativas:</h4>
                    <div className="route-buttons">
                        {allRoutes.map((_, index) => (
                            <button
                                key={index}
                                className={`route-btn ${index === activeRouteIndex ? 'active' : ''}`}
                                onClick={() => handleRouteChange(index)}
                            >
                                Rota {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Aqui, o DOM do LRM - só este filho! */}
            <div ref={instructionsHolderRef} style={{ flex: 1, minHeight: 60, overflow: 'auto' }} />
        </div>,
        portalContainer
    );
}
