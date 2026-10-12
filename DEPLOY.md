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
- Os botões "Entrar como jogador" e "Entrar como Mestre" da tela de entrada
  usam as contas da demonstração. Sem demonstração, defina
  `VITE_DEMO_LOGIN=false` no front-end e refaça o deploy dele para escondê-los.

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

Como no Render, o `docker-compose.yml` liga `DEMO_RESET_ON_START`: a cada
início a API recria a mesa de demonstração e as contas de exemplo, e os botões
"Entrar como..." funcionam. As outras mesas não são tocadas. Para uma
instalação sem demonstração, troque o valor para `"false"` e passe
`VITE_DEMO_LOGIN=false` no build do front-end.

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

### Contas demo com dados legados

A mesa de demonstracao possui a marca persistente `campaigns.is_demo`, que
nao muda ao regenerar o convite. A migration marca apenas o codigo reservado
`MESADEMO`; nao presume que a mesa de id 1, chamada "Mesa principal" em uma
migration antiga, seja descartavel.

Se uma conta publica tiver vinculos, personagens ou registros em uma mesa real,
o reset para **antes de excluir dados**. O acesso dessas contas a mesas reais
tambem e bloqueado, mesmo com um vinculo antigo. Para publicar sem executar o
reset durante a revisao, defina `DEMO_RESET_ON_START=false`; as migrations
continuam obrigatorias. Com a variavel ligada, esse bloqueio interrompe o inicio
da API, preservando os dados.

Faca backup e identifique os vinculos antes de qualquer transferencia:

```sql
SELECT u.id AS user_id, u.email, c.id AS campaign_id, c.name, m.role
FROM users u
JOIN campaign_members m ON m.user_id = u.id
JOIN campaigns c ON c.id = m.campaign_id
WHERE NOT c.is_demo
  AND u.email IN ('mestre@lojarpg.local', 'aria@lojarpg.local',
                  'borin@lojarpg.local', 'lia@lojarpg.local');

SELECT ch.id, ch.name, ch.user_id, ch.campaign_id
FROM characters ch JOIN users u ON u.id = ch.user_id
JOIN campaigns c ON c.id = ch.campaign_id
WHERE NOT c.is_demo
  AND u.email IN ('mestre@lojarpg.local', 'aria@lojarpg.local',
                  'borin@lojarpg.local', 'lia@lojarpg.local');
```

Essas consultas iniciais nao substituem revisar autoria de itens e auditorias.
Confirme com o responsavel pela mesa a conta individual que recebera os dados;
so entao planeje uma transferencia transacional de propriedade e vinculos,
preservando personagens, compras e historicos. Nao apague personagens para
liberar o reset. Uma demo antiga com convite ja regenerado tambem requer
classificacao manual: nao marque uma mesa como demo apenas por nome ou id.
Nenhuma transferencia automatica para uma conta presumida e executada.

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

## Atualização A1–A5: vendedores, sessões e moedas

1. Faça backup e suspenda as escritas da API antiga antes de migrar. A unidade monetária muda de ouro inteiro para cobre; não execute versões antigas e novas simultaneamente sobre o mesmo banco.
2. Instale as dependências do backend, execute `npm run db:init` (Prisma migrate deploy) e `npm run prisma:generate`. As migrações preservam os itens em “Geral”, deixam eventos antigos sem sessão e convertem todos os valores monetários, inclusive históricos e respostas idempotentes.
3. Publique a API e o build da interface desta mesma revisão. Reabra as escritas e solicite que as abas antigas sejam recarregadas. Clientes externos devem enviar valores em PC e o cabeçalho `X-Currency-Unit: PC`; sem ele, escritas monetárias recebem 428.
4. Confira em staging um saldo/preço conhecido: 250 PO devem aparecer como 25 PL, com valor 25000 na API. Confira uma compra histórica, um vendedor fechado e uma compra de 1 PC.

Não use `db:reset` ou seed para atualizar um banco real. As migrations são aplicadas uma única vez pelo Prisma. Um rollback para a versão em PO exige restaurar o backup com a API parada; não basta voltar o código depois de novas operações em PC. Se `migrate deploy` falhar, investigue e resolva o estado da migration antes de reexecutar, sem aplicar manualmente a multiplicação por 100.

Os testes de integração e de migração usam exclusivamente `TEST_DATABASE_URL` com nome terminado em `_test`. A checagem local não executa publicação nem migra o banco real.
