# lojaRPG

Aplicacao web para uma loja de campanha de RPG. O Mestre administra itens,
categorias, raridades, estoque, personagens e ouro. Jogadores escolhem o
personagem ativo, montam carrinho e compram itens com o ouro daquele
personagem. Inventario e historico de compras ficam separados por personagem.

## Stack

- Front-end: React, Vite e React Router.
- Back-end: Node.js, Express, validacao com Zod, JWT access token + refresh token.
- Banco: SQLite com Prisma Client e migrations versionadas.
- Testes: Vitest, Supertest e Testing Library.
- Deploy: Dockerfile para API, Dockerfile para front-end e docker compose.

## Estrutura

```text
lojaRPG/
  backend/
    prisma/
      migrations/
      schema.prisma
      seed.js
    src/
      controllers/
      database/
      middlewares/
      models/
      routes/
      services/
      utils/
    tests/
  frontend/
    src/
      components/
      css/
      js/
      pages/
      test/
  DEPLOY.md
  docker-compose.yml
```

## Desenvolvimento

Back-end:

```bash
cd C:\lojaRPG\backend
npm install
copy .env.example .env
npx prisma generate
npm run db:reset
npm run dev
```

Front-end:

```bash
cd C:\lojaRPG\frontend
npm install
copy .env.example .env
npm run dev
```

Em desenvolvimento, ajuste `frontend/.env` para:

```text
VITE_API_URL=http://localhost:3001
```

URLs locais:

- API: `http://localhost:3001`
- Front-end: `http://localhost:5173`

## Testes

Back-end:

```bash
cd C:\lojaRPG\backend
npm test
npm run test:watch
npm run test:coverage
```

Front-end:

```bash
cd C:\lojaRPG\frontend
npm test
npm run test:watch
npm run test:coverage
```

A suite do back-end cobre login, autorizacao de Mestre/Jogador, CRUD de itens,
compra sem ouro, compra sem estoque, inventario apos compra, auditoria de ouro,
rotas protegidas, validacao das entradas, compras simultaneas (inclusive com
ajuste de ouro e edicao de item pelo Mestre ao mesmo tempo) e as regras CHECK
do banco. Ela cria o banco de teste pelas
mesmas migrations e seed do Prisma usados no desenvolvimento. A suite do
front-end cobre comportamento basico de carrinho e selecao/criacao de
personagem.

## Prisma

Comandos principais no diretorio `backend`:

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
npx prisma db seed
```

As migrations em `backend/prisma/migrations` sao a unica definicao do banco.
Regras que o Prisma nao descreve no `schema.prisma`, como os `CHECK` de ouro,
estoque e nivel, ficam escritas no SQL das migrations.

Scripts do diretorio `backend`:

- `npm run db:init`: aplica as migrations pendentes.
- `npm run db:seed`: insere os dados iniciais de `prisma/seed.js`.
- `npm run db:reset`: apaga o banco local, reaplica as migrations e roda o seed.

## Usuarios iniciais

| Perfil | Email | Senha |
| --- | --- | --- |
| Mestre | mestre@lojarpg.local | mestre123 |
| Jogador | aria@lojarpg.local | jogador123 |
| Jogador | borin@lojarpg.local | jogador123 |
| Jogador | lia@lojarpg.local | jogador123 |

## Funcionalidades

- Cadastro, login, refresh token e logout com revogacao do refresh token.
- Access token curto, Helmet e rate limit nas rotas sensiveis de autenticacao.
- Permissoes separadas entre Mestre e Jogador.
- Multiplos personagens por jogador.
- Compra associada ao personagem ativo.
- Inventario e historico de compras separados por personagem.
- CRUD de itens, categorias e raridades para Mestre.
- Reativacao de item removido.
- Historico de estoque.
- Auditoria de ajuste manual de ouro com motivo obrigatorio.
- Painel do Mestre com filtros por nome, categoria, raridade e status.
- Rotas reais no front-end com protecao por autenticacao e perfil.

## Rotas principais

Autenticacao:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Catalogo e itens:

- `GET /items`
- `POST /items` somente Mestre
- `PUT /items/:id` somente Mestre
- `DELETE /items/:id` somente Mestre
- `PATCH /items/:id/reactivate` somente Mestre
- `GET /catalog/categories`
- `POST|PUT|DELETE /catalog/categories` somente Mestre para escrita
- `GET /catalog/rarities`
- `POST|PUT|DELETE /catalog/rarities` somente Mestre para escrita
- `GET /catalog/stock-movements` somente Mestre

Personagens:

- `GET /characters` somente Mestre
- `GET /characters/me`
- `POST /characters`
- `PUT /characters/:id`
- `PATCH /characters/:id/gold` somente Mestre, com `reason`
- `GET /characters/gold-audit` somente Mestre

Compras e inventario:

- `POST /purchases`
- `GET /purchases/me?characterId=ID`
- `GET /purchases` somente Mestre
- `GET /inventory/me?characterId=ID`
- `GET /inventory/:characterId`

## Deploy

Consulte [DEPLOY.md](./DEPLOY.md) para Docker, producao local, hospedagem real,
variaveis de ambiente e backup do banco.
