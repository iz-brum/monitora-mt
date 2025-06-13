import { formatFire } from '#firms_utils/formatFire.js'

describe('formatFire', () => {
    test('formata corretamente o objeto de foco de calor', () => {
        const raw = {
            latitude: -10.123,
            longitude: -50.456,
            dataAquisicao: '2024-06-01',
            horaAquisicao: '14:00',
            temperaturaBrilho: 350.5,
            temperaturaBrilhoSecundaria: 330.1,
            resolucaoVarredura: 375,
            resolucaoTrilha: 375,
            potenciaRadiativa: 42.7,
            nomeSatelite: 'Suomi-NPP',
            instrumentoSensor: 'VIIRS',
            nivelConfianca: 'n',
            versaoProduto: '2.0NRT',
            indicadorDiaNoite: 'D',
            fonte: 'FIRMS',
            // extras que devem ser ignorados
            extra1: 'irrelevante',
            extra2: 1234
        }

        const result = formatFire(raw)

        expect(result).toEqual({
            latitude: raw.latitude,
            longitude: raw.longitude,
            dataAquisicao: raw.dataAquisicao,
            horaAquisicao: raw.horaAquisicao,
            temperaturaBrilho: raw.temperaturaBrilho,
            temperaturaBrilhoSecundaria: raw.temperaturaBrilhoSecundaria,
            resolucaoVarredura: raw.resolucaoVarredura,
            resolucaoTrilha: raw.resolucaoTrilha,
            potenciaRadiativa: raw.potenciaRadiativa,
            nomeSatelite: raw.nomeSatelite,
            instrumentoSensor: raw.instrumentoSensor,
            nivelConfianca: raw.nivelConfianca,
            versaoProduto: raw.versaoProduto,
            indicadorDiaNoite: raw.indicadorDiaNoite,
            fonte: raw.fonte
        })

        // Verifica que chaves irrelevantes não aparecem
        expect(result.extra1).toBeUndefined()
        expect(result.extra2).toBeUndefined()
    })
})
