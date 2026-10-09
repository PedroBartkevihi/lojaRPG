// Catalogo com que toda mesa nova comeca; o Mestre edita ou remove o que nao
// quiser. A mesa de demonstracao do seed usa os mesmos dados.
export const STARTER_CATEGORIES = ['Armas', 'Armaduras', 'Poções', 'Mágicos', 'Equipamentos'];

export const STARTER_RARITIES = [
  { name: 'Comum', rank: 1 },
  { name: 'Incomum', rank: 2 },
  { name: 'Raro', rank: 3 }
];

export const STARTER_ITEMS = [
  { name: 'Espada Longa', category: 'Armas', rarity: 'Comum', description: 'Uma lâmina confiável para duelos e masmorras.', price: 75, stock: 5 },
  { name: 'Arco Curto', category: 'Armas', rarity: 'Comum', description: 'Arco simples, leve e fácil de carregar.', price: 45, stock: 6 },
  { name: 'Adaga de Prata', category: 'Armas', rarity: 'Incomum', description: 'Boa contra criaturas sensíveis à prata.', price: 60, stock: 3 },
  { name: 'Armadura de Couro Batido', category: 'Armaduras', rarity: 'Comum', description: 'Proteção leve para aventureiros discretos.', price: 90, stock: 4 },
  { name: 'Escudo Reforçado', category: 'Armaduras', rarity: 'Comum', description: 'Escudo de madeira com aro metálico.', price: 55, stock: 4 },
  { name: 'Poção de Cura', category: 'Poções', rarity: 'Comum', description: 'Recupera energia vital em momentos perigosos.', price: 50, stock: 12 },
  { name: 'Poção de Invisibilidade', category: 'Poções', rarity: 'Raro', description: 'Concede invisibilidade por curto período.', price: 220, stock: 2 },
  { name: 'Pergaminho de Bola de Fogo', category: 'Mágicos', rarity: 'Raro', description: 'Pergaminho arcano de uso único.', price: 180, stock: 2 },
  { name: 'Anel de Proteção Menor', category: 'Mágicos', rarity: 'Raro', description: 'Um anel simples com runas protetoras.', price: 260, stock: 1 },
  { name: 'Kit de Aventureiro', category: 'Equipamentos', rarity: 'Comum', description: 'Corda, pederneira, tocha e pequenas ferramentas.', price: 35, stock: 8 }
];
