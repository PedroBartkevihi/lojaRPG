import { Backpack, FlaskConical, Gem, Package, Scroll, Shield, Sparkles, Sword } from 'lucide-react';

// Cores por nivel de raridade, como nos livros de D&D: comum, incomum, raro,
// muito raro e lendario. Raridades criadas pelo Mestre usam o rank delas.
export function rarityTier(rank) {
  const value = Number(rank) || 1;
  return Math.min(Math.max(Math.round(value), 1), 5);
}

function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Icone pela categoria do item; categorias novas do Mestre caem no generico.
const CATEGORY_ICONS = [
  [/arma(?!dura)/, Sword],
  [/armadura|escudo/, Shield],
  [/poc|elixir/, FlaskConical],
  [/magic|arcan|encant/, Sparkles],
  [/pergaminho|livro|mapa/, Scroll],
  [/joia|gema|tesouro/, Gem],
  [/equipamento|ferramenta|kit/, Backpack]
];

export function categoryIcon(category) {
  const name = normalize(category);
  return CATEGORY_ICONS.find(([pattern]) => pattern.test(name))?.[1] || Package;
}
