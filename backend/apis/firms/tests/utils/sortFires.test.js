import { sortFires } from '#firms_utils/sortFires.js'

const base = [
    {
        instrumentoSensor: 'MODIS',
        nomeSatelite: 'Terra',
        dataAquisicao: '2024-06-01',
        horaAquisicao: '10:30'
    },
    {
        instrumentoSensor: 'VIIRS',
        nomeSatelite: 'NOAA-20',
        dataAquisicao: '2024-06-01',
        horaAquisicao: '09:15'
    },
    {
        instrumentoSensor: 'MODIS',
        nomeSatelite: 'Aqua',
        dataAquisicao: '2024-06-01',
        horaAquisicao: '10:20'
    }
]

describe('sortFires', () => {
    test('ordena por sensor (e por satélite como desempate)', () => {
        const sorted = sortFires(base, 'sensor')
        expect(sorted.map(f => f.nomeSatelite)).toEqual(['Aqua', 'Terra', 'NOAA-20'])
    })

    test('ordena por data e hora de aquisição', () => {
        const sorted = sortFires(base, 'datetime')
        expect(sorted.map(f => f.horaAquisicao)).toEqual(['09:15', '10:20', '10:30'])
    })

    test('usa critério padrão "sensor" se critério for inválido', () => {
        const sorted = sortFires(base, 'inexistente')
        expect(sorted.map(f => f.nomeSatelite)).toEqual(['Aqua', 'Terra', 'NOAA-20'])
    })

    test('funciona com campos ausentes', () => {
        const custom = [
            { instrumentoSensor: null, nomeSatelite: 'X', dataAquisicao: '2024-06-01', horaAquisicao: '10:00' },
            { instrumentoSensor: 'MODIS', nomeSatelite: null, dataAquisicao: '2024-06-01', horaAquisicao: '09:00' }
        ]
        const sorted = sortFires(custom, 'sensor')
        expect(sorted[1].instrumentoSensor).toBe('MODIS')  // <--- índice alterado
    })
})
