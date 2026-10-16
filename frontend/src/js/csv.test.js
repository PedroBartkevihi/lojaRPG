import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, csvToItems, parseCsv } from './csv.js';

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
    expect(items[2]).toMatchObject({ line: 4, price: 350050, armorClass: '+1', requiresAttunement: true, weight: null });
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
});
