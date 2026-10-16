import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, csvToItems, decodeCsv, parseCsv } from './csv.js';

describe('parseCsv', () => {
  it('lê ponto e vírgula do Excel, aspas, quebras de linha e o BOM', () => {
    const text = String.fromCharCode(0xfeff) + 'nome;descricao\r\n"Corda; de seda";"Linha 1\nLinha 2 com ""aspas"""\r\n\r\nTocha;Simples\r\n';
    expect(parseCsv(text)).toEqual([
      ['nome', 'descricao'],
      ['Corda; de seda', 'Linha 1\nLinha 2 com "aspas"'],
      ['Tocha', 'Simples']
    ]);
  });

  it('descobre a vírgula como separador', () => {
    expect(parseCsv('nome,preco\n"Adaga, de prata",60')).toEqual([
      ['nome', 'preco'],
      ['Adaga, de prata', '60']
    ]);
  });
});

describe('csvToItems', () => {
  it('converte o modelo em itens com preço em PC e a linha da planilha', () => {
    const { items, errors } = csvToItems(CSV_TEMPLATE);

    expect(errors).toEqual([]);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ line: 2, name: 'Espada longa', category: 'Armas', price: 1500, stock: 3, weight: 3, damage: '1d8 cortante', requiresAttunement: false });
    expect(items[2]).toMatchObject({ line: 4, price: 350050, armorClass: 'bônus +1', requiresAttunement: true, weight: null });
    // Nenhuma célula começa com "+": o Excel leria como número ou fórmula.
    expect(CSV_TEMPLATE.split(/[;\r\n]+/).filter((cell) => /^[+=@-]/.test(cell))).toEqual([]);
  });

  it('aceita cabeçalhos com acento e em inglês, e usa Comum sem raridade', () => {
    const { items } = csvToItems('Nome,Categoria,Preço,Peso\nMapa,Equipamentos,"1,5","0,5"');
    expect(items[0]).toMatchObject({ name: 'Mapa', rarity: 'Comum', price: 150, weight: 0.5, stock: 0 });
  });

  it('aponta a linha de cada erro e as colunas que faltam', () => {
    expect(csvToItems('nome;preco\nAdaga;2').errors).toEqual([{ line: 1, message: 'Faltam as colunas: categoria.' }]);

    const { items, errors } = csvToItems('nome;categoria;preco;estoque;sintonizacao\nA;Armas;dez;1;\nB;Armas;1;-2;\nC;Armas;1;1;talvez\nD;Armas;1;1;sim');
    expect(errors).toEqual([
      { line: 2, message: 'Preço inválido: "dez". Use PO, como 15 ou 2,5.' },
      { line: 3, message: 'Estoque inválido: "-2".' },
      { line: 4, message: 'Sintonização deve ser "sim" ou "não", e não "talvez".' }
    ]);
    expect(items.map((item) => item.name)).toEqual(['D']);
  });

  it('lê o ponto de milhar do Brasil e mantém o ponto decimal', () => {
    const { items, errors } = csvToItems('nome;categoria;preco;estoque;peso\nPlacas;Armaduras;1.500;1.000;65\nMapa;Equipamentos;2.5;3;0.5\nCofre;Equipamentos;1.250,5;1;1,5');
    expect(errors).toEqual([]);
    expect(items.map(({ price, stock, weight }) => ({ price, stock, weight }))).toEqual([
      { price: 150000, stock: 1000, weight: 65 },
      { price: 250, stock: 3, weight: 0.5 },
      { price: 125050, stock: 1, weight: 1.5 }
    ]);
  });

  it('conta as linhas em branco no número da linha do erro', () => {
    const { errors } = csvToItems('nome;categoria;preco\nA;Armas;1\n;;\n\nB;Armas;x');
    expect(errors).toEqual([{ line: 5, message: 'Preço inválido: "x". Use PO, como 15 ou 2,5.' }]);
  });

  it('recusa aspas que nunca fecham em vez de juntar o resto da planilha num campo', () => {
    const { items, errors } = csvToItems('nome;categoria;preco;descricao\nA;Armas;1;"abc\nB;Armas;2;def\nC;Armas;3;ghi');
    expect(items).toEqual([]);
    expect(errors).toEqual([{ line: 2, message: 'Aspas abertas sem fechar a partir desta linha. Feche as aspas e importe de novo.' }]);
  });

  it('aceita nomes de coluna com a unidade e avisa as colunas que ficaram de fora', () => {
    const { items, ignored } = csvToItems('Nome;Categoria;Preço (PO);Preço de venda (PO);Estoque inicial;Origem\nTocha;Equipamentos;1;0,5;10;Porto');
    expect(items[0]).toMatchObject({ price: 100, sellPrice: 50, stock: 10 });
    expect(ignored).toEqual(['Origem']);
  });
});

describe('decodeCsv', () => {
  it('lê UTF-8 e, se os bytes não forem UTF-8, o CSV comum do Excel (Windows-1252)', () => {
    const utf8 = new TextEncoder().encode('nome;categoria\nPoção;Poções');
    // "Poção;Poções" em Windows-1252: ç = 0xE7, ã = 0xE3, õ = 0xF5.
    const ansi = new Uint8Array([...new TextEncoder().encode('nome;categoria\nPo'), 0xe7, 0xe3, 0x6f, ...new TextEncoder().encode(';Po'), 0xe7, 0xf5, 0x65, 0x73]);
    expect(decodeCsv(utf8.buffer)).toBe('nome;categoria\nPoção;Poções');
    expect(decodeCsv(ansi.buffer)).toBe('nome;categoria\nPoção;Poções');
  });
});
