import React, { useEffect, useRef } from 'react'
void React

/**
 * 📈 IndicadorVariacao
 *
 * Exibe um símbolo visual para representar variação entre dois valores:
 * - ▲ se `valorAtual` for maior que `valorAnterior`
 * - ▼ se `valorAtual` for menor
 * - -- se forem iguais ou nulos
 *
 * Também faz log condicional no console para debugging controlado.
 *
 * @param {Object} props
 * @param {number|null} props.valorAtual - Valor atual de comparação
 * @param {number|null} props.valorAnterior - Valor anterior de comparação
 * @returns {JSX.Element} Um símbolo representando a tendência
 */
export default function IndicadorVariacao({ valorAtual, valorAnterior }) {
  const firstRender = useRef(true)

  useEffect(() => {
    if (deveLogar(valorAtual, valorAnterior, firstRender.current)) {
      // console.log('valor atual:', valorAtual, ' valor anterior:', valorAnterior)
    }
    firstRender.current = false
  }, [valorAtual, valorAnterior])

  return renderSimbolo(valorAtual, valorAnterior)
}

/**
 * 🔍 Determina se os valores devem ser logados no console
 *
 * @param {number|null} atual - Valor atual
 * @param {number|null} anterior - Valor anterior
 * @param {boolean} isFirstRender - Flag para primeira renderização
 * @returns {boolean} True se deve logar
 */
function deveLogar(atual, anterior, isFirstRender) {
  return algumValorDefinido(atual, anterior) &&
         !primeiroRenderComTodosNulos(atual, anterior, isFirstRender)
}

/**
 * Verifica se pelo menos um valor está definido
 */
function algumValorDefinido(a, b) {
  return a != null || b != null
}

/**
 * Verifica se é a primeira renderização e ambos os valores são nulos
 */
function primeiroRenderComTodosNulos(a, b, isFirst) {
  return isPrimeiraRenderizacao(isFirst) && ambosSaoNulos(a, b)
}

/**
 * Confirma se é o primeiro render
 */
function isPrimeiraRenderizacao(flag) {
  return flag === true
}

/**
 * Confirma se ambos os valores são nulos
 */
function ambosSaoNulos(x, y) {
  return x == null && y == null
}

/**
 * 🎯 Renderiza o símbolo de variação com base nos valores
 *
 * @param {number|null} atual - Valor atual
 * @param {number|null} anterior - Valor anterior
 * @returns {JSX.Element}
 */
function renderSimbolo(atual, anterior) {
  if (faltandoDados(atual, anterior)) return renderNada()

  const diferenca = atual - anterior
  return renderComBaseNaDiferenca(diferenca)
}

/**
 * Verifica se algum dos valores está ausente
 */
function faltandoDados(a, b) {
  return a == null || b == null
}

/**
 * Decide qual símbolo renderizar com base na diferença
 */
function renderComBaseNaDiferenca(diff) {
  return isPositivo(diff)
    ? renderSetaParaCima()
    : renderNaoPositivo(diff)
}

/**
 * Se não for positivo, verifica se é negativo ou igual
 */
function renderNaoPositivo(diff) {
  return isNegativo(diff)
    ? renderSetaParaBaixo()
    : renderNada()
}

/**
 * Checa se a diferença é positiva
 */
function isPositivo(valor) {
  return valor > 0
}

/**
 * Checa se a diferença é negativa
 */
function isNegativo(valor) {
  return valor < 0
}

/**
 * 🔼 Retorna o símbolo de alta
 */
function renderSetaParaCima() {
  return <span style={{ color: '#aaee06' }}>▲</span>
}

/**
 * 🔽 Retorna o símbolo de baixa
 */
function renderSetaParaBaixo() {
  return <span style={{ color: '#5893eb' }}>▼</span>
}

/**
 * -- Retorna símbolo neutro (sem variação)
 */
function renderNada() {
  return <span style={{ marginLeft: '10px' }}> </span>
  // return <span style={{ marginLeft: '10px' }}>--</span>
}
