# Pendência de segurança das dependências

Verificação em 21/11/2026 (anteriores: 20/11/2026, 11/10/2026). Status: **R06 encerrada**.

## Resolução

O back-end foi migrado de `prisma@6.19.3` e `@prisma/client@6.19.3` para
`prisma@7.10.1`, `@prisma/client@7.10.1` e `@prisma/adapter-pg@7.10.1` (versão
estável mais recente da série 7; a tag `latest` `8.0.0-rc.34` segue como prévia).

Com isso, `@prisma/config@7.10.1` passou a resolver `deepmerge-ts@8.0.2`,
eliminando o aviso de gravidade alta
[GHSA-ggr8-5vv4-36mx / CVE-2026-40345](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
(`deepmerge-ts < 8.0.0`) sem forçar override de versão principal e sem abrir
alertas novos.

### Mitigação mantida para `effect`

O `overrides` restrito a `@prisma/config` em `backend/package.json`
(`effect: ^3.22.1`, resolvido em `effect@3.22.5`, mesma série `3.x`) permanece
ativo porque `@prisma/config@7.10.1` ainda fixa `effect@3.20.0`, afetado por
[GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw)
(`effect <= 3.22.0`). Sem esse override, `npm audit` e `npm audit --omit=dev`
reportam três entradas altas propagadas por `effect` (`effect`,
`@prisma/config` e `prisma`); com ele, ambas as auditorias retornam zero
vulnerabilidades. Esse override poderá ser removido quando uma versão estável
do Prisma deixar de depender de `effect <= 3.22.0` (ou remover `@prisma/config`).

## Validação do critério para encerrar R06

Os quatro itens exigidos foram validados em 21/11/2026:

1. **`npm ci`, auditoria integral e auditoria com `--omit=dev`:** no `backend`,
   `npm ci` e `npm ci --omit=dev` concluíram a partir do novo
   `package-lock.json`; `npm audit` e `npm audit --omit=dev` retornaram
   `found 0 vulnerabilities` (assim como `npm audit --omit=dev` no `frontend`).
2. **`prisma validate`, `prisma generate` e aplicação das migrations em banco
   descartável:** `npx prisma validate` e `npx prisma generate` (inclusive sem
   `DATABASE_URL`, como no build) concluíram com sucesso; `npx prisma migrate
   deploy` aplicou todas as 16 migrations existentes em bancos descartáveis
   (`lojarpg_test`, `lojarpg_docker_test` e `lojarpg_render_test`) sem gerar
   migration nova nem alterar o schema.
3. **Suítes completas, lint dos dois projetos e build do front-end:**
   - `backend`: `npm run lint` e `npm run typecheck` sem erros (inclusive antes
     de gerar `src/generated/prisma`, como no CI) e `npm test` com `6` arquivos
     e `141` testes passando (incluindo cobertura para deadlock `40P01` no
     `@prisma/adapter-pg`).
   - `frontend`: `npm run lint`, `npm run typecheck`, `npm test` (`33` arquivos,
     `134` testes) e `npm run build` passando.
   - `e2e`: suíte Playwright completa (`11` testes) e recorte no modo cookie
     (`E2E_REFRESH_COOKIE=true`, `5` testes) passando contra `lojarpg_e2e`.
4. **Inicialização do container com a mesma configuração usada na publicação:**
   `docker build -f backend/Dockerfile .` concluiu sem erro; o container
   (`NODE_ENV=production`, `DEMO_RESET_ON_START=true`, `USER node`, sem
   `node_modules/typescript`) aplicou as migrations, executou `node
   prisma/seed.js`, respondeu `200` em `/health` e `/ready` e autenticou a conta
   de demonstração. O fluxo do `render.yaml` (`buildCommand` sem `DATABASE_URL`
   seguido de `startCommand`) também foi validado contra banco descartável com
   `200` em `/health` e `/ready`.

## Histórico da pendência

Em 11/10/2026 e 20/11/2026, o lockfile do back-end continha
`prisma@6.19.3 -> @prisma/config@6.19.3 -> deepmerge-ts@7.1.5`, gerando três
entradas de gravidade alta em `npm audit` e `npm audit --omit=dev`
(`deepmerge-ts`, `@prisma/config` e `prisma`) pelo aviso
GHSA-ggr8-5vv4-36mx / CVE-2026-40345 (mesclagem de objetos com referências
circulares capaz de esgotar a pilha no carregamento de configuração do Prisma).
Como `6.19.3` permanecia a última versão estável da série 6 e a correção para
`deepmerge-ts@8.0.2` saiu em `@prisma/config@7.10.1`, a pendência ficou aberta
até a migração completa e validada para a série 7.
