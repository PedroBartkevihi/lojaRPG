# Banco de dados

O projeto usa SQLite com Prisma Client. As migrations versionadas ficam em
`backend/prisma/migrations`.

Esta pasta ainda contem:

- `schema.sql`: bootstrap local usado pelos scripts antigos e pela inicializacao
  da API quando o arquivo SQLite ainda nao existe.
- `seed.sql`: dados iniciais de desenvolvimento para os scripts antigos.

Para evoluir o banco, crie migrations pelo Prisma:

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

Para recriar o banco local de desenvolvimento:

```bash
cd backend
npm run db:reset
```
