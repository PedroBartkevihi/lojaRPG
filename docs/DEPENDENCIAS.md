# Pendência de segurança das dependências

Verificação em 20/11/2026 (anterior: 11/10/2026). Status: **R06 ainda não resolvida**.

## Evidência e alcance

O lockfile do backend contém `prisma@6.19.3 -> @prisma/config@6.19.3 -> deepmerge-ts@7.1.5`.
O [aviso GHSA-ggr8-5vv4-36mx / CVE-2026-40345](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
afeta `deepmerge-ts < 8.0.0`: mesclar objetos com referências circulares pode esgotar a pilha.
JSON comum, sozinho, não cria essas referências.

`npm audit --json` e `npm audit --omit=dev --json`, executados no backend,
retornaram três entradas de gravidade alta, todas propagadas pelo mesmo aviso:
`deepmerge-ts`, `@prisma/config` e `prisma`. No frontend, `npm audit --omit=dev` retornou zero alertas.
Isso confirma a presença da dependência vulnerável; não demonstra exploração remota da aplicação.

Outro alerta transitivo do mesmo pacote (`@prisma/config@6.19.3 -> effect@3.21.0`,
[GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw), `effect <= 3.22.0`)
foi mitigado sem mudança de versão principal via `overrides` restrito a `@prisma/config`
(`effect: ^3.22.1`, resolvido em `3.22.5`, mesma série `3.x`).

Não foi identificado um caminho das entradas HTTP até essa operação de merge.
O uso localizado está no carregamento de configuração do Prisma. Ainda assim, o CLI
participa da publicação e das migrações na inicialização (`backend/Dockerfile`);
o alerta não deve ser descartado por isso. Desde a imagem Docker menor (D7), `prisma` é
dependência de produção, e `npm audit --omit=dev` também mostra o alerta.

## Por que a atualização ficou bloqueada

- O [registro oficial do Prisma](https://registry.npmjs.org/prisma) ainda lista `6.19.3`
  como a versão estável mais recente da série 6 consultada.
- O manifest oficial de [@prisma/config 7.10.1](https://registry.npmjs.org/@prisma%2fconfig/7.10.1)
  atualizou `deepmerge-ts` para `8.0.2` (antes fixado em `7.1.5` na `7.10.0`), mas
  `prisma@7.10.1` exige migração de versão principal (`6.x -> 7.x`, com mudanças incompatíveis
  em `schema.prisma`, `prisma.config.js` e `PrismaClient`) e ainda fixa `effect` em `3.20.0`
  (vulnerável a GHSA-7589-6fvf-x4pw).
- A tag `latest` consultada aponta para `8.0.0-rc.34`, uma prévia (já sem `@prisma/config`,
  mas ainda sem lançamento estável). Ela não foi adotada automaticamente como substituição estável.
- A sugestão automática do `npm audit fix --force` é atualizar `prisma` para `7.10.1`, uma
  quebra de versão principal (sem migrar `@prisma/client` nem o código do cliente).
- Forçar `deepmerge-ts@8` com `overrides` troca uma versão principal exigida pelo Prisma;
  a compatibilidade não está confirmada. Fazer o audit ficar verde não basta para validar essa troca.

Nenhum alerta de `deepmerge-ts` foi suprimido nesta pendência.

## Critério para encerrar R06

Adotar uma versão estável compatível do Prisma que inclua a correção, ou aprovar e
validar separadamente uma migração de versão principal/override. A validação deve incluir:

1. `npm ci`, auditoria integral e auditoria com `--omit=dev`.
2. `prisma validate`, `prisma generate` e aplicação das migrações em banco descartável.
3. Suítes completas, lint dos dois projetos e build do frontend.
4. Inicialização do container com a mesma configuração usada na publicação.

Até lá, manter esta pendência aberta e não carregar configurações Prisma de origem não confiável.
