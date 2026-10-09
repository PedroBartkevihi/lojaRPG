# Deploy lojaRPG

## Desenvolvimento local

Banco (PostgreSQL no Docker, na raiz do projeto):

```bash
cd C:\lojaRPG
docker compose up -d db
```

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

Para desenvolvimento, use `VITE_API_URL=http://localhost:3001` no
`frontend/.env`.

## Producao local com Docker

Na raiz do projeto, crie o `.env` com os segredos (o Git ignora esse arquivo):

```bash
cd C:\lojaRPG
copy .env.example .env
```

Preencha `JWT_SECRET` (pelo menos 32 caracteres) e `MASTER_REGISTRATION_KEY`
(pelo menos 16) com valores aleatorios, gerados por exemplo com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Sem esses valores a API recusa iniciar, assim como com valores curtos ou iguais
aos exemplos do repositorio. Depois:

```bash
docker compose up --build
```

Servicos:

- Front-end: `http://localhost:8080`
- API: `http://localhost:3001`
- Banco PostgreSQL: volume Docker `loja_rpg_pgdata`

Antes de usar em producao fora da sua maquina, ajuste tambem:

- `CORS_ORIGIN`
- `VITE_API_URL`

## Versao online (Render + Neon)

A demonstracao publica usa os planos gratuitos do Render (API e front-end,
descritos no `render.yaml`) e do Neon (PostgreSQL).

1. No Neon, crie um projeto (de preferencia na regiao AWS US East, perto do
   Render) e copie a connection string direta, sem pooling. Ela tem o formato
   `postgresql://usuario:senha@host/banco?sslmode=require`.
2. No Render, crie um Blueprint a partir deste repositorio (branch `main`).
   Ele le o `render.yaml` e pede tres valores:
   - `DATABASE_URL`: a connection string do Neon.
   - `CORS_ORIGIN`: a URL do front-end, `https://lojarpg-web.onrender.com`.
   - `VITE_API_URL`: a URL da API, `https://lojarpg-api.onrender.com`.
   Se o Render acrescentar um sufixo aos nomes por ja estarem em uso, ajuste
   esses dois valores depois e refaca o deploy do front-end.
3. `JWT_SECRET` e `MASTER_REGISTRATION_KEY` sao gerados pelo proprio Render.

Limites do plano gratuito:

- A API dorme apos 15 minutos sem acesso e leva cerca de 1 minuto para
  acordar; a primeira requisicao depois disso fica lenta.
- Com `DEMO_RESET_ON_START=true` (padrao do `render.yaml`), o seed recria os
  dados de demonstracao sempre que a API inicia. Cadastros e compras feitos na
  demonstracao somem quando ela volta a dormir. Para manter os dados, mude
  essa variavel para `false` no painel do Render.

## Producao real

Opcoes comuns:

- Front-end: Render (static site), Vercel, Netlify, Cloudflare Pages ou Nginx.
- API: Render, Railway, Fly.io, VPS, Docker Swarm ou Kubernetes.
- Banco: qualquer PostgreSQL, como Neon, Supabase ou o do proprio provedor.

Se hospedar front-end e API separadamente:

1. Configure `VITE_API_URL` no build do front-end com a URL publica da API.
2. Configure `CORS_ORIGIN` na API com a URL publica do front-end.
3. Use HTTPS em ambos.
4. Gere um `JWT_SECRET` longo e unico.
5. Proteja `MASTER_REGISTRATION_KEY`.

## Prisma em ambientes

Comandos uteis no diretorio `backend`:

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
npx prisma db seed
```

Em producao, rode migrations de forma controlada antes de subir a nova versao:

```bash
npx prisma migrate deploy
```

A migration inicial cria todas as tabelas com as regras `CHECK` de ouro,
estoque, nivel e quantidades. Dados de um banco SQLite das versoes antigas nao
sao migrados; o seed recria os dados de demonstracao.

## Backup do PostgreSQL

Banco do Docker:

```bash
docker compose exec db pg_dump -U lojarpg lojarpg > backup-lojarpg.sql
```

Em um PostgreSQL hospedado, use `pg_dump` com a URL do banco ou o backup do
proprio provedor.

## Logs

Desenvolvimento:

```bash
cd C:\lojaRPG\backend
npm run dev
```

Docker:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

Para producao real, envie logs do container para o provedor ou para um
agregador externo. A API evita retornar detalhes internos em erros 500.
