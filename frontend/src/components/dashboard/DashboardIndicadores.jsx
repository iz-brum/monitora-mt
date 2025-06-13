// src/components/dashboard/DashboardIndicadores.jsx

'use client'

import React, { useEffect, useState } from 'react'

// Componentes visuais do dashboard
import IndicadorMetric from '@components/dashboard/IndicadorMetric'
void IndicadorMetric
import IndicadorVariacao from '@components/dashboard/IndicadorVariacao'
void IndicadorVariacao
import Loader from '@components/shared/Loader'
void Loader

// Serviços e imagens
import { fetchDados } from '@services/metricsService'
import fireTotalImg from '@imgs/indicadoresMetricos/fire_3d_brilhante.png'
import fireFRPMedia from '@imgs/indicadoresMetricos/fire_frp_3d_brilhante.png'
import fireTempMedia from '@imgs/indicadoresMetricos/fire_temp_3d_brilhante.png'
import horaDePicco from '@imgs/indicadoresMetricos/horaPico_3d_brilhante.png'
import matoGroso from '@imgs/indicadoresMetricos/mato_grosso_borda_preta.png'

// Configuração dos cartões do dashboard
const configCartoes = [
    // Linha 1
    [
        { tipo: "hidro", titulo: "Indicador Hidro", valor: "01" },
        { tipo: "hidro", titulo: "Indicador Hidro", valor: "02" },
        { tipo: "fogo", titulo: "Total de Focos de Calor", icone: fireTotalImg, campo: "totalFocos" },
        { tipo: "fogo", titulo: "Média Fire Radiative Power ( MW )", icone: fireFRPMedia, campo: "frpMedio" },
    ],
    // Linha 2
    [
        { tipo: "hidro", titulo: "Indicador Hidro", valor: "03" },
        { tipo: "hidro", titulo: "Indicador Hidro", valor: "04" },
        { tipo: "fogo", titulo: "Temperatura Média ( Kelvin )", icone: fireTempMedia, campo: "temperaturaMedia" },
        { tipo: "fogo", titulo: "Horário com Maior Detecção", icone: horaDePicco, campo: "horarioDeteccaoPico" },
    ],
    // Linha 3
    [
        { tipo: "hidro", titulo: "Indicador Hidro", valor: "05" },
        { tipo: "hidro", titulo: "Indicador Hidro", valor: "06" },
        { tipo: "fogo", titulo: "Indicador Fogo", valor: "05" },
        { tipo: "fogo", titulo: "Regional Com Mais Focos", icone: matoGroso, campo: "CRBMComMaisFocos" },
    ],
]

