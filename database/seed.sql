PRAGMA foreign_keys = OFF;

DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM inventory;
DELETE FROM items;
DELETE FROM characters;
DELETE FROM users;

DELETE FROM sqlite_sequence WHERE name IN ('purchase_items', 'purchases', 'inventory', 'items', 'characters', 'users');

PRAGMA foreign_keys = ON;

INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Mestre do Cofre', 'mestre@lojarpg.local', 'scrypt$Wbrr8428uiTv9A82oz_n7Q$q4GLTusqxv1L8sy0P_An9-0XFVEMDgjeAeKzIqG2csfRzZXJdCzS4JgTPkxmuajrGJE8sC8KixTHeYxSmXp4ZQ', 'MESTRE'),
  (2, 'Aria', 'aria@lojarpg.local', 'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA', 'JOGADOR'),
  (3, 'Borin', 'borin@lojarpg.local', 'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA', 'JOGADOR'),
  (4, 'Lia', 'lia@lojarpg.local', 'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA', 'JOGADOR');

INSERT INTO characters (id, user_id, name, class, race, level, gold) VALUES
  (1, 2, 'Aria Luaferro', 'Ladino', 'Elfo', 4, 250),
  (2, 3, 'Borin Escudoforte', 'Guerreiro', 'Anao', 5, 320),
  (3, 4, 'Lia Brasa', 'Maga', 'Humana', 3, 180);

INSERT INTO items (id, name, category, description, price, rarity, stock, created_by) VALUES
  (1, 'Espada Longa', 'Armas', 'Uma lamina confiavel para duelos e masmorras.', 75, 'Comum', 5, 1),
  (2, 'Arco Curto', 'Armas', 'Arco simples, leve e facil de carregar.', 45, 'Comum', 6, 1),
  (3, 'Adaga de Prata', 'Armas', 'Boa contra criaturas sensiveis a prata.', 60, 'Incomum', 3, 1),
  (4, 'Armadura de Couro Batido', 'Armaduras', 'Protecao leve para aventureiros discretos.', 90, 'Comum', 4, 1),
  (5, 'Escudo Reforcado', 'Armaduras', 'Escudo de madeira com aro metalico.', 55, 'Comum', 4, 1),
  (6, 'Pocao de Cura', 'Pocoes', 'Recupera energia vital em momentos perigosos.', 50, 'Comum', 12, 1),
  (7, 'Pocao de Invisibilidade', 'Pocoes', 'Concede invisibilidade por curto periodo.', 220, 'Raro', 2, 1),
  (8, 'Pergaminho de Bola de Fogo', 'Magicos', 'Pergaminho arcano de uso unico.', 180, 'Raro', 2, 1),
  (9, 'Anel de Protecao Menor', 'Magicos', 'Um anel simples com runas protetoras.', 260, 'Raro', 1, 1),
  (10, 'Kit de Aventureiro', 'Equipamentos', 'Corda, pederneira, tocha e pequenas ferramentas.', 35, 'Comum', 8, 1);
