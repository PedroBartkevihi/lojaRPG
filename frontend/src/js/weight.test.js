import { describe, expect, it } from 'vitest';
import { formatWeight, inventoryWeight } from './weight.js';

describe('peso', () => {
  it('mostra libras com vírgula e sem casas sobrando', () => {
    expect(formatWeight(2.5)).toBe('2,5 lb');
    expect(formatWeight(65)).toBe('65 lb');
    expect(formatWeight(null)).toBe('');
  });

  it('soma o inventário contando zero para itens sem peso', () => {
    const inventory = [
      { quantity: 2, item: { weight: 2.5 } },
      { quantity: 3, item: { weight: null } },
      { quantity: 1, item: { weight: 0.1 } },
      { quantity: 2, item: { weight: 0.1 } }
    ];
    expect(inventoryWeight(inventory)).toBe(5.3);
  });
});
