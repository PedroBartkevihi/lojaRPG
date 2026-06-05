# Back-end lojaRPG

API Express com Prisma, SQLite, JWT access token, refresh token revogavel,
Helmet, rate limit e testes de integracao.

## Comandos

```bash
npm install
copy .env.example .env
npx prisma generate
npm run db:reset
npm run dev
```

## Testes

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Prisma

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
npx prisma db seed
```

Para preservar dados de um SQLite legado:

```bash
npm run db:migrate:legacy
```

Rotas principais ficam sob `http://localhost:3001`.
