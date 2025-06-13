// frontend/src/components/dashboard/DashboardMapaCidades.jsx

import CidadesTopCard from '@components/dashboard/CidadesTopCard'
void CidadesTopCard
import MapaCard from '@components/dashboard/MapaCard'
void MapaCard

import { useEffect, useState } from "react";
import { buscarFocosComLocalizacao, encontrarCoordenadasCidade } from "@services/locationService";
import { useMapaContexto } from '@context/MapaContexto'


/**
 * 🗺️ Componente principal da seção de cidades com focos no dashboard.
 *
 * Esse layout combina:
 * - Um painel à esquerda com dados acumulados por cidade.
 * - Um mapa central com foco geográfico.
 * - Um painel à direita com focos ativos por cidade.
 *
 * Estrutura visual:
 * ┌───────────────────────────────────────────────────┐
 * │ [Acumulados Por Cidade] [Mapa] [Focos por Cidade] │
 * └───────────────────────────────────────────────────┘
 *
 * Layout baseado em grid CSS com 3 colunas:
 * - 1fr (esquerda): Cidades acumuladas
 * - 2fr (centro): Mapa interativo
 * - 1fr (direita): Cidades com focos
 *
 * @returns {JSX.Element} Interface organizada em 3 colunas com cards e mapa.
 */
export default function DashboardMapaCidades() {
  const { cidadesSelecionadas, setCidadesSelecionadas } = useMapaContexto();
  const [focosLocalizados, setFocosLocalizados] = useState([]);

  const handleDesmarcarCidade = (cidadeNome) => {
    setCidadesSelecionadas(cidadesSelecionadas.filter(c => c.cidade !== cidadeNome));
  };

  useEffect(() => {
    // Carrega todos os focos localizados ao montar
    buscarFocosComLocalizacao().then(setFocosLocalizados);
  }, []);

  const handleCidadeClick = cidade => {
    const coords = encontrarCoordenadasCidade(focosLocalizados, cidade.cidade);
    if (coords) {
      const jaSelecionada = cidadesSelecionadas.some(sel => sel.cidade === cidade.cidade);
      if (!jaSelecionada) {
        setCidadesSelecionadas([...cidadesSelecionadas, { ...cidade, ...coords, clickId: Date.now() }]);
      } else {
        // Atualiza a lista, mudando o clickId (força o React a recriar o ZoomCidade)
        setCidadesSelecionadas(cidadesSelecionadas.map(sel =>
          sel.cidade === cidade.cidade
            ? { ...sel, clickId: Date.now() }
            : sel
        ));
      }
    } else {
      alert("Não foi possível encontrar coordenadas para esta cidade!");
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        height: '100%',
        gridTemplateColumns: '1fr 2fr 1fr',
        gap: '0.25rem'
      }}
    >
      <CidadesTopCard titulo="ACUMULADOS POR MUNICÍPIO HOJE" />

      <MapaCard
        cidadesSelecionadas={cidadesSelecionadas}
        onDesmarcarCidade={handleDesmarcarCidade}
      />

      <CidadesTopCard
        titulo="FOCOS DE CALOR POR MUNICÍPIO HOJE"
        onCidadeClick={handleCidadeClick}
      />
    </div>
  );
}
