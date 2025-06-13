import { parseQuery } from '#firms_utils/parseQuery.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

describe('parseQuery', () => {
  test('retorna período baseado em horas no mesmo dia', () => {
    const result = parseQuery({ dt: '2024-06-05', hr: '2' })
    expect(result.dayRange).toBe(1)
    expect(result.date).toBe('2024-06-05')
    expect(dayjs(result.timeRange.end).hour()).toBeGreaterThan(dayjs(result.timeRange.start).hour())
  })

  test('retorna período baseado em horas atravessando dias', () => {
    const result = parseQuery({ dt: '2024-06-05', hr: '26' })
    expect(result.dayRange).toBe(2)
  })

  test('usa refDate como fim do dia se não for hoje', () => {
    const result = parseQuery({ dt: '2024-06-01', hr: '4' })
    expect(result.timeRange.end).toMatch(/T23:59:59/)
    expect(result.dayRange).toBe(1)
  })

  test('retorna dayRange baseado em dias', () => {
    const result = parseQuery({ dt: '2024-06-01', dr: '5' })
    expect(result).toEqual({
      dayRange: 5,
      date: '2024-06-01'
    })
  })

  test('usa dayRange 1 como padrão', () => {
    const result = parseQuery({ dt: '2024-06-01' })
    expect(result).toEqual({
      dayRange: 1,
      date: '2024-06-01'
    })
  })
})
