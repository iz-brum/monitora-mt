// src/components/dashboard/DashboardGraficos.jsx

import GraficoCard from '@components/dashboard/GraficoCard'
void GraficoCard // Supressão intencional de warning de build
import GraficoFocosCalor from '@components/dashboard/GraficoFocosCalor'
void GraficoFocosCalor

/**
 * Container principal para visualizações gráficas do dashboard
 * 
 * @component
 * @example
 * <DashboardGraficos />
 * 
 * @description
 * - Layout responsivo para visualização simultânea de múltiplos gráficos
 * - Atua como wrapper para componentes de gráficos especializados
 * - Implementa grid CSS nativo para melhor performance de renderização
 * 
 * @architecture
 * - Separação clara entre container e conteúdo
 * - Layout definido via inline styles para isolamento de escopo
 * - Componentes filhos são totalmente desacoplados
 */
export default function DashboardGraficos() {
    return (
        <div
            style={{
                display: 'grid',
                height: '100%',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.3rem',
                minHeight: '220px'
            }}
            role="region"
            aria-label="Painel de Visualizações Gráficas"
        >
            <GraficoCard
                titulo="GRÁFICO CHUVA"
                tipo="chuva"
                aria-label="Gráfico de monitoramento hidrológico"
            />
            
            <GraficoCard
                titulo="FOCOS DE CALOR SEMANAL"
                tipo="focos"
                aria-label="Gráfico de incidência de focos de calor"
            >
                <GraficoFocosCalor />
            </GraficoCard>
        </div>
    )
}