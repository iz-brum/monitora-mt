// src/components/mapa/FocoDetalhes/useDraggable.js

/**
 * 📦 React Hooks
 *
 * useEffect, useRef e useState são utilizados para controlar o estado e ciclo de vida
 * da interação de arrastar elementos no DOM.
 */
import { useEffect, useRef, useState } from 'react';

/**
 * 🗺️ Leaflet DomEvent
 *
 * Utilizado para gerenciar eventos DOM diretamente em elementos controlados pelo Leaflet.
 * Facilita o controle fino de eventos como mousemove e mousedown em mapas.
 */
import { DomEvent } from 'leaflet';

/**
 * 🛑 useDisablePropagation
 *
 * Hook que desativa a propagação de eventos de clique e scroll no container flutuante.
 * Evita que interações no painel afetem o comportamento padrão do mapa Leaflet.
 *
 * @param {React.RefObject<HTMLElement>} ref - Referência ao elemento DOM do container
 * @param {Object} leafletMap - Instância do mapa Leaflet (reagente a mudanças no mapa)
 * @param {HTMLElement} portalContainer - Container onde o portal está sendo renderizado
 */
function useDisablePropagation(ref, leafletMap, portalContainer) {
    useEffect(() => {
        try {
            // tenta sempre desabilitar propagação, evitando checagens externas
            DomEvent.disableClickPropagation(ref.current);
            DomEvent.disableScrollPropagation(ref.current);
        } catch (error) {
            // loga erro para ajudar debugging
            console.error(
                'Falha ao desabilitar propagação de eventos no container do FocoDetalhesFlutuante:',
                error
            );
        }
    }, [ref, leafletMap, portalContainer]);
}

/**
 * 🖱️ useHeaderMouseDown
 *
 * Hook que adiciona listener de `mousedown` ao cabeçalho do painel.
 * Inicia o comportamento de arrastar o painel e desativa o drag do Leaflet temporariamente.
 *
 * @param {React.RefObject<HTMLElement>} ref - Referência ao container flutuante
 * @param {Object} leafletMap - Instância do mapa Leaflet
 * @param {{ x: number, y: number }} pos - Posição atual do painel
 * @param {Function} setDragging - Função para ativar o estado de arraste
 * @param {React.MutableRefObject<{ x: number, y: number }>} offsetRef - Offset inicial do clique
 * @param {HTMLElement} portalContainer - Elemento DOM onde o painel está inserido via portal
 */
function useHeaderMouseDown(ref, leafletMap, pos, setDragging, offsetRef, portalContainer) {
    useEffect(() => {
        try {
            const el = ref.current;
            const headerEl = el.querySelector('.foco-header');
            const onMouseDown = e => {
                if (e.button !== 0) return; // único ponto de decisão
                e.preventDefault();
                offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
                setDragging(true);
                leafletMap.dragging.disable();
            };
            headerEl.addEventListener('mousedown', onMouseDown);
            return () => headerEl.removeEventListener('mousedown', onMouseDown);
        } catch (error) {
            console.error(
                'Falha ao adicionar listener de mousedown no header do FocoDetalhesFlutuante:',
                error
            );
        }
    }, [ref, leafletMap, pos.x, pos.y, setDragging, offsetRef, portalContainer]);
}

/**
 * 🧭 useDocumentMouseMove
 *
 * Hook que escuta eventos globais de `mousemove` no documento
 * e atualiza a posição do painel enquanto estiver sendo arrastado.
 *
 * @param {boolean} dragging - Indica se o painel está sendo arrastado
 * @param {Function} setPos - Função que atualiza a posição do painel
 * @param {React.MutableRefObject<{ x: number, y: number }>} offsetRef - Offset do clique inicial
 */
function useDocumentMouseMove(dragging, setPos, offsetRef) {
    useEffect(() => {
        if (!dragging) return;

        const onMouseMove = e => {
            setPos({
                x: e.clientX - offsetRef.current.x,
                y: e.clientY - offsetRef.current.y
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        return () => document.removeEventListener('mousemove', onMouseMove);
    }, [dragging, setPos, offsetRef]);
}

/**
 * 🖐️ useDocumentMouseUp
 *
 * Hook que escuta eventos globais de `mouseup` no documento.
 * Finaliza o estado de arraste e reativa o drag do Leaflet.
 *
 * @param {boolean} dragging - Indica se o painel está sendo arrastado
 * @param {Object} leafletMap - Instância do mapa Leaflet
 * @param {Function} setDragging - Função para desativar o estado de arraste
 */
function useDocumentMouseUp(dragging, leafletMap, setDragging) {
    useEffect(() => {
        if (!dragging) return;

        const onMouseUp = () => {
            setDragging(false);
            leafletMap.dragging.enable();
        };

        document.addEventListener('mouseup', onMouseUp);
        return () => document.removeEventListener('mouseup', onMouseUp);
    }, [dragging, leafletMap, setDragging]);
}

/**
 * 🎯 useDraggable
 *
 * Hook principal que habilita comportamento de "arrastar e soltar" em um container flutuante.
 * Integra os hooks auxiliares para bloquear propagação, detectar cliques no cabeçalho
 * e atualizar a posição durante o movimento.
 *
 * @param {React.RefObject<HTMLElement>} ref - Referência ao container DOM
 * @param {Object} leafletMap - Instância do mapa Leaflet
 * @param {{ x: number, y: number }} pos - Posição atual do painel
 * @param {Function} setPos - Função para atualizar a posição do painel
 * @param {HTMLElement} portalContainer - Elemento DOM onde o painel está inserido
 * @returns {boolean} dragging - Indica se o painel está sendo arrastado no momento
 */
export function useDraggable(ref, leafletMap, pos, setPos, portalContainer) {
    const [dragging, setDragging] = useState(false);
    const offsetRef = useRef({ x: 0, y: 0 });

    useDisablePropagation(ref, leafletMap, portalContainer);
    useHeaderMouseDown(ref, leafletMap, pos, setDragging, offsetRef, portalContainer);
    useDocumentMouseMove(dragging, setPos, offsetRef);
    useDocumentMouseUp(dragging, leafletMap, setDragging);

    return dragging;
}
