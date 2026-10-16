# Pendência de segurança das dependências

Verificação em 11/10/2026. Status: **R06 ainda não resolvida**.

## Evidência e alcance

O lockfile do backend contém `prisma@6.19.3 -> @prisma/config@6.19.3 -> deepmerge-ts@7.1.5`.
O [aviso GHSA-ggr8-5vv4-36mx / CVE-2026-40345](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
afeta `deepmerge-ts < 8.0.0`: mesclar objetos com referências circulares pode esgotar a pilha.
JSON comum, sozinho, não cria essas referências.

`npm audit --json` e `npm audit --omit=dev --json`, executados no backend,
retornaram três entradas de gravidade alta, todas propagadas pelo mesmo aviso:
`deepmerge-ts`, `@prisma/config` e `prisma`. O frontend retornou zero alertas.
Isso confirma a presença da dependência vulnerável; não demonstra exploração remota da aplicação.

Não foi identificado um caminho das entradas HTTP até essa operação de merge.
O uso localizado está no carregamento de configuração do Prisma. Ainda assim, o CLI
participa da publicação e das migrações na inicialização (`backend/Dockerfile`);
o alerta não deve ser descartado por isso. Desde a imagem Docker menor (D7), `prisma` é
dependência de produção, e `npm audit --omit=dev` também mostra o alerta.

## Por que a atualização ficou bloqueada

- O [registro oficial do Prisma](https://registry.npmjs.org/prisma) ainda lista `6.19.3`
  como a versão estável mais recente da série 6 consultada.
- Os manifests oficiais de [@prisma/config 6.19.3](https://registry.npmjs.org/@prisma%2fconfig/6.19.3)
  e [7.10.0](https://registry.npmjs.org/@prisma%2fconfig/7.10.0) fixam `deepmerge-ts` em `7.1.5`.
  Portanto, migrar para essa versão 7 não elimina o alerta.
- A tag `latest` consultada aponta para `8.0.0-rc.22`, uma prévia. Ela não foi adotada
  automaticamente como substituição estável.
- A sugestão automática do audit é retroceder o Prisma para `6.12.0`, fora da faixa
  declarada. Não foi aplicada sem revisar os efeitos do downgrade.
- Forçar `deepmerge-ts@8` com `overrides` troca uma versão principal exigida pelo Prisma;
  a compatibilidade não está confirmada. Fazer o audit ficar verde não basta para validar essa troca.

Nenhum alerta foi suprimido e nenhum lockfile foi alterado nesta pendência.

## Critério para encerrar R06

Adotar uma versão estável compatível do Prisma que inclua a correção, ou aprovar e
validar separadamente uma migração de versão principal/override. A validação deve incluir:

1. `npm ci`, auditoria integral e auditoria com `--omit=dev`.
2. `prisma validate`, `prisma generate` e aplicação das migrações em banco descartável.
3. Suítes completas, lint dos dois projetos e build do frontend.
4. Inicialização do container com a mesma configuração usada na publicação.

Até lá, manter esta pendência aberta e não carregar configurações Prisma de origem não confiável.