// Hook customizado de busca e atualização de dados
function useIndicadoresAtuais() {
    const [dadosAtuais, setDadosAtuais] = useState(null)
    const [dadosAnteriores, setDadosAnteriores] = useState(null)

    useEffect(() => {
        fetchDados(setDadosAtuais, setDadosAnteriores)
        const interval = setInterval(() => {
            fetchDados(setDadosAtuais, setDadosAnteriores)
        }, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    return { dadosAtuais, dadosAnteriores }
}

// === Utilitários de formatação ===

function valorEhNulo(valor) {
    return valor == null
}
function deveFormatarComoDecimal(valor, arredondar) {
    return arredondar && typeof valor === 'number'
}
function deveArredondarValor(titulo) {
    return titulo !== 'Total de Focos de Calor'
}
function ehNulo(valor) { return valorEhNulo(valor) }
function ehDecimal(valor, arredondar) { return deveFormatarComoDecimal(valor, arredondar) }

const tiposFormatacao = [
    { condicao: ehNulo, tipo: 'nulo' },
    { condicao: ehDecimal, tipo: 'decimal' }
]
function obterTipoFormatacao(valor, arredondar) {
    const regra = tiposFormatacao.find(r => r.condicao(valor, arredondar))
    return regra ? regra.tipo : 'padrao'
}
const formatadores = {
    nulo: () => <Loader />,
    decimal: (valor) => valor.toFixed(2),
    padrao: (valor) => valor
}
function formatarValor(atual, arredondar) {
    const tipo = obterTipoFormatacao(atual, arredondar)
    return formatadores[tipo](atual)
}

// Renderização universal do cartão
function renderHidroCartao({ titulo, valor }, idx) {
    return (
        <IndicadorMetric
            key={`hidro-${idx}`}
            cor="blue"
            titulo={titulo}
            valor={valor}
        />
    );
}

function rangeHoraPico(horarioPico) {
    if (!horarioPico) return "";
    // Mantém o formato original para o horário inicial
    const horaStart = horarioPico;
    // Extrai apenas a hora para calcular a próxima
    const hora = parseInt(horarioPico.split(":")[0], 10);
    // Formata a próxima hora mantendo o mesmo padrão HH:00
    const horaEnd = String((hora + 1) % 24).padStart(2, "0") + ":00";

    return `${horaStart}h às ${horaEnd}h`;
}

function isHoraOuQuantidadeInvalida(hora, quantidade) {
    return !hora || quantidade === undefined;
}

function getLoaderIfInvalido(hora, quantidade) {
    if (isHoraOuQuantidadeInvalida(hora, quantidade)) return <Loader />;
    return null;
}

function getPicoTexto(hora, quantidade) {
    return `${rangeHoraPico(hora)} (${quantidade} focos)`;
}

function getPicoRangeTexto(hora, quantidade) {
    const loader = getLoaderIfInvalido(hora, quantidade);
    if (loader) return loader;
    return getPicoTexto(hora, quantidade);
}

function extrairHorarioPico(dados) {
    return dados ? dados.horarioPico : undefined;
}

function extrairQuantidadeHorarioPico(dados) {
    return dados ? dados.quantidadeHorarioPico : undefined;
}

function getPicoValorAtual(dados) {
    const horarioPico = extrairHorarioPico(dados);
    const quantidadeHorarioPico = extrairQuantidadeHorarioPico(dados);
    return getPicoRangeTexto(horarioPico, quantidadeHorarioPico);
}

function getCrbmTexto(dados) {
    const crbm = dados?.CRBMComMaisFocos;
    if (crbm === 'N/A') {
        return 'N/A';
    }
    if (!Array.isArray(crbm) || crbm.length === 0) {
        return <Loader />;
    }
    const { comandoRegional, totalFocos } = crbm[0];
    return `${comandoRegional} (${totalFocos} focos)`;
}
function isFogoCRBM(props) {
    return props.campo === "CRBMComMaisFocos";
}

function renderFogoCRBM({ titulo, icone }, dadosAtuais, dadosAnteriores, idx) {
    return (
        <IndicadorMetric
            key={`fogo-crbm-${idx}`}
            cor="red"
            titulo={titulo}
            imagem={icone}
            valor={getCrbmTexto(dadosAtuais)}
        />
    );
}

function renderFogoPicoCartao({ titulo, icone }, dadosAtuais, dadosAnteriores, idx) {
    const valorAtual = getPicoValorAtual(dadosAtuais);
    return (
        <IndicadorMetric
            key={`fogo-pico-${idx}`}
            cor="red"
            titulo={titulo}
            imagem={icone}
            valor={valorAtual}
        />
    );
}

function extrairValorAtual(campo, dadosAtuais) {
    return dadosAtuais ? dadosAtuais[campo] : undefined;
}

function extrairValorAnterior(campo, dadosAnteriores) {
    return dadosAnteriores ? dadosAnteriores[campo] : undefined;
}

function calcularArredondar(titulo) {
    return deveArredondarValor(titulo);
}

function calcularValorFormatado(valorAtual, arredondar) {
    return formatarValor(valorAtual, arredondar);
}

function renderFogoCartao({ titulo, icone, campo }, dadosAtuais, dadosAnteriores, idx) {
    const valorAtual = extrairValorAtual(campo, dadosAtuais);
    const valorAnterior = extrairValorAnterior(campo, dadosAnteriores);
    const arredondar = calcularArredondar(titulo);
    const valorFormatado = calcularValorFormatado(valorAtual, arredondar);

    return (
        <IndicadorMetric
            key={`fogo-${idx}`}
            cor="red"
            titulo={titulo}
            imagem={icone}
            valor={
                <>
                    {valorFormatado}
                    <IndicadorVariacao valorAtual={valorAtual} valorAnterior={valorAnterior} />
                </>
            }
        />
    );
}

function renderHidro(props, idx) {
    return renderHidroCartao(props, idx);
}

function renderFogoPico(props, dadosAtuais, dadosAnteriores, idx) {
    return renderFogoPicoCartao(props, dadosAtuais, dadosAnteriores, idx);
}

function renderFogoDinamico(props, dadosAtuais, dadosAnteriores, idx) {
    return renderFogoCartao(props, dadosAtuais, dadosAnteriores, idx);
}

function renderFogoEstatico({ titulo, icone, valor }, idx) {
    return (
        <IndicadorMetric
            key={`fogo-static-${idx}`}
            cor="red"
            titulo={titulo}
            imagem={icone}
            valor={valor}
        />
    );
}

function isFogoPico(props) {
    return props.campo === "horarioDeteccaoPico";
}

function isFogoDinamico(props) {
    return Boolean(props.campo);
}

const fogoRenderTypes = [
    { check: isFogoPico, handler: renderFogoPico },
    { check: isFogoCRBM, handler: renderFogoCRBM },
    { check: isFogoDinamico, handler: renderFogoDinamico }
];

function escolherRenderFogo(props, dadosAtuais, dadosAnteriores, idx) {
    const found = fogoRenderTypes.find(type => type.check(props));
    if (found) return found.handler(props, dadosAtuais, dadosAnteriores, idx);
    return renderFogoEstatico(props, idx);
}

const cartaoHandlers = {
    hidro: (props, _, __, idx) => renderHidro(props, idx),
    fogo: (props, dadosAtuais, dadosAnteriores, idx) => escolherRenderFogo(props, dadosAtuais, dadosAnteriores, idx)
};

function renderCartao(props, dadosAtuais, dadosAnteriores, idx) {
    const handler = cartaoHandlers[props.tipo];
    return handler ? handler(props, dadosAtuais, dadosAnteriores, idx) : null;
}

// Renderização do grid flexível
function renderGridModular(configCartoes, dadosAtuais, dadosAnteriores) {
    return (
        <div
            style={{
                display: 'grid',
                height: '100%',
                gridTemplateRows: `repeat(${configCartoes.length}, 1fr)`,
                gridTemplateColumns: `repeat(4, 1fr)`,
                gap: '0.3rem',
            }}
        >
            {configCartoes.flatMap((linha, i) =>
                linha.map((cartao, j) =>
                    renderCartao(cartao, dadosAtuais, dadosAnteriores, `${i}${j}`)
                )
            )}
        </div>
    )
}

// Componente principal
export default function DashboardIndicadores() {
    const { dadosAtuais, dadosAnteriores } = useIndicadoresAtuais()
    return renderGridModular(configCartoes, dadosAtuais, dadosAnteriores)
}
