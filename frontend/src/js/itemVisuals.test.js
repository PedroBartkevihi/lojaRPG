import { Backpack, FlaskConical, Package, Shield, Sparkles, Sword } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { categoryIcon, rarityTier } from './itemVisuals.js';

describe('itemVisuals', () => {
  it('limita o nivel de raridade entre comum (1) e lendario (5)', () => {
    expect(rarityTier(undefined)).toBe(1);
    expect(rarityTier(3)).toBe(3);
    expect(rarityTier(12)).toBe(5);
    expect(rarityTier(0)).toBe(1);
  });

  it('escolhe o icone pela categoria, com ou sem acento', () => {
    expect(categoryIcon('Armas')).toBe(Sword);
    expect(categoryIcon('Armaduras')).toBe(Shield);
    expect(categoryIcon('Poções')).toBe(FlaskConical);
    expect(categoryIcon('Magicos')).toBe(Sparkles);
    expect(categoryIcon('Equipamentos')).toBe(Backpack);
    expect(categoryIcon('Montarias')).toBe(Package);
  });
});
