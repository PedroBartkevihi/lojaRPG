# lojaRPG

Loja web para campanhas de Dungeons & Dragons. O Mestre administra itens, estoque, precos, personagens e ouro. Jogadores entram com login, veem a loja, montam carrinho e compram itens usando o ouro do personagem. Todas as informacoes importantes ficam persistidas no banco de dados.

## Tecnologias

- Front-end: React + Vite
- Back-end: Node.js + Express
- Banco de dados: SQLite pelo modulo nativo `node:sqlite`
- Autenticacao: JWT com senha hash usando `crypto.scrypt`
- UI: tema medieval/fantastico com asset local em `frontend/src/assets/shop-background.png`

SQLite foi escolhido para facilitar o desenvolvimento local. O acesso ao banco fica concentrado em `backend/src/models` e as regras em `backend/src/services`, deixando uma futura migracao para PostgreSQL mais simples.

## Estrutura

```text
lojaRPG/
  frontend/
    index.html
    src/
      assets/
      components/
      css/
      js/
      pages/
  backend/
    src/
      server.js
      routes/
      controllers/
      services/
      models/
      middlewares/
      database/
      config/
    .env.example
    package.json
  database/
    schema.sql
    seed.sql
    README.md
  README.md
  .gitignore
```

## Requisitos

- Node.js 24 ou superior
- npm

## Configuracao inicial

Abra dois terminais, um para o back-end e outro para o front-end.

### Back-end

```bash
cd C:\lojaRPG\backend
npm install
copy .env.example .env
npm run db:reset
npm run dev
```

A API ficara em:

```text
http://localhost:3001
```

### Front-end

```bash
cd C:\lojaRPG\frontend
npm install
copy .env.example .env
npm run dev
```

Abra:

```text
http://localhost:5173
```

## Variaveis de ambiente

Back-end (`backend/.env`):

```text
PORT=3001
NODE_ENV=development
JWT_SECRET=troque-este-segredo-em-producao
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
DB_FILE=data/loja-rpg.sqlite
MASTER_REGISTRATION_KEY=chave-dev-para-criar-mestre
```

Front-end (`frontend/.env`):

```text
VITE_API_URL=http://localhost:3001
```

`CORS_ORIGIN` aceita uma lista separada por virgulas.

Nunca envie arquivos `.env` para o repositorio.

## Banco de dados

Os scripts ficam em `database/`.

- `schema.sql`: cria tabelas, chaves, relacionamentos, indices e restricoes.
- `seed.sql`: recria os dados iniciais de desenvolvimento.

Comandos no diretorio `backend`:

```bash
npm run db:init
npm run db:seed
npm run db:reset
```

Use `db:reset` para apagar o banco local e popular tudo novamente.

## Usuarios iniciais

Dados apenas para ambiente de desenvolvimento:

| Perfil | Email | Senha |
| --- | --- | --- |
| Mestre | mestre@lojarpg.local | mestre123 |
| Jogador | aria@lojarpg.local | jogador123 |
| Jogador | borin@lojarpg.local | jogador123 |
| Jogador | lia@lojarpg.local | jogador123 |

## Rotas principais

Autenticacao:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Itens:

- `GET /items`
- `GET /items/:id`
- `POST /items` somente Mestre
- `PUT /items/:id` somente Mestre
- `DELETE /items/:id` somente Mestre

Personagens:

- `GET /characters` somente Mestre
- `GET /characters/me`
- `POST /characters`
- `PUT /characters/:id`
- `PATCH /characters/:id/gold` somente Mestre

Compras:

- `POST /purchases`
- `GET /purchases/me`
- `GET /purchases`

Inventario:

- `GET /inventory/me`
- `GET /inventory/:characterId`

Envie o token JWT no header:

```text
Authorization: Bearer SEU_TOKEN
```

## Funcionalidades implementadas

- Cadastro, login, logout e identificacao do usuario autenticado.
- Hash real de senha com `crypto.scrypt`.
- JWT para proteger rotas.
- Permissoes separadas entre Mestre e Jogador.
- CRUD de itens para o Mestre.
- Busca e filtro de itens por categoria.
- Carrinho de compras para jogadores.
- Compra com validacao de ouro e estoque.
- Compra transacional: desconta ouro, baixa estoque, atualiza inventario e registra historico.
- Inventario do jogador.
- Historico de compras do jogador.
- Historico geral para o Mestre.
- Painel do Mestre para gerenciar itens e ajustar ouro dos personagens.
- Seed com Mestre, tres jogadores, tres personagens e itens iniciais.

## Observacoes de seguranca

- Troque `JWT_SECRET` antes de qualquer hospedagem real.
- Use HTTPS em producao.
- Restrinja a criacao de novos Mestres com `MASTER_REGISTRATION_KEY`.
- Nao publique o arquivo SQLite local nem arquivos `.env`.

## Proximos passos sugeridos

- Criar testes automatizados para services e rotas.
- Adicionar refresh token ou sessao persistente mais robusta.
- Criar auditoria de ajustes de ouro feitos pelo Mestre.
- Adicionar multiplos personagens por jogador.
- Migrar para PostgreSQL usando os models como camada de isolamento.
- Adicionar deploy com variaveis de ambiente por ambiente.
