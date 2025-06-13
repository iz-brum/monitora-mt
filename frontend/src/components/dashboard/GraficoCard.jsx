// src/components/dashboard/GraficoCard.jsx

import '@styles/GraficoCard.css'

/**
 * Define a classe CSS baseada no tipo do gráfico
 * 
 * @param {string} tipo - Tipo do gráfico ('chuva' ou 'focos')
 * @returns {string} Classes CSS combinadas
 */
function definirClasseGrafico(tipo) {
    return `grafico-card ${tipo ? `tipo-${tipo}` : ''}`.trim();
}

export default function GraficoCard({ titulo, children, tipo }) {
    return (
        <div className={definirClasseGrafico(tipo)}>
            <div className="grafico-titulo">{titulo}</div>
            <div className="grafico-conteudo">
                {children || '[Gráfico aqui]'}
            </div>
        </div>
    );
}