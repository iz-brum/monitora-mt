// apis/firms/tests/utils/geospatial.test.js
import { jest } from '@jest/globals'

// MOCKS ESM
const mockUnion = jest.fn()
const turfMock = {
  bbox: jest.fn(() => [0, 0, 10, 10]),
  union: mockUnion,
}

jest.unstable_mockModule('@turf/turf', () => turfMock)

const fsMock = { readFileSync: jest.fn() }
const pathMock = { resolve: jest.fn(() => '/fake/path/mock.json') }

jest.unstable_mockModule('fs', () => ({ default: fsMock }))
jest.unstable_mockModule('path', () => ({ default: pathMock }))

// Importações após mocks
const { loadGeoJson, computeBbox, unionFeatures } = await import('#firms_utils/geospatial.js')

describe('geospatial utils', () => {
  describe('loadGeoJson', () => {
    test('carrega e parseia corretamente um arquivo GeoJSON válido', () => {
      const fakeJson = { type: 'FeatureCollection', features: [] }
      fsMock.readFileSync.mockReturnValue(JSON.stringify(fakeJson))

      const result = loadGeoJson('mock/path.json')

      expect(fsMock.readFileSync).toHaveBeenCalledWith('/fake/path/mock.json', 'utf8')
      expect(result).toEqual(fakeJson)
    })
  })

  describe('computeBbox', () => {
    test('retorna o bbox do geojson', () => {
      const fakeGeo = { type: 'Feature', geometry: {} }
      const bbox = computeBbox(fakeGeo)
      expect(turfMock.bbox).toHaveBeenCalledWith(fakeGeo)
      expect(bbox).toEqual([0, 0, 10, 10])
    })
  })

  describe('unionFeatures', () => {
    test('retorna único feature se só houver um', () => {
      const f = { type: 'Feature', geometry: {} }
      const result = unionFeatures({ type: 'FeatureCollection', features: [f] })
      expect(result).toBe(f)
    })

    test('usa turf.union para múltiplos features', () => {
      const f1 = { type: 'Feature', geometry: {} }
      const f2 = { type: 'Feature', geometry: {} }
      const fakeUnionResult = { type: 'Feature', geometry: { type: 'MultiPolygon' } }

      mockUnion.mockReturnValue(fakeUnionResult)

      const result = unionFeatures({ type: 'FeatureCollection', features: [f1, f2] })
      expect(mockUnion).toHaveBeenCalled()
      expect(result).toEqual(fakeUnionResult)
    })

    test('lança erro se GeoJSON não tiver features', () => {
      const geojson = { type: 'FeatureCollection', features: [] }
      expect(() => unionFeatures(geojson)).toThrow('GeoJSON sem features para unir')
    })
  })
})
