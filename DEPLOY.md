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
3. O `JWT_SECRET` é gerado pelo próprio Render.
4. `TRUST_PROXY` diz quantos proxies do Render ficam na frente da API, para o
   rate limit enxergar o IP de cada usuário. Depois do deploy, procure no log
   da API a linha `X-Forwarded-For com N endereco(s)` e confira se `N` é o
   valor do `render.yaml`. Um valor menor faz os usuários dividirem o mesmo
   limite; um maior deixa o cliente forjar o próprio IP.

Limites do plano gratuito:

- A API dorme após 15 minutos sem acesso e leva cerca de 1 minuto para
  acordar; a primeira requisição depois disso fica lenta.
- Com `DEMO_RESET_ON_START=true` (padrão do `render.yaml`), o seed recria a
  Mesa de demonstração e as contas de exemplo sempre que a API inicia. O que
  for feito nela some quando a API volta a dormir. As outras mesas e contas
  não são tocadas, então dá para usar o mesmo site com um grupo de verdade.
  Para desligar a demonstração, mude essa variável para `false` no painel do
  Render.

## Produção local com Docker

Na raiz do projeto, crie o `.env` com os segredos (o Git ignora esse arquivo):

```bash
cp .env.example .env
```

Preencha `JWT_SECRET` (pelo menos 32 caracteres) com um valor aleatório,
gerado por exemplo com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Sem esse valor a API recusa iniciar, assim como com um valor curto ou igual aos
exemplos do repositório. Depois:

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
estoque, nível e quantidades. A migration das mesas leva o que já existia no
banco para uma "Mesa principal", com cada conta no papel que tinha antes; na
demonstração, o reset seguinte troca essa mesa pela Mesa de demonstração.
Dados de um banco SQLite das versões antigas não são migrados.

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
