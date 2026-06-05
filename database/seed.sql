PRAGMA foreign_keys = OFF;

DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM inventory;
DELETE FROM gold_audit_logs;
DELETE FROM stock_movements;
DELETE FROM refresh_tokens;
DELETE FROM items;
DELETE FROM characters;
DELETE FROM categories;
DELETE FROM rarities;
DELETE FROM users;

DELETE FROM sqlite_sequence WHERE name IN (
  'purchase_items',
  'purchases',
  'inventory',
  'gold_audit_logs',
  'stock_movements',
  'refresh_tokens',
  'items',
  'characters',
  'categories',
  'rarities',
  'users'
);

PRAGMA foreign_keys = ON;

INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Mestre do Cofre', 'mestre@lojarpg.local', 'scrypt$Wbrr8428uiTv9A82oz_n7Q$q4GLTusqxv1L8sy0P_An9-0XFVEMDgjeAeKzIqG2csfRzZXJdCzS4JgTPkxmuajrGJE8sC8KixTHeYxSmXp4ZQ', 'MESTRE'),
  (2, 'Aria', 'aria@lojarpg.local', 'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA', 'JOGADOR'),
  (3, 'Borin', 'borin@lojarpg.local', 'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA', 'JOGADOR'),
  (4, 'Lia', 'lia@lojarpg.local', 'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA', 'JOGADOR');

INSERT INTO categories (id, name) VALUES
  (1, 'Armas'),
  (2, 'Armaduras'),
  (3, 'Pocoes'),
  (4, 'Magicos'),
  (5, 'Equipamentos');

INSERT INTO rarities (id, name, rank) VALUES
  (1, 'Comum', 1),
  (2, 'Incomum', 2),
  (3, 'Raro', 3);

INSERT INTO characters (id, user_id, name, class, race, level, gold) VALUES
  (1, 2, 'Aria Luaferro', 'Ladino', 'Elfo', 4, 250),
  (2, 3, 'Borin Escudoforte', 'Guerreiro', 'Anao', 5, 320),
  (3, 4, 'Lia Brasa', 'Maga', 'Humana', 3, 180);

INSERT INTO items (id, name, category_id, rarity_id, description, price, stock, created_by) VALUES
  (1, 'Espada Longa', 1, 1, 'Uma lamina confiavel para duelos e masmorras.', 75, 5, 1),
  (2, 'Arco Curto', 1, 1, 'Arco simples, leve e facil de carregar.', 45, 6, 1),
  (3, 'Adaga de Prata', 1, 2, 'Boa contra criaturas sensiveis a prata.', 60, 3, 1),
  (4, 'Armadura de Couro Batido', 2, 1, 'Protecao leve para aventureiros discretos.', 90, 4, 1),
  (5, 'Escudo Reforcado', 2, 1, 'Escudo de madeira com aro metalico.', 55, 4, 1),
  (6, 'Pocao de Cura', 3, 1, 'Recupera energia vital em momentos perigosos.', 50, 12, 1),
  (7, 'Pocao de Invisibilidade', 3, 3, 'Concede invisibilidade por curto periodo.', 220, 2, 1),
  (8, 'Pergaminho de Bola de Fogo', 4, 3, 'Pergaminho arcano de uso unico.', 180, 2, 1),
  (9, 'Anel de Protecao Menor', 4, 3, 'Um anel simples com runas protetoras.', 260, 1, 1),
  (10, 'Kit de Aventureiro', 5, 1, 'Corda, pederneira, tocha e pequenas ferramentas.', 35, 8, 1);
