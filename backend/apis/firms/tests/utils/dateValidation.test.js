import { validateDateRange, DATE_CONFIG } from '#firms_utils/dateValidation.js';
import dayjs from 'dayjs';

describe('validateDateRange', () => {
    test('retorna true para datas nulas ou indefinidas', () => {
        expect(validateDateRange(null)).toBe(true);
        expect(validateDateRange(undefined)).toBe(true);
    });

    test('retorna true para data atual', () => {
        const today = dayjs().toISOString();
        expect(validateDateRange(today)).toBe(true);
    });

    test('retorna true para data dentro do limite de dias no passado', () => {
        const withinLimit = dayjs().subtract(DATE_CONFIG.MAX_DAYS_IN_PAST, 'day').toISOString();
        expect(validateDateRange(withinLimit)).toBe(true);
    });

    test('lança erro para data mais antiga que o permitido', () => {
        const tooOld = dayjs().subtract(DATE_CONFIG.MAX_DAYS_IN_PAST + 1, 'day').toISOString();
        expect(() => validateDateRange(tooOld)).toThrow(
            `Data não pode ser mais antiga que ${DATE_CONFIG.MAX_DAYS_IN_PAST} dias`
        );
    });

    test('lança erro para data futura', () => {
        const tomorrow = dayjs().add(1, 'day').toISOString();
        expect(() => validateDateRange(tomorrow)).toThrow('Data não pode ser futura');
    });
});
