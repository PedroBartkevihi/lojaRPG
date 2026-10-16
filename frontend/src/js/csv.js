import { parseMoney } from './money.js';

// Le um CSV (RFC 4180): campos entre aspas podem ter separador, quebra de
// linha e aspas dobradas. O separador e o que aparece na primeira linha: ";"
// (o Excel em portugues), "," ou tabulacao. Cada registro guarda a linha do
// arquivo onde comeca, contando as linhas em branco, e `unclosedAt` aponta
// aspas abertas que nunca fecham (o resto do arquivo viraria um campo so).
export function readCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = [';', ',', '\t'].reduce(
    (best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best),
    ';'
  );
  const records = [];
  let row = [];
  let field = '';
  let quoted = false;
  let quoteLine = 1;
  let line = 1;
  let rowLine = 1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === '\n' || (char === '\r' && source[index + 1] !== '\n')) line += 1;
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
      quoteLine = line;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      records.push({ cells: row, line: rowLine });
      row = [];
      field = '';
      line += 1;
      rowLine = line;
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    records.push({ cells: row, line: rowLine });
  }

  return {
    records: records.filter(({ cells }) => cells.some((cell) => cell.trim() !== '')),
    unclosedAt: quoted ? quoteLine : null
  };
}

export function parseCsv(text) {
  return readCsv(text).records.map(({ cells }) => cells);
}

// Arquivo da planilha em texto: UTF-8 (o "CSV UTF-8" do Excel e o modelo) ou,
// se os bytes nao forem UTF-8 valido, Windows-1252, o "CSV" comum do Excel em
// portugues. Sem isso, "Poções" chegaria como "Po��es".
export function decodeCsv(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

// Numero escrito como no Brasil: virgula decimal e ponto de milhar ("1.500"
// sao mil e quinhentos, "2,5" sao dois e meio). Um ponto sem o formato de
// milhar continua decimal ("0.5", "2.5").
function decimalText(value) {
  const text = value.replace(/\s/g, '');
  const grouped = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(text) ? text.replace(/\./g, '') : text;
  return grouped.replace(',', '.');
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
  price: ['preco', 'preco po', 'price', 'valor', 'valor po'],
  stock: ['estoque', 'stock', 'quantidade', 'estoque inicial', 'qtd'],
  description: ['descricao', 'description'],
  sellPrice: ['preco venda', 'preco de venda', 'preco venda po', 'preco de venda po', 'sell price', 'revenda', 'revenda po'],
  weight: ['peso', 'peso lb', 'peso libras', 'weight'],
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
  'Anel de proteção;Mágicos;Raro;3500,5;1;Bônus de +1 na CA e nos testes de resistência.;;;;bônus +1;sim;'
].join('\r\n');

// Transforma a planilha em itens para a API. Precos vem em PO (aceitando
// virgula: 2,5 PO, e ponto de milhar: 1.500 PO) e vao em PC; peso em libras.
// Cada item leva a linha da planilha (line) para os erros apontarem o lugar
// certo, e `ignored` lista as colunas que nao correspondem a nenhum campo.
export function csvToItems(text) {
  const { records, unclosedAt } = readCsv(text);

  if (unclosedAt !== null) {
    return {
      items: [],
      errors: [{ line: unclosedAt, message: 'Aspas abertas sem fechar a partir desta linha. Feche as aspas e importe de novo.' }],
      ignored: []
    };
  }

  if (records.length < 2) {
    return { items: [], errors: [{ line: 1, message: 'A planilha precisa de um cabeçalho e pelo menos uma linha de item.' }], ignored: [] };
  }

  const headers = records[0].cells.map(normalizeHeader);
  const columnOf = {};

  for (const [field, aliases] of Object.entries(COLUMNS)) {
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index !== -1) columnOf[field] = index;
  }

  const used = new Set(Object.values(columnOf));
  const ignored = records[0].cells.filter((header, index) => !used.has(index) && header.trim() !== '').map((header) => header.trim());
  const missing = Object.entries(REQUIRED).filter(([field]) => columnOf[field] === undefined).map(([, label]) => label);

  if (missing.length > 0) {
    return { items: [], errors: [{ line: records[0].line, message: `Faltam as colunas: ${missing.join(', ')}.` }], ignored };
  }

  const items = [];
  const errors = [];

  records.slice(1).forEach(({ cells, line }) => {
    const cell = (field) => (columnOf[field] === undefined ? '' : String(cells[columnOf[field]] ?? '').trim());
    const fail = (message) => errors.push({ line, message });

    const price = parseMoney(decimalText(cell('price')), 'PO');
    if (!Number.isSafeInteger(price) || price < 0) {
      fail(`Preço inválido: "${cell('price')}". Use PO, como 15 ou 2,5.`);
      return;
    }

    const sellText = cell('sellPrice');
    const sellPrice = sellText === '' ? null : parseMoney(decimalText(sellText), 'PO');
    if (sellPrice !== null && (!Number.isSafeInteger(sellPrice) || sellPrice < 0)) {
      fail(`Preço de venda inválido: "${sellText}".`);
      return;
    }

    const stockText = cell('stock');
    const stock = stockText === '' ? 0 : Number(decimalText(stockText));
    if (!Number.isInteger(stock) || stock < 0) {
      fail(`Estoque inválido: "${stockText}".`);
      return;
    }

    const weightText = decimalText(cell('weight'));
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

  return { items, errors, ignored };
}
