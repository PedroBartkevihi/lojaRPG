# Back-end lojaRPG

API Express com Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, validação com Zod,
JWT (access token e refresh token revogável), Helmet, rate limit e testes de
integração.

## Comandos

Suba o PostgreSQL antes (`docker compose up -d db` na raiz do projeto).

```bash
npm install
cp .env.example .env
npx prisma generate
npm run db:reset
npm run dev
```

A API fica em `http://localhost:3001`.

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

As migrations são a única definição do banco; os testes também montam o banco
por elas.

O Prisma 7 gera o cliente em `src/generated/prisma` (TypeScript ESM executado
direto pelo Node 24, ignorado pelo Git) e lê `schema`, `migrations`, `seed` e
`datasource.url` em `prisma.config.js`. Os comandos `prisma migrate dev` e
`prisma migrate reset` não rodam `prisma generate` nem `prisma db seed`
automaticamente; use `npx prisma generate` após mudanças no schema e
`npm run db:reset` quando quiser resetar e repopular o banco local.
