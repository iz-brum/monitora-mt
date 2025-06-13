import React from 'react'
void React // Garante que o React seja incluído mesmo sem uso direto de JSX aqui

import '@styles/IndicadorMetric.css' // 🎨 Estilização específica deste componente
import defaultImg from '@imgs/indicadoresMetricos/default.png' // 🖼️ Fallback padrão

/**
 * 📐 Componente visual para exibir um indicador métrico (dashboard).
 *
 * Mostra:
 * - Um título (ex: “Total de Focos”)
 * - Um ícone (customizado ou padrão)
 * - Um valor principal (número, texto, ou JSX)
 *
 * Estilo é aplicado dinamicamente via a prop `cor`, influenciando o tema visual.
 * 
 * Estrutura visual:
 * ┌─────────────────────────────┐
 * │ Título                      │
 * │                      Ícone  │
 * │ Valor formatado             │
 * └─────────────────────────────┘
 *
 * @component
 * @param {Object} props
 * @param {'blue'|'red'} [props.cor='blue'] - Define o tema visual (azul ou vermelho).
 * @param {string} props.titulo - Texto descritivo do indicador.
 * @param {React.ReactNode} props.valor - Valor principal a ser exibido (pode ser número, texto ou JSX).
 * @param {string} [props.imagem] - Caminho para uma imagem opcional (fallback: imagem padrão).
 * @returns {JSX.Element}
 */
export default function IndicadorMetric({ cor = 'blue', titulo, valor, imagem }) {
  const icone = obterImagem(imagem);

  return (
    <div className={`indicador-metric indicador-${cor}`}>
      <div className="indicador-header">
        <div className="indicador-titulo">{titulo}</div>
        <img src={icone} alt="ícone" className="indicador-imagem" />
      </div>
      <div className="indicador-valor">{valor}</div>
    </div>
  );
}

/**
 * 📦 Retorna a imagem a ser usada no indicador.
 *
 * Se nenhuma imagem for passada, retorna a imagem padrão do sistema.
 *
 * @param {string} [imagem]
 * @returns {string}
 */
function obterImagem(imagem) {
  return imagem ?? defaultImg;
}
