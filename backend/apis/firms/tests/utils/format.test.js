import {
  formatHour,
  toNumber,
  formatConfidence,
  formatDayNightIndicator,
  formatProductVersion,
  translateSatelliteName
} from '#firms_utils/format.js';

test('formatHour', () => {
  expect(formatHour(41)).toBe('00:41');    // 41 => "00:41"
  expect(formatHour(100)).toBe('01:00');   // 100 => "01:00"
  expect(formatHour(930)).toBe('09:30');   // 930 => "09:30"
  expect(formatHour(1230)).toBe('12:30');  // 1230 => "12:30"
  expect(formatHour(0)).toBe('00:00');     // 0 => "00:00"
});

describe('toNumber', () => {
  test('converte strings numéricas corretamente', () => {
    expect(toNumber('123')).toBe(123);
    expect(toNumber('45.67')).toBeCloseTo(45.67);
  });

  test('mantém números como estão', () => {
    expect(toNumber(99)).toBe(99);
    expect(toNumber(0)).toBe(0);
  });

  test('retorna undefined para null e undefined', () => {
    expect(toNumber(null)).toBeUndefined();
    expect(toNumber(undefined)).toBeUndefined();
  });

  test('converte strings com espaços', () => {
    expect(toNumber(' 12.5 ')).toBeCloseTo(12.5);
  });

  test('retorna NaN para strings não numéricas', () => {
    expect(toNumber('null')).toBeNaN();
    expect(toNumber('n/a')).toBeNaN();
  });
});


describe('formatConfidence', () => {
  test('retorna categoria textual para letras conhecidas', () => {
    expect(formatConfidence('h')).toBe('alto');
    expect(formatConfidence('H')).toBe('alto');
    expect(formatConfidence('n')).toBe('nominal');
    expect(formatConfidence('N')).toBe('nominal');
    expect(formatConfidence('l')).toBe('baixo');
    expect(formatConfidence('L')).toBe('baixo');
  });

  test('retorna número se entrada for parseável', () => {
    expect(formatConfidence('85')).toBe(85);
    expect(formatConfidence(99)).toBe(99);
  });

  test('retorna null para strings inválidas', () => {
    expect(formatConfidence('foo')).toBeNull();
    expect(formatConfidence('x')).toBeNull();
  });

  test('retorna null para null e undefined', () => {
    expect(formatConfidence(null)).toBeNull();
    expect(formatConfidence(undefined)).toBeNull();
  });
});

describe('formatDayNightIndicator', () => {
  test('retorna "Dia" para valores correspondentes a D', () => {
    expect(formatDayNightIndicator('d')).toBe('Dia');
    expect(formatDayNightIndicator('D')).toBe('Dia');
  });

  test('retorna "Noite" para valores correspondentes a N', () => {
    expect(formatDayNightIndicator('n')).toBe('Noite');
    expect(formatDayNightIndicator('N')).toBe('Noite');
  });

  test('retorna valor original se não for reconhecido', () => {
    expect(formatDayNightIndicator('x')).toBe('X');
    expect(formatDayNightIndicator(' X ')).toBe('X');
    expect(formatDayNightIndicator(123)).toBe('123');
  });

  test('retorna null para null ou undefined', () => {
    expect(formatDayNightIndicator(null)).toBeNull();
    expect(formatDayNightIndicator(undefined)).toBeNull();
  });
});

describe('formatProductVersion', () => {
  test('formata versão com modo URT', () => {
    expect(formatProductVersion('6.1URT')).toBe('C6.1 (ultra tempo real)');
  });

  test('formata versão com modo NRT', () => {
    expect(formatProductVersion('2.0NRT')).toBe('C2.0 (quase tempo real)');
  });

  test('formata versão com modo RT', () => {
    expect(formatProductVersion('1.0RT')).toBe('C1.0 (tempo real)');
  });

  test('formata versão sem modo', () => {
    expect(formatProductVersion('1.0')).toBe('C1.0');
  });

  test('retorna null se versão for nula ou inválida', () => {
    expect(formatProductVersion(null)).toBeNull();
    expect(formatProductVersion(undefined)).toBeNull();
    expect(formatProductVersion('')).toBeNull();
  });

  test('retorna original se não casar com padrão esperado', () => {
    expect(formatProductVersion('v123')).toBe('v123');
    expect(formatProductVersion('123ABC')).toBe('123ABC');
  });
});

describe('translateSatelliteName', () => {
  test('retorna nome amigável para satélites conhecidos', () => {
    expect(translateSatelliteName('N20')).toBe('NOAA-20');
    expect(translateSatelliteName('N21')).toBe('NOAA-21');
    expect(translateSatelliteName('N')).toBe('Suomi-NPP');
  });

  test('mantém nome original se não houver tradução', () => {
    expect(translateSatelliteName('Terra')).toBe('Terra');
    expect(translateSatelliteName('XYZ')).toBe('XYZ');
  });

  test('retorna valor original se for null ou undefined', () => {
    expect(translateSatelliteName(null)).toBe(null);
    expect(translateSatelliteName(undefined)).toBe(undefined);
  });
});
