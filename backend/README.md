# Back-end lojaRPG

API Express com Prisma, PostgreSQL, validação com Zod, JWT (access token e
refresh token revogável), Helmet, rate limit e testes de integração.

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
