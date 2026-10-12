import { describe, expect, it } from 'vitest';
import { formatMoney, moneyInUnit, parseMoney } from './money.js';

describe('moedas de D&D em cobre inteiro', () => {
  it('converte as quatro denominações e decimais sem erro de ponto flutuante', () => {
    expect(['PC', 'PP', 'PO', 'PL'].map((unit) => parseMoney('1', unit))).toEqual([1, 10, 100, 1000]);
    expect(parseMoney('0.29', 'PO')).toBe(29);
    expect(parseMoney('1,5', 'PO')).toBe(150);
    expect(parseMoney('-1.01', 'PO')).toBe(-101);
    expect(parseMoney('0.001', 'PL')).toBe(1);
  });
  it('recusa frações de cobre, expoentes e valores inseguros', () => {
    for (const value of ['0.1', '1e3', 'NaN', '', '9007199254740992']) expect(parseMoney(value, 'PC')).toBeNaN();
    expect(parseMoney('0.001', 'PO')).toBeNaN();
  });
  it('formata saldos, zeros e débitos em denominações mistas', () => {
    expect(formatMoney(150)).toBe('1 PO 5 PP');
    expect(formatMoney(1234)).toBe('1 PL 2 PO 3 PP 4 PC');
    expect(formatMoney(0)).toBe('0 PC');
    expect(formatMoney(-29)).toBe('-2 PP 9 PC');
  });
  it('trocar a unidade mantém exatamente o valor em cobre', () => {
    for (const value of [0, 1, 29, 150, 9999, -101, 100000000]) {
      for (const unit of ['PC', 'PP', 'PO', 'PL']) expect(parseMoney(moneyInUnit(value, unit), unit)).toBe(value);
    }
  });
});
