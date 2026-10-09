# Deploy lojaRPG

## Desenvolvimento local

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

Sem esse arquivo o `docker compose` nao sobe, e a API recusa iniciar em
producao com valores curtos ou iguais aos exemplos do repositorio. Depois:

```bash
docker compose up --build
```

Servicos:

- Front-end: `http://localhost:8080`
- API: `http://localhost:3001`
- Banco SQLite: volume Docker `loja_rpg_data`, montado em `/app/data`

Antes de usar em producao fora da sua maquina, ajuste tambem:

- `CORS_ORIGIN`
- `VITE_API_URL`

## Producao real

Opcoes comuns:

- Front-end: Vercel, Netlify, Cloudflare Pages, S3/CloudFront ou Nginx.
- API: Render, Railway, Fly.io, VPS, Docker Swarm ou Kubernetes.
- Banco: SQLite atende grupos pequenos. Para uso online continuo, prefira
  PostgreSQL e ajuste `datasource db` no Prisma.

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

A migration `202610090001_check_constraints` recria as tabelas para adicionar
as regras `CHECK`, dentro de uma transacao. Se um banco existente tiver dados
invalidos (ouro ou estoque negativo, por exemplo), ela falha sem alterar as
tabelas. Para seguir, corrija esses registros e rode:

```bash
npx prisma migrate resolve --rolled-back 202610090001_check_constraints
npx prisma migrate deploy
```

Faca backup antes, como em qualquer migration.

## Backup do SQLite

Com a aplicacao parada em instalacao local:

```bash
copy C:\lojaRPG\backend\data\loja-rpg.sqlite C:\backups\loja-rpg.sqlite
```

Em Docker, copie do volume ou monte `/app/data` em uma pasta do host.
Exemplo conceitual:

```bash
docker compose stop backend
docker run --rm -v loja_rpg_data:/data -v C:\backups:/backup alpine cp /data/loja-rpg.sqlite /backup/loja-rpg.sqlite
docker compose start backend
```

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
