# Banco de dados

Este projeto usa SQLite pelo modulo nativo `node:sqlite`, disponivel no Node 24+.

- `schema.sql` cria as tabelas, chaves e restricoes.
- `seed.sql` limpa e insere dados iniciais de desenvolvimento.

Execute pelo back-end:

```bash
cd backend
npm run db:reset
```
