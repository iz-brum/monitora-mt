import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

export default function RotasToggleControl({ isActive, onToggle }) {
    const map = useMap();

    useEffect(() => {
        // Criar um controle personalizado
        const routeToggleControl = L.Control.extend({
            options: {
                position: 'topleft'
            },

            onAdd: function () {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'rotas-toggle-btn', container);

                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                         style="width: 18px; height: 18px;">
                        <path d="M3 3v18h18"/>
                        <path d="M3 12h18"/>
                        <path d="M12 3v18"/>
                    </svg>
                `;

                button.href = '#';
                button.title = 'Modo Rota';

                // Atualizar estilo baseado no estado
                if (isActive) {
                    button.classList.add('active');
                }

                L.DomEvent.on(button, 'click', function (e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    onToggle(!isActive);
                });

                return container;
            }
        });

        // Adicionar o controle ao mapa
        const control = new routeToggleControl();
        map.addControl(control);

        return () => {
            map.removeControl(control);
        };
    }, [map, isActive, onToggle]);

    return null;
}