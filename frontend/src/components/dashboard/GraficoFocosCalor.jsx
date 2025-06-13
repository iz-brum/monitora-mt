// frontend/src/components/dashboard/GraficoFocosCalor.jsx

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
void LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer

import { useEffect, useState } from 'react';

import { buscarDadosSemanais } from '@services/weeklyService'
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


export default function GraficoFocosCalor() {
    const [dados, setDados] = useState([]);

    // Função auxiliar para formatar o tooltip
    const formatarTooltip = (value, name, props) => {
        // props aqui é o objeto que contém payload
        const payload = props?.payload;
        if (!payload?.dataOriginal) {
            // se não existir dataOriginal, apenas retornamos o próprio value (sem legenda extra)
            return [`${value}`, ''];
        }

        const dataOriginal = payload.dataOriginal;
        const diaDaSemana = format(new Date(dataOriginal + 'T00:00:00'), 'EEEE', { locale: ptBR });

        return [`Total: ${value} focos`, diaDaSemana];
    };


    const formatarLabel = (label, props) => {
        if (!props?.payload?.dataOriginal) return label;

        const dataOriginal = props.payload.dataOriginal;
        const dataFormatada = format(new Date(dataOriginal + 'T00:00:00'), 'dd/MM', { locale: ptBR });

        // Retorna apenas a data no formato dd/MM
        return dataFormatada;
    };

    useEffect(() => {
        async function carregarDados() {
            try {
                console.debug('Iniciando carregamento dos dados');
                const dadosBrutos = await buscarDadosSemanais();

                if (!Array.isArray(dadosBrutos) || dadosBrutos.length === 0) {
                    console.warn('Dados inválidos ou vazios recebidos');
                    setDados([]);
                    return;
                }

                console.debug('Dados brutos recebidos:', dadosBrutos);

                const dadosFormatados = dadosBrutos
                    .filter(item => item && item.data)
                    .map(item => ({
                        ...item,
                        dataOriginal: item.data,
                        data: format(new Date(item.data + 'T00:00:00'), 'dd/MM', { locale: ptBR })
                    }))
                    .sort((a, b) => new Date(a.dataOriginal) - new Date(b.dataOriginal));

                console.debug('Dados formatados:', dadosFormatados);
                setDados(dadosFormatados);
            } catch (error) {
                console.error('Erro ao carregar dados do gráfico:', error);
                setDados([]);
            }
        }

        carregarDados(); // Executa imediatamente ao montar

        // Se quiser igual ao outro, adicione o setInterval:
        const interval = setInterval(carregarDados, 30 * 60 * 1000);

        // Cleanup no unmount
        return () => clearInterval(interval);

    }, []);

    // Calcula a largura necessária baseada no maior valor
    const calcularLarguraEixoY = () => {
        const maiorValor = Math.max(...dados.map(item => item.focos));
        // Aumentando para 12px por dígito e padding maior
        return (maiorValor.toString().length * 12) + 20;
    };

    return (
        <div style={{
            width: '100%',
            height: '96%',
            minHeight: '100px',
            flex: 1
        }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={dados}
                    margin={{
                        top: 25,      // Aumentado para acomodar labels superiores
                        right: 5,    // Aumentado para acomodar pontos
                        left: 0,     // Adicionada margem à esquerda
                        bottom: 5
                    }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.2)"
                    />
                    <XAxis
                        dataKey="data"
                        stroke="#fff"
                        tick={{ fill: '#fff' }}
                        axisLine={{ strokeWidth: 2 }}
                        tickLine={{ strokeWidth: 2 }}
                        padding={{ left: 30, right: 30 }} // Adiciona espaço nas extremidades
                    />
                    <YAxis
                        stroke="#fff"
                        tick={{ fill: '#fff' }}
                        width={calcularLarguraEixoY()}
                        tickMargin={3}
                        domain={[0, 'auto']}
                        axisLine={{ strokeWidth: 2 }}
                        tickLine={{ strokeWidth: 2 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px' // Adiciona um padding interno
                        }}
                        formatter={formatarTooltip}
                        labelFormatter={formatarLabel}
                        separator={<br />}
                    />
                    <Line
                        type="monotone"
                        dataKey="focos"
                        stroke="#ff7300"
                        strokeWidth={2}
                        dot={{
                            fill: '#ff7300',
                            r: 4
                        }}
                        label={{
                            position: 'top',
                            fill: '#fff',
                            fontSize: 12,
                            formatter: (value) => value,
                            offset: 10
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}