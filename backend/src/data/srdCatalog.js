// Pacotes prontos de itens a partir do equipamento do SRD 5.1, para o Mestre
// importar em vez de cadastrar item a item. Precos em PC (1 PO = 100 PC), peso
// em libras, dano e classe de armadura como no livro. Nomes e propriedades
// traduzidos e adaptados; distancias em metros (1,5 m a cada 5 pes).
//
// O SRD 5.1 e licenciado sob CC-BY-4.0, que exige a atribuicao abaixo; ela
// aparece na tela de importacao e no README.
export const SRD_ATTRIBUTION =
  'Este conteúdo inclui material do System Reference Document 5.1 ("SRD 5.1") da Wizards of the Coast LLC, ' +
  'disponível em https://dnd.wizards.com/resources/systems-reference-document. O SRD 5.1 é licenciado sob a ' +
  'Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode). ' +
  'Nomes e textos traduzidos e adaptados.';

const PC = 1;
const PP = 10;
const PO = 100;

function weapon(name, price, damage, weight, properties, stock = 3) {
  return { name, category: 'Armas', rarity: 'Comum', price, weight, damage, armorClass: '', description: properties, stock };
}

function armor(name, price, armorClass, weight, notes, stock = 2) {
  return { name, category: 'Armaduras', rarity: 'Comum', price, weight, damage: '', armorClass, description: notes, stock };
}

function gear(name, price, weight, description, stock = 10, category = 'Equipamentos') {
  return { name, category, rarity: 'Comum', price, weight, damage: '', armorClass: '', description, stock };
}

const SIMPLE_WEAPONS = [
  weapon('Clava', 1 * PP, '1d4 contundente', 2, 'Arma simples corpo a corpo. Leve.'),
  weapon('Adaga', 2 * PO, '1d4 perfurante', 1, 'Arma simples corpo a corpo. Acuidade, leve, arremesso (6/18 m).'),
  weapon('Clava grande', 2 * PP, '1d8 contundente', 10, 'Arma simples corpo a corpo. Duas mãos.'),
  weapon('Machadinha', 5 * PO, '1d6 cortante', 2, 'Arma simples corpo a corpo. Leve, arremesso (6/18 m).'),
  weapon('Azagaia', 5 * PP, '1d6 perfurante', 2, 'Arma simples corpo a corpo. Arremesso (9/36 m).'),
  weapon('Martelo leve', 2 * PO, '1d4 contundente', 2, 'Arma simples corpo a corpo. Leve, arremesso (6/18 m).'),
  weapon('Maça', 5 * PO, '1d6 contundente', 4, 'Arma simples corpo a corpo.'),
  weapon('Bordão', 2 * PP, '1d6 contundente', 4, 'Arma simples corpo a corpo. Versátil (1d8).'),
  weapon('Foice curta', 1 * PO, '1d4 cortante', 2, 'Arma simples corpo a corpo. Leve.'),
  weapon('Lança', 1 * PO, '1d6 perfurante', 3, 'Arma simples corpo a corpo. Arremesso (6/18 m), versátil (1d8).'),
  weapon('Besta leve', 25 * PO, '1d8 perfurante', 5, 'Arma simples à distância. Munição (24/96 m), recarga, duas mãos.'),
  weapon('Dardo', 5 * PC, '1d4 perfurante', 0.25, 'Arma simples à distância. Acuidade, arremesso (6/18 m).', 10),
  weapon('Arco curto', 25 * PO, '1d6 perfurante', 2, 'Arma simples à distância. Munição (24/96 m), duas mãos.'),
  weapon('Funda', 1 * PP, '1d4 contundente', 0, 'Arma simples à distância. Munição (9/36 m).')
];

const MARTIAL_WEAPONS = [
  weapon('Machado de batalha', 10 * PO, '1d8 cortante', 4, 'Arma marcial corpo a corpo. Versátil (1d10).'),
  weapon('Mangual', 10 * PO, '1d8 contundente', 2, 'Arma marcial corpo a corpo.'),
  weapon('Glaive', 20 * PO, '1d10 cortante', 6, 'Arma marcial corpo a corpo. Pesada, alcance, duas mãos.'),
  weapon('Machado grande', 30 * PO, '1d12 cortante', 7, 'Arma marcial corpo a corpo. Pesada, duas mãos.'),
  weapon('Espada grande', 50 * PO, '2d6 cortante', 6, 'Arma marcial corpo a corpo. Pesada, duas mãos.'),
  weapon('Alabarda', 20 * PO, '1d10 cortante', 6, 'Arma marcial corpo a corpo. Pesada, alcance, duas mãos.'),
  weapon('Lança de montaria', 10 * PO, '1d12 perfurante', 6, 'Arma marcial corpo a corpo. Alcance, especial (desvantagem contra alvo a até 1,5 m; duas mãos fora da montaria).'),
  weapon('Espada longa', 15 * PO, '1d8 cortante', 3, 'Arma marcial corpo a corpo. Versátil (1d10).'),
  weapon('Malho', 10 * PO, '2d6 contundente', 10, 'Arma marcial corpo a corpo. Pesada, duas mãos.'),
  weapon('Maça estrela', 15 * PO, '1d8 perfurante', 4, 'Arma marcial corpo a corpo.'),
  weapon('Pique', 5 * PO, '1d10 perfurante', 18, 'Arma marcial corpo a corpo. Pesada, alcance, duas mãos.'),
  weapon('Rapieira', 25 * PO, '1d8 perfurante', 2, 'Arma marcial corpo a corpo. Acuidade.'),
  weapon('Cimitarra', 25 * PO, '1d6 cortante', 3, 'Arma marcial corpo a corpo. Acuidade, leve.'),
  weapon('Espada curta', 10 * PO, '1d6 perfurante', 2, 'Arma marcial corpo a corpo. Acuidade, leve.'),
  weapon('Tridente', 5 * PO, '1d6 perfurante', 4, 'Arma marcial corpo a corpo. Arremesso (6/18 m), versátil (1d8).'),
  weapon('Picareta de guerra', 5 * PO, '1d8 perfurante', 2, 'Arma marcial corpo a corpo.'),
  weapon('Martelo de guerra', 15 * PO, '1d8 contundente', 2, 'Arma marcial corpo a corpo. Versátil (1d10).'),
  weapon('Chicote', 2 * PO, '1d4 cortante', 3, 'Arma marcial corpo a corpo. Acuidade, alcance.'),
  weapon('Zarabatana', 10 * PO, '1 perfurante', 1, 'Arma marcial à distância. Munição (7,5/30 m), recarga.'),
  weapon('Besta de mão', 75 * PO, '1d6 perfurante', 3, 'Arma marcial à distância. Munição (9/36 m), leve, recarga.'),
  weapon('Besta pesada', 50 * PO, '1d10 perfurante', 18, 'Arma marcial à distância. Munição (30/120 m), pesada, recarga, duas mãos.'),
  weapon('Arco longo', 50 * PO, '1d8 perfurante', 2, 'Arma marcial à distância. Munição (45/180 m), pesada, duas mãos.'),
  weapon('Rede', 1 * PO, '', 3, 'Arma marcial à distância. Especial (contém uma criatura Grande ou menor), arremesso (1,5/4,5 m).')
];

const ARMOR = [
  armor('Armadura acolchoada', 5 * PO, '11 + Des', 8, 'Armadura leve. Desvantagem em Furtividade.'),
  armor('Armadura de couro', 10 * PO, '11 + Des', 10, 'Armadura leve.'),
  armor('Armadura de couro batido', 45 * PO, '12 + Des', 13, 'Armadura leve.'),
  armor('Gibão de peles', 10 * PO, '12 + Des (máx. 2)', 12, 'Armadura média.'),
  armor('Camisão de malha', 50 * PO, '13 + Des (máx. 2)', 20, 'Armadura média.'),
  armor('Brunea', 50 * PO, '14 + Des (máx. 2)', 45, 'Armadura média. Desvantagem em Furtividade.'),
  armor('Peitoral', 400 * PO, '14 + Des (máx. 2)', 20, 'Armadura média.'),
  armor('Meia-armadura', 750 * PO, '15 + Des (máx. 2)', 40, 'Armadura média. Desvantagem em Furtividade.'),
  armor('Cota de anéis', 30 * PO, '14', 40, 'Armadura pesada. Desvantagem em Furtividade.'),
  armor('Cota de malha', 75 * PO, '16', 55, 'Armadura pesada. Exige Força 13. Desvantagem em Furtividade.'),
  armor('Cota de talas', 200 * PO, '17', 60, 'Armadura pesada. Exige Força 15. Desvantagem em Furtividade.'),
  armor('Armadura de placas', 1500 * PO, '18', 65, 'Armadura pesada. Exige Força 15. Desvantagem em Furtividade.', 1),
  armor('Escudo', 10 * PO, '+2', 6, 'Escudo: soma 2 à classe de armadura.', 4)
];

const ADVENTURING_GEAR = [
  gear('Mochila', 2 * PO, 5, 'Carrega 1 pé cúbico ou 30 libras de equipamento.'),
  gear('Saco de dormir', 1 * PO, 7, 'Para descansar ao relento.'),
  gear('Cobertor', 5 * PP, 3, 'Cobertor de lã.'),
  gear('Vela', 1 * PC, 0, 'Ilumina 1,5 m de luz plena por 1 hora.', 20),
  gear('Kit de escalada', 25 * PO, 12, 'Pítons, pontas de bota, luvas e arnês.', 3),
  gear('Pé de cabra', 2 * PO, 5, 'Vantagem em testes de Força quando a alavanca ajuda.'),
  gear('Gancho de escalada', 2 * PO, 4, 'Para prender a corda.'),
  gear('Martelo', 1 * PO, 3, 'Martelo de ferramenta.'),
  gear('Kit de curandeiro', 5 * PO, 3, '10 usos. Estabiliza uma criatura com 0 pontos de vida sem teste de Sabedoria (Medicina).', 5),
  gear('Armadilha de caça', 5 * PO, 25, 'Prende quem pisa nela (CD 13 para se soltar).', 3),
  gear('Lamparina', 5 * PP, 1, 'Luz plena em 4,5 m por 6 horas com um frasco de óleo.'),
  gear('Lanterna furta-fogo', 10 * PO, 2, 'Luz plena num cone de 18 m por 6 horas com um frasco de óleo.', 5),
  gear('Lanterna coberta', 5 * PO, 2, 'Luz plena em 9 m por 6 horas com um frasco de óleo.', 5),
  gear('Algemas', 2 * PO, 6, 'Prendem uma criatura Pequena ou Média (CD 20 para escapar).', 5),
  gear('Kit de refeição', 2 * PP, 1, 'Caneca, prato e talheres.'),
  gear('Espelho de aço', 5 * PO, 0.5, 'Espelho de mão.'),
  gear('Óleo (frasco)', 1 * PP, 1, 'Combustível de lamparina; pode ser arremessado e incendiado.', 20),
  gear('Pítons', 5 * PC, 0.25, 'Grampo de ferro para escalada.', 20),
  gear('Rações de viagem (1 dia)', 5 * PP, 2, 'Comida seca para um dia.', 30),
  gear('Corda de cânhamo (15 m)', 1 * PO, 10, '2 pontos de vida; CD 17 para romper.'),
  gear('Corda de seda (15 m)', 10 * PO, 5, '2 pontos de vida; CD 17 para romper.', 5),
  gear('Pá', 2 * PO, 5, 'Pá de cavar.'),
  gear('Apito de sinalização', 5 * PC, 0, 'Apito agudo.'),
  gear('Isqueiro (pederneira)', 5 * PP, 1, 'Acende uma tocha ou fogueira em uma ação.'),
  gear('Tocha', 1 * PC, 1, 'Luz plena em 6 m por 1 hora.', 20),
  gear('Odre', 2 * PP, 5, 'Guarda 2 litros de líquido (peso cheio).'),
  gear('Livro de magias', 50 * PO, 3, 'Livro de couro com 100 páginas de pergaminho.', 2),
  gear('Flechas (20)', 1 * PO, 1, 'Munição para arcos.', 10),
  gear('Virotes de besta (20)', 1 * PO, 1.5, 'Munição para bestas.', 10),
  gear('Balas de funda (20)', 4 * PC, 1.5, 'Munição para fundas.', 10),
  gear('Bolsa de componentes', 25 * PO, 2, 'Componentes materiais de magias sem custo indicado.', 3),
  gear('Símbolo sagrado (amuleto)', 5 * PO, 1, 'Foco de conjuração divina.', 3),
  gear('Ferramentas de ladrão', 25 * PO, 1, 'Para abrir fechaduras e desarmar armadilhas.', 3),
  gear('Esferas de metal (bolsa com 1.000)', 1 * PO, 2, 'Espalhadas, cobrem um quadrado de 3 m (CD 10 de Destreza para não cair).', 5),
  gear('Estrepes (bolsa com 20)', 1 * PO, 2, 'Cobrem um quadrado de 1,5 m e ferem quem passa.', 5),
  gear('Tinta (frasco de 30 ml)', 10 * PO, 0, 'Tinta para escrever.', 5),
  gear('Pergaminho (folha)', 1 * PP, 0, 'Folha de pergaminho.', 20),
  gear('Pacote de explorador', 10 * PO, 59, 'Mochila, saco de dormir, kit de refeição, isqueiro, 10 tochas, 10 dias de rações, odre e 15 m de corda de cânhamo.', 3),
  gear('Pacote de aventureiro de masmorra', 12 * PO, 61.5, 'Mochila, pé de cabra, martelo, 10 pítons, 10 tochas, isqueiro, 10 dias de rações, odre e 15 m de corda de cânhamo.', 3),
  gear('Pacote de assaltante', 16 * PO, 44.5, 'Mochila, esferas de metal, barbante, sino, 5 velas, pé de cabra, martelo, 10 pítons, lanterna coberta, 2 frascos de óleo, 5 dias de rações, isqueiro, odre e 15 m de corda de cânhamo.', 3)
];

