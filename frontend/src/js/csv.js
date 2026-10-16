import { parseMoney } from './money.js';

// Le um CSV (RFC 4180): campos entre aspas podem ter separador, quebra de
// linha e aspas dobradas. O separador e o que aparece na primeira linha: ";"
// (o Excel em portugues), "," ou tabulacao.
export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = [';', ',', '\t'].reduce(
    (best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best),
    ';'
  );
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function normalizeHeader(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Nomes de coluna aceitos (sem acento, minusculas) para cada campo do item.
const COLUMNS = {
  name: ['nome', 'name', 'item'],
  category: ['categoria', 'category'],
  rarity: ['raridade', 'rarity'],
  price: ['preco', 'preco po', 'price', 'valor'],
  stock: ['estoque', 'stock', 'quantidade'],
  description: ['descricao', 'description'],
  sellPrice: ['preco venda', 'preco de venda', 'sell price', 'revenda'],
  weight: ['peso', 'peso lb', 'weight'],
  damage: ['dano', 'damage'],
  armorClass: ['ca', 'classe de armadura', 'armor class', 'armadura'],
  requiresAttunement: ['sintonizacao', 'attunement', 'exige sintonizacao'],
  imageUrl: ['imagem', 'image', 'image url', 'url da imagem']
};

const REQUIRED = { name: 'nome', category: 'categoria', price: 'preco' };

const YES = ['sim', 's', 'x', 'true', 'yes', '1'];
const NO = ['nao', 'n', 'false', 'no', '0', ''];

export const CSV_TEMPLATE = [
  'nome;categoria;raridade;preco;estoque;descricao;preco_venda;peso;dano;ca;sintonizacao;imagem',
  'Espada longa;Armas;Comum;15;3;Versátil (1d10).;;3;1d8 cortante;;não;',
  'Corda de seda (15 m);Equipamentos;Comum;10;5;2 pontos de vida.;;5;;;não;',
  'Anel de proteção;Mágicos;Raro;3500,5;1;+1 na CA e nos testes de resistência.;;;;+1;sim;'
].join('\r\n');

// Transforma a planilha em itens para a API. Precos vem em PO (aceitando
// virgula: 2,5 PO) e vao em PC; peso em libras. Cada item leva a linha da
// planilha (line) para os erros apontarem o lugar certo.
export function csvToItems(text) {
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return { items: [], errors: [{ line: 1, message: 'A planilha precisa de um cabeçalho e pelo menos uma linha de item.' }] };
  }

  const headers = rows[0].map(normalizeHeader);
  const columnOf = {};

  for (const [field, aliases] of Object.entries(COLUMNS)) {
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index !== -1) columnOf[field] = index;
  }

  const missing = Object.entries(REQUIRED).filter(([field]) => columnOf[field] === undefined).map(([, label]) => label);

  if (missing.length > 0) {
    return { items: [], errors: [{ line: 1, message: `Faltam as colunas: ${missing.join(', ')}.` }] };
  }

  const items = [];
  const errors = [];

  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const cell = (field) => (columnOf[field] === undefined ? '' : String(cells[columnOf[field]] ?? '').trim());
    const fail = (message) => errors.push({ line, message });

    const price = parseMoney(cell('price'), 'PO');
    if (!Number.isSafeInteger(price) || price < 0) {
      fail(`Preço inválido: "${cell('price')}". Use PO, como 15 ou 2,5.`);
      return;
    }

    const sellText = cell('sellPrice');
    const sellPrice = sellText === '' ? null : parseMoney(sellText, 'PO');
    if (sellPrice !== null && (!Number.isSafeInteger(sellPrice) || sellPrice < 0)) {
      fail(`Preço de venda inválido: "${sellText}".`);
      return;
    }

    const stockText = cell('stock');
    const stock = stockText === '' ? 0 : Number(stockText);
    if (!Number.isInteger(stock) || stock < 0) {
      fail(`Estoque inválido: "${stockText}".`);
      return;
    }

    const weightText = cell('weight').replace(',', '.');
    const weight = weightText === '' ? null : Number(weightText);
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
      fail(`Peso inválido: "${cell('weight')}".`);
      return;
    }

    const attunement = normalizeHeader(cell('requiresAttunement'));
    if (!YES.includes(attunement) && !NO.includes(attunement)) {
      fail(`Sintonização deve ser "sim" ou "não", e não "${cell('requiresAttunement')}".`);
      return;
    }

    items.push({
      line,
      name: cell('name'),
      category: cell('category'),
      rarity: cell('rarity') || 'Comum',
      price,
      stock,
      description: cell('description'),
      sellPrice,
      weight,
      damage: cell('damage'),
      armorClass: cell('armorClass'),
      requiresAttunement: YES.includes(attunement),
      imageUrl: cell('imageUrl')
    });
  });

  return { items, errors };
}
