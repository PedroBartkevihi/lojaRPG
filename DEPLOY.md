# Deploy lojaRPG

## Desenvolvimento local

O passo a passo está na seção "Como rodar localmente" do
[README](./README.md): `docker compose up -d db` na raiz, depois API e
front-end com `npm run dev`. Para desenvolvimento, use
`VITE_API_URL=http://localhost:3001` no `frontend/.env`.

## Versão online (Render + Neon)

A demonstração pública usa os planos gratuitos do Render (API e front-end,
descritos no `render.yaml`) e do Neon (PostgreSQL).

1. No Neon, crie um projeto na região AWS US East 2 (Ohio) e copie a
   connection string direta, sem pooling. Ela tem o formato
   `postgresql://usuario:senha@host/banco?sslmode=require`. A região é a mesma
   da API no Render (`region: ohio` no `render.yaml`), que não oferece
   servidores na América do Sul: uma compra faz mais de dez consultas ao banco,
   então o banco precisa ficar ao lado da API, e não do usuário. Se usar outra
   região no Neon, ajuste o `region` da API para a região do Render mais
   próxima.
2. No Render, crie um Blueprint a partir deste repositório (branch `main`).
   Ele lê o `render.yaml` e pede três valores:
   - `DATABASE_URL`: a connection string do Neon.
   - `CORS_ORIGIN`: a URL do front-end, `https://lojarpg-web.onrender.com`.
   - `VITE_API_URL`: a URL da API, `https://lojarpg-api.onrender.com`.

   Se o Render acrescentar um sufixo aos nomes por já estarem em uso, ajuste
   esses dois valores depois e refaça o deploy do front-end.
3. `JWT_SECRET` e `MASTER_REGISTRATION_KEY` são gerados pelo próprio Render.

Limites do plano gratuito:

- A API dorme após 15 minutos sem acesso e leva cerca de 1 minuto para
  acordar; a primeira requisição depois disso fica lenta.
- Com `DEMO_RESET_ON_START=true` (padrão do `render.yaml`), o seed recria os
  dados de demonstração sempre que a API inicia. Cadastros e compras feitos na
  demonstração somem quando ela volta a dormir. Para manter os dados, mude
  essa variável para `false` no painel do Render.

## Produção local com Docker

Na raiz do projeto, crie o `.env` com os segredos (o Git ignora esse arquivo):

```bash
cp .env.example .env
```

Preencha `JWT_SECRET` (pelo menos 32 caracteres) e `MASTER_REGISTRATION_KEY`
(pelo menos 16) com valores aleatórios, gerados por exemplo com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Sem esses valores a API recusa iniciar, assim como com valores curtos ou iguais
aos exemplos do repositório. Depois:

```bash
docker compose up --build
```

Serviços:

- Front-end: `http://localhost:8080`
- API: `http://localhost:3001`
- Banco PostgreSQL: volume Docker `loja_rpg_pgdata`

Antes de usar em produção fora da sua máquina, ajuste também:

- `CORS_ORIGIN`
- `VITE_API_URL`

## Outras hospedagens

Opções comuns:

- Front-end: Render (static site), Vercel, Netlify, Cloudflare Pages ou Nginx.
- API: Render, Railway, Fly.io, VPS, Docker Swarm ou Kubernetes.
- Banco: qualquer PostgreSQL, como Neon, Supabase ou o do próprio provedor.

Se hospedar front-end e API separadamente:

1. Configure `VITE_API_URL` no build do front-end com a URL pública da API.
2. Configure `CORS_ORIGIN` na API com a URL pública do front-end.
3. Use HTTPS em ambos.
4. Gere um `JWT_SECRET` longo e único.
5. Proteja `MASTER_REGISTRATION_KEY`.

## Prisma em ambientes

Comandos úteis no diretório `backend`:

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
npx prisma db seed
```

Em produção, rode as migrations antes de subir a nova versão (o
`render.yaml` e o Dockerfile já fazem isso ao iniciar a API):

```bash
npx prisma migrate deploy
```

A migration inicial cria todas as tabelas com as regras `CHECK` de ouro,
estoque, nível e quantidades. Dados de um banco SQLite das versões antigas não
são migrados; o seed recria os dados de demonstração.

## Backup do PostgreSQL

Banco do Docker:

```bash
docker compose exec db pg_dump -U lojarpg lojarpg > backup-lojarpg.sql
```

Em um PostgreSQL hospedado, use `pg_dump` com a URL do banco ou o backup do
próprio provedor.

## Logs

- Desenvolvimento: a saída do `npm run dev` no diretório `backend`.
- Docker: `docker compose logs -f backend` e `docker compose logs -f frontend`.
- Render: aba Logs de cada serviço no painel.

A API evita retornar detalhes internos em erros 500.