const POTIONS_AND_ALCHEMY = [
  gear('Poção de cura', 50 * PO, 0.5, 'Recupera 2d4 + 2 pontos de vida.', 5, 'Poções'),
  gear('Ácido (frasco)', 25 * PO, 1, 'Arremessado: 2d6 de dano de ácido.', 5, 'Poções'),
  gear('Fogo alquímico (frasco)', 50 * PO, 1, 'Arremessado: 1d4 de dano de fogo no início de cada turno do alvo, até apagar (CD 10).', 5, 'Poções'),
  gear('Antitoxina (frasco)', 50 * PO, 0, 'Vantagem em testes de resistência contra veneno por 1 hora.', 5, 'Poções'),
  gear('Água benta (frasco)', 25 * PO, 1, 'Arremessada: 2d6 de dano radiante em corruptores e mortos-vivos.', 5, 'Poções'),
  gear('Veneno básico (frasco)', 100 * PO, 0, 'Cobre uma arma ou até três munições por 1 minuto: 1d4 de dano de veneno (CD 10).', 3, 'Poções')
];

export const SRD_PACKS = [
  {
    id: 'equipamento',
    name: 'Equipamento de aventura',
    description: 'Mochilas, cordas, tochas, rações, munição, ferramentas e os pacotes iniciais.',
    items: ADVENTURING_GEAR
  },
  {
    id: 'armas',
    name: 'Armas simples e marciais',
    description: 'As armas do livro, com dano, peso e propriedades.',
    items: [...SIMPLE_WEAPONS, ...MARTIAL_WEAPONS]
  },
  {
    id: 'armaduras',
    name: 'Armaduras e escudo',
    description: 'Armaduras leves, médias e pesadas, com a classe de armadura de cada uma.',
    items: ARMOR
  },
  {
    id: 'pocoes',
    name: 'Poções e alquimia',
    description: 'Poção de cura, ácido, fogo alquímico, antitoxina, água benta e veneno básico.',
    items: POTIONS_AND_ALCHEMY
  }
];
