import { withCampaignTransaction } from './sessionService.js';
import { itemSchema } from '../schemas/itemSchemas.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_IMPORT_ROWS = 500;

const importRowSchema = itemSchema.omit({ shopId: true });

function sameName(value) {
  return value.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
}

// Nome da planilha -> id da categoria (ou raridade) da mesa, sem diferenciar
// maiusculas: "raro" entra como a "Raro" que ja existe, e nao como uma
// raridade nova. As que faltam sao criadas em ordem e com ON CONFLICT DO
// NOTHING, para duas importacoes criando a mesma nao falharem uma a outra.
async function resolveByName(model, campaignId, names) {
  const ids = new Map();
  const known = await model.findMany({ where: { campaignId }, select: { id: true, name: true }, orderBy: { id: 'asc' } });

  for (const entry of known) {
    if (!ids.has(sameName(entry.name))) ids.set(sameName(entry.name), entry.id);
  }

  const missing = new Map();

  for (const name of names) {
    if (!ids.has(sameName(name)) && !missing.has(sameName(name))) missing.set(sameName(name), name.trim());
  }

  if (missing.size > 0) {
    const created = [...missing.values()].sort();
    await model.createMany({ data: created.map((name) => ({ campaignId, name })), skipDuplicates: true });

    for (const entry of await model.findMany({ where: { campaignId, name: { in: created } }, select: { id: true, name: true } })) {
      if (!ids.has(sameName(entry.name))) ids.set(sameName(entry.name), entry.id);
    }
  }

  return (name) => ids.get(sameName(name));
}

// Importa uma lista de itens (de uma planilha CSV ou de um pacote do SRD) numa
// transacao so: ou entram todos os validos, ou nenhum. Linhas invalidas param a
// importacao inteira e voltam com o numero da linha, para o Mestre corrigir a
// planilha. Itens com o nome de um que o vendedor ja tem (ou repetidos na
// propria lista) ficam de fora, para importar duas vezes nao duplicar nada.
export async function importItems({ campaignId, actorUserId, shopId, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, 'Envie pelo menos um item para importar.');
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(400, `Importe no máximo ${MAX_IMPORT_ROWS} itens por vez.`);
  }

  const errors = [];
  const items = [];

  rows.forEach((row, index) => {
    const result = importRowSchema.safeParse(row);

    if (result.success) {
      items.push(result.data);
    } else {
      errors.push({ row: index + 1, message: result.error.issues[0].message });
    }
  });

  if (errors.length > 0) {
    throw new ApiError(400, `${errors.length} linha(s) com erro. Corrija e importe de novo.`, errors.slice(0, 50));
  }

  return withCampaignTransaction(campaignId, async (prisma) => {
    const shop = await prisma.shop.findFirst({ where: { campaignId, ...(shopId ? { id: shopId } : { isDefault: true }) } });

    if (!shop) {
      throw new ApiError(400, 'Vendedor inválido para esta mesa.');
    }

    // A trava no vendedor faz duas importacoes nele (duas abas, o reenvio, a
    // conta publica da demonstracao) lerem os nomes uma depois da outra: a
    // segunda ve os itens da primeira e nao duplica nada.
    await prisma.$queryRaw`SELECT id FROM shops WHERE id = ${shop.id} FOR NO KEY UPDATE`;
    const existing = await prisma.item.findMany({ where: { shopId: shop.id }, select: { name: true } });
    const taken = new Set(existing.map((item) => sameName(item.name)));
    const fresh = [];
    const skipped = [];

    for (const item of items) {
      const key = sameName(item.name);

      if (taken.has(key)) {
        skipped.push(item.name);
      } else {
        taken.add(key);
        fresh.push(item);
      }
    }

    // Categorias e raridades pelo nome, criadas na mesa quando ainda nao existem.
    const categoryId = await resolveByName(prisma.category, campaignId, fresh.map((item) => item.category));
    const rarityId = await resolveByName(prisma.rarity, campaignId, fresh.map((item) => item.rarity));

    if (fresh.length > 0) {
      await prisma.item.createMany({
        data: fresh.map((item) => ({
          campaignId,
          shopId: shop.id,
          name: item.name,
          categoryId: categoryId(item.category),
          rarityId: rarityId(item.rarity),
          description: item.description || '',
          price: item.price,
          sellPrice: item.sellPrice ?? null,
          isSellable: item.isSellable ?? true,
          stock: item.stock,
          weight: item.weight ?? null,
          damage: item.damage || '',
          armorClass: item.armorClass || '',
          requiresAttunement: Boolean(item.requiresAttunement),
          imageUrl: item.imageUrl || '',
          createdBy: actorUserId
        }))
      });
    }

    const message =
      `${fresh.length} item(ns) importado(s) para ${shop.name}.` +
      (skipped.length > 0 ? ` ${skipped.length} já existia(m) e ficou(aram) de fora.` : '');

    return { message, created: fresh.length, skipped };
  });
}
