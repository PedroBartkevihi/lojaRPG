// Contratos entre o front e a API (D6, TypeScript gradual). Os modulos em
// JavaScript usam estes tipos por JSDoc, e o `npm run typecheck` confere os
// arquivos listados no tsconfig.json. Valores de dinheiro sempre em PC.

export type Money = number;

export interface Discount {
  id: number;
  name: string;
  percent: number;
}

export interface Item {
  id: number;
  campaignId?: number;
  shopId: number;
  shopName?: string;
  shopOpen?: boolean;
  name: string;
  categoryId?: number;
  category: string;
  rarityId?: number;
  rarity: string;
  rarityRank?: number;
  description: string;
  price: Money;
  sellPrice?: Money | null;
  isSellable?: boolean;
  effectiveSellPrice?: Money | null;
  /** Preco com o maior desconto que vale para o personagem (GET /items?characterId=). */
  finalPrice?: Money;
  discount?: Discount | null;
  stock: number;
  weight?: number | null;
  damage?: string;
  armorClass?: string;
  requiresAttunement?: boolean;
  imageUrl?: string;
  isActive?: boolean;
}

export interface Character {
  id: number;
  campaignId?: number;
  userId?: number;
  userName?: string;
  name: string;
  className: string;
  race: string;
  level: number;
  strength?: number;
  carryCapacity?: number;
  carriedWeight?: number;
  gold: Money;
}

export type CampaignRole = 'MESTRE' | 'JOGADOR';

export interface Campaign {
  id: number;
  name: string;
  role: CampaignRole;
  inviteCode?: string;
  isDemo?: boolean;
  memberCount?: number;
  createdAt?: string;
}

export interface InventoryEntry {
  id: number;
  characterId: number;
  itemId: number;
  quantity: number;
  item: Item;
}

/** Linha de uma planilha CSV ja convertida para a importacao (POST /items/import). */
export interface ImportRow {
  line: number;
  name: string;
  category: string;
  rarity: string;
  price: Money;
  stock: number;
  description: string;
  sellPrice: Money | null;
  weight: number | null;
  damage: string;
  armorClass: string;
  requiresAttunement: boolean;
  imageUrl: string;
}

export interface LineError {
  line: number;
  message: string;
}
