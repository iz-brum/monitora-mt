import { isSensorType } from '#firms_utils/sensorUtils.js'

describe('isSensorType', () => {
    test('retorna true quando sensor é do tipo especificado', () => {
        expect(isSensorType('MODIS_NRT', 'MODIS')).toBe(true)
        expect(isSensorType('VIIRS_SNPP_NRT', 'VIIRS')).toBe(true)
    })

    test('retorna false quando sensor não é do tipo especificado', () => {
        expect(isSensorType('MODIS_NRT', 'VIIRS')).toBe(false)
        expect(isSensorType('VIIRS_SNPP_NRT', 'MODIS')).toBe(false)
    })

    test('ignora diferenças de maiúsculas/minúsculas', () => {
        expect(isSensorType('modis_nrt', 'MODIS')).toBe(true)
        expect(isSensorType('VIIRS_SNPP_NRT', 'viirs')).toBe(true)
    })

    test('retorna false quando parâmetros são inválidos', () => {
        expect(isSensorType(null, 'MODIS')).toBe(false)
        expect(isSensorType('MODIS_NRT', null)).toBe(false)
        expect(isSensorType(undefined, 'VIIRS')).toBe(false)
        expect(isSensorType('', '')).toBe(false)
    })
})
