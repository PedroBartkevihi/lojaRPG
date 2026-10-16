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
   A Content-Security-Policy do site, também no `render.yaml`, libera a API
   pelo endereço `https://lojarpg-api.onrender.com`. Se a API tiver outro
   endereço, troque-o em `connect-src` (bloco `headers` do `lojarpg-web`);
   senão o navegador bloqueia as chamadas do site. Os cabeçalhos valem no
   próximo deploy do site.
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

## E-mail de "Esqueci minha senha"

A API manda o link de senha nova pela API HTTP do
[Resend](https://resend.com) (plano gratuito). Sem configuração, o e-mail não
sai: em desenvolvimento o texto aparece no log da API, e em produção o pedido
responde que a recuperação por e-mail ainda não foi configurada (503), em vez
de prometer um e-mail que não vai chegar.

1. Crie a conta no Resend e verifique um domínio seu (sem domínio, o Resend
   só entrega para o seu próprio e-mail, o que serve só para testar).
2. Crie uma API key com permissão de envio.
3. No Render, defina na API: `RESEND_API_KEY` com a chave e `EMAIL_FROM` com o
   remetente, por exemplo `lojaRPG <nao-responda@seudominio.com.br>`. As duas
   já estão no `render.yaml` como opcionais.
4. O link usa o endereço do site: por padrão, a primeira origem do
   `CORS_ORIGIN`. Para outro endereço, defina `APP_URL`.

O link vale 30 minutos e uma vez; trocar a senha encerra na hora as sessões
abertas da conta, inclusive o access token de até 15 minutos, e anula os outros
links pendentes. O e-mail não leva o nome da conta, que é texto livre de quem
cadastrou. As contas da demonstração não recebem link. Os pedidos de link têm
limite de 5 a cada 15 minutos por IP, e cada conta recebe no máximo um e-mail
por minuto.

## Refresh token em cookie httpOnly (domínio próprio)

Por padrão o refresh token fica no `localStorage`, onde um script injetado na
página conseguiria lê-lo. O modo cookie guarda o token num cookie `HttpOnly`
da API, que o JavaScript não lê. Ele está pronto, mas **desligado**, porque o
site (`lojarpg-web.onrender.com`) e a API (`lojarpg-api.onrender.com`) estão
em subdomínios do `onrender.com`, que os navegadores tratam como sites
diferentes: o Safari e outros que bloqueiam cookies de terceiros recusariam o
cookie, e quem joga no iPhone perderia a sessão a cada 15 minutos.

Para ligar, coloque os dois sob um domínio seu:

1. Registre um domínio e, no Render, adicione `app.seudominio.com.br` ao site
   e `api.seudominio.com.br` à API (*Settings > Custom Domains*), criando os
   registros DNS que o Render indicar.
2. Na API: `CORS_ORIGIN=https://app.seudominio.com.br` e
   `REFRESH_COOKIE_SAMESITE=lax` (o padrão).
3. No site: `VITE_API_URL=https://api.seudominio.com.br` e
   `VITE_REFRESH_COOKIE=true`; no `render.yaml`, troque a URL da API em
   `connect-src` pelo endereço novo.
4. Publique a API antes do site. Quem já estava logado não precisa entrar de
   novo: na primeira renovação, o refresh token antigo do `localStorage` é
   trocado pelo cookie e apagado.

`REFRESH_COOKIE_SAMESITE=none` faz o cookie funcionar entre domínios
diferentes nos navegadores que ainda aceitam cookies de terceiros; não é
recomendado. Para voltar ao modo antigo, basta `VITE_REFRESH_COOKIE=false`
no site.

## Envio de imagens dos itens (opcional)

Sem configuração, o Mestre cola a URL da imagem, como antes. Para ele enviar a
foto direto do celular:

1. Crie uma conta gratuita no [Cloudinary](https://cloudinary.com).
2. No painel dele, copie a **API environment variable**, no formato
   `cloudinary://<api_key>:<api_secret>@<cloud_name>`.
3. No Render, defina `CLOUDINARY_URL` na API (`lojarpg-api`) com esse valor.
   Ela já está no `render.yaml` como opcional (`sync: false`). No Docker,
   coloque-a no `.env` da raiz, que o `docker-compose.yml` repassa à API.

A API só assina cada envio (pasta `lojarpg/mesa-<id>`, nome de arquivo gerado
por ela, sem sobrescrever, formatos JPG, PNG, WebP e GIF, redução para no
máximo 800 x 800 px); o arquivo vai do navegador direto ao Cloudinary, e o
segredo não sai da API. Cada assinatura cria no máximo um arquivo, e cada conta
pede até 30 por hora (a conta de Mestre da demonstração é pública). O
formulário recusa arquivos acima de 5 MB; no servidor do Cloudinary vale o
teto do plano. A CSP do site já libera `https://api.cloudinary.com` para o
envio e qualquer imagem HTTPS para exibição.

## App instalável (PWA)

O build gera `manifest.webmanifest`, os ícones (`pwa-192x192.png`,
`pwa-512x512.png`, `maskable-512x512.png`, `apple-touch-icon.png`) e o service
worker (`sw.js`). No Android, o Chrome oferece "Instalar app"; no iPhone, use
Compartilhar > "Adicionar à Tela de Início" no Safari. Depois de um deploy, a
versão nova vale na próxima abertura do app (o service worker se atualiza
sozinho). Para trocar os ícones, gere os PNG a partir do `favicon.svg` com os
mesmos nomes.

## API acordada no dia de jogo e monitoramento

No plano gratuito, a API dorme depois de 15 minutos sem acesso, e o primeiro
login depois disso leva perto de um minuto. Três saídas, da mais limpa para a
mais barata:

1. **Instância paga só para a API** (no painel do Render, mude o plano do
   `lojarpg-api`). O site estático continua gratuito. É a única que deixa a API
   sempre acordada sem gastar as horas do plano gratuito.
2. **Workflow "Acordar a API para a sessão"** (`.github/workflows/acordar-api.yml`).
   Antes do jogo, abra a aba Actions do repositório (dá para fazer pelo app do
   GitHub no celular), escolha o workflow, clique em *Run workflow* e diga por
   quantas horas (1 a 5). Ele chama o `/ready` a cada 5 minutos e falha, com
   aviso por e-mail, se a API ficar 30 minutos sem responder. A URL vem da
   variável `API_URL` do repositório (*Settings > Secrets and variables >
   Actions > Variables*), com `https://lojarpg-api.onrender.com` como padrão.
3. **Abrir o site uns minutos antes** da sessão, sem configurar nada.

Cada hora acordada conta nas 750 horas mensais do plano gratuito do Render
(somadas entre os serviços web da conta). Com a demonstração ligada
(`DEMO_RESET_ON_START=true`), lembre que ela só volta ao estado inicial quando
a API reinicia, então uma API sempre acordada reseta a demonstração com menos
frequência.

### Monitor de disponibilidade

A API tem duas rotas sem autenticação:

- `GET /health`: responde `{"status":"ok"}` enquanto o processo estiver de pé.
  É o `healthCheckPath` do Render; se ela falhar, o Render reinicia a API.
- `GET /ready`: consulta o banco (`SELECT 1`, com limite de 5 segundos) e
  responde 200 ou 503. É a rota para um monitor externo.

Elas são separadas de propósito: se o `/health` dependesse do banco, um Neon
lento faria o Render reiniciar uma API saudável, e a queda ficaria maior.

Para ser avisado de uma queda, cadastre a API num monitor gratuito (por
exemplo UptimeRobot ou Better Stack), com alerta por e-mail. Atenção a dois
custos de um monitor que verifica a cada poucos minutos:

- **Render:** ele mantém a API acordada o mês inteiro, consumindo as horas do
  plano gratuito como na opção 2. Com a API no plano pago isso não importa.
- **Neon:** cada chamada ao `/ready` faz um `SELECT 1`, então o banco também
  nunca dorme e gasta as horas de computação do plano gratuito do Neon o mês
  inteiro. Se elas acabarem, o Neon suspende o banco até o próximo ciclo e a
  API inteira para. Confira a cota em *Billing* no Neon.

No plano gratuito, prefira o workflow só no dia de jogo e confira o `/ready`
quando ele terminar. Um monitor contínuo deve chamar o `/health` (que não toca
no banco); deixe o `/ready` com intervalo longo, ou só com o Neon pago.

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
- o endereço da API em `connect-src`, na Content-Security-Policy do
  `frontend/nginx.conf`

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

## Atualização para vendedores, sessões e moedas em cobre

Esta versão troca a unidade do dinheiro: preços, saldos e históricos passam
de PO inteiras para PC (peças de cobre). A migration
`20261012050000_copper_currency` multiplica os valores por 100, amplia as
colunas para `BIGINT` e converte também as respostas guardadas das compras. A
migration dos vendedores cria o **Geral** em cada mesa, aberto ou fechado como
a loja estava, e liga a ele todos os itens existentes. Os eventos antigos ficam
fora de qualquer sessão.

1. Faça o backup do banco (veja "Backup do PostgreSQL") e confira a mesa de
   demonstração (próxima seção).
2. Evite escritas durante a troca: a API antiga não pode gravar valores em PO
   num banco já convertido. No Render, publique num horário sem uso.
3. Publique a API e o front-end da mesma revisão. No Render e no Docker, o
   início da API aplica as migrations; em outra hospedagem, rode
   `npm run db:init` e `npm run prisma:generate` antes de subir a API.
4. Peça para recarregar as abas abertas. Uma aba antiga recebe 428 ao gravar
   dinheiro, porque não envia o cabeçalho `X-Currency-Unit: PC`.
5. Confira um saldo conhecido (250 PO continuam 250 PO na tela e valem 25000
   na API), uma compra antiga, um vendedor fechado e uma compra de 1 PC.

Metade do preço e divisões de recompensa passam a arredondar em cobre: metade
de 75 PO é 37 PO e 5 PP. Vendas antigas mantêm o valor registrado. Uma chave
de entrega gravada antes da conversão recebe 409 em vez de repetir a entrega,
porque foi calculada em PO.

Não use `db:reset` nem o seed para atualizar um banco real. Para voltar à
versão em PO depois de novas operações, restaure o backup com a API parada;
voltar só o código não basta. Se o `migrate deploy` falhar, resolva o estado da
migration antes de rodar de novo, sem aplicar a multiplicação por 100 à mão.

## Contas de demonstração com dados antigos

A mesa de demonstração tem a marca `campaigns.is_demo`, que não muda quando o
convite é regenerado. A migration marca só a mesa com o convite reservado
`MESADEMO`: ela não presume que a mesa de id 1 seja a demonstração, porque a
migration das mesas também usou esse id para a "Mesa principal".

Antes de publicar, confira o convite da mesa 1:

```sql
SELECT id, name, invite_code FROM campaigns WHERE id = 1;
```

Na versão anterior, qualquer visitante logado como Mestre da demonstração pode
regenerar o convite. Se a mesa 1 for a Mesa de demonstração e o convite não
for `MESADEMO`, devolva o código antes do deploy (ou reinicie a API antiga,
cujo reset faz o mesmo):

```sql
UPDATE campaigns SET invite_code = 'MESADEMO'
WHERE id = 1 AND name = 'Mesa de demonstração';
```

Sem isso, a migration não marca a mesa, o reset da versão nova para e a API
não sobe.

Se uma conta pública tiver vínculos, personagens ou registros em uma mesa real,
o reset também para **antes de excluir dados**, e o acesso dessas contas a
mesas reais é bloqueado, mesmo com um vínculo antigo. Com
`DEMO_RESET_ON_START=true`, esse bloqueio impede a API de subir, preservando os
dados; para publicar enquanto revisa, use `DEMO_RESET_ON_START=false` (as
migrations continuam obrigatórias). Para encontrar esses vínculos:

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

Essas consultas não cobrem a autoria de itens nem as auditorias. Antes de mover
qualquer dado, confirme com o responsável pela mesa qual conta deve recebê-lo e
faça a transferência de propriedade numa transação, preservando personagens,
compras e históricos. Não apague personagens para liberar o reset, e não marque
uma mesa como demonstração só pelo nome ou pelo id. A API nunca transfere dados
para uma conta presumida.

## Backup e restauração

O backup tem e-mails e hashes de senha. Guarde os arquivos em local privado,
nunca no repositório (a pasta `backups/` é ignorada pelo Git).

### Retenção do Neon

O Neon guarda um histórico do banco (*point-in-time restore*), mas a janela do
plano gratuito é curta. Confira em *Settings > Storage* do projeto qual é a
janela atual do seu plano: ela cobre um erro percebido na hora, não um
problema descoberto dias depois. Por isso vale o `pg_dump` periódico abaixo.
Antes de uma atualização sensível, crie também um branch de backup no Neon
(*Branches > Create branch*), como no deploy do PR #15.

### Backup manual (do seu computador)

Os scripts rodam o `pg_dump` e o `pg_restore` na imagem oficial do
PostgreSQL 17 pelo Docker, sem instalar nada além dele. Para a senha do banco
não ficar no histórico do terminal, ponha a URL no `backend/.env` (que o Git
ignora), em vez de passá-la na linha de comando:

```bash
BACKUP_DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
```

Depois, no diretório `backend`:

```bash
npm run db:backup
```

O arquivo vai para `backups/<banco>-<data UTC>.dump` na raiz do projeto, no
formato custom do `pg_dump` (comprimido). Sem `BACKUP_DATABASE_URL`, o script
usa o `DATABASE_URL` do `.env` (o banco de desenvolvimento). Também aceita
`--url <URL>` e `--out <pasta>`. A senha vai para o container só pelo ambiente
(`PGPASSWORD`), nunca nos argumentos do `pg_dump`.

### Backup semanal automático (GitHub Actions)

O workflow `.github/workflows/backup.yml` roda toda segunda-feira às 06:00 UTC
(e sob demanda pela aba Actions). Ele exporta o banco, **criptografa** o
arquivo com GPG (AES-256) e o guarda como artefato do workflow por 30 dias. A
criptografia é obrigatória porque os artefatos de um repositório público podem
ser baixados por qualquer conta do GitHub. Para ligar, crie dois segredos em
*Settings > Secrets and variables > Actions*:

- `BACKUP_DATABASE_URL`: a connection string direta do Neon. De preferência
  com um papel só de leitura criado para o backup (por exemplo, no SQL Editor do Neon:
  `CREATE ROLE backup LOGIN PASSWORD '...'; GRANT pg_read_all_data TO backup;`),
  e não com o dono do banco.
- `BACKUP_PASSPHRASE`: uma senha longa, guardada também fora do GitHub (sem
  ela o backup não abre).

Sem os segredos, o workflow só avisa e termina. O GitHub desativa workflows
agendados de repositórios sem atividade por 60 dias; se isso acontecer, ele
avisa por e-mail e basta reativar na aba Actions. O artefato baixado vem num
`.zip`; extraia o `.dump.gpg` para a pasta `backups/` e abra com:

```bash
gpg --output backups/lojarpg.dump --decrypt backups/lojarpg-AAAAMMDD-HHMM.dump.gpg
```

Use `--output`, e não `> arquivo`: no PowerShell o `>` regrava a saída como
texto e corrompe o dump.

### Ensaio de restauração

Um backup só vale se a restauração funcionar. Pelo menos uma vez (e depois de
mudanças grandes no schema), restaure um backup num banco de teste e confira
os dados:

```bash
npm run db:restore-check -- ../backups/<arquivo>.dump
```

Para comparar com a origem, ponha a URL dela no `backend/.env` como
`COMPARE_DATABASE_URL` (ou passe `--compare <URL>`). O caminho do arquivo vale
a partir da pasta onde você digitou o comando ou da raiz do projeto.

O script recria o banco `lojarpg_restore` do Docker local (o destino precisa
terminar em `_restore`, porque é apagado e recriado; mude com `--target`),
restaura o arquivo e mostra a contagem de usuários, mesas, vendedores,
personagens, itens, inventário, compras e históricos, a soma do ouro e a
última migration. Com a origem, compara cada número (inclusive tabelas que só
existam de um lado) e termina com erro se algum for diferente; rode logo depois
do backup, antes de novas operações na origem. Um backup sem as tabelas da loja
(por exemplo, do banco errado) também termina com erro. Depois do ensaio, apague o banco de teste:

```bash
docker compose exec db psql -U lojarpg -c "DROP DATABASE lojarpg_restore"
```

Para restaurar de verdade num banco novo do Neon, use o mesmo `pg_restore`
com a URL dele (`--no-owner --no-privileges`), com a API parada, e só depois
troque o `DATABASE_URL` no Render.

## Limites por conta

- `MAX_CAMPAIGNS_PER_USER` (padrão 10): quantas mesas uma conta pode mestrar
  ao mesmo tempo. Excluir uma mesa libera a vaga; entrar como jogador não
  conta.
- O cadastro ainda responde "Email já cadastrado" para um e-mail em uso. Uma
  resposta igual para os dois casos exigiria confirmar o e-mail antes de
  liberar a conta (hoje o cadastro já entra na loja); o rate limit do cadastro
  (20 tentativas a cada 15 minutos por IP) limita a varredura de e-mails.

## Logs e erros

A API escreve logs em JSON (pino), uma linha por evento, com `reqId`: o id da
requisição, que também volta no cabeçalho `X-Request-Id` da resposta (um
`X-Request-Id` válido mandado por um proxy é mantido). Cada requisição gera uma
linha com método, rota sem a query, status e tempo; `/health` e `/ready` ficam
de fora. Tokens, cookies, senhas e e-mails nunca vão para o log (aparecem como
`[omitido]`). `LOG_LEVEL` muda o nível (`info` por padrão; `debug`, `warn`,
`error`...); um valor que o pino não conhece fica no padrão, com um aviso no
log.

Erros do navegador (exceções não tratadas e telas que quebram) vão para
`POST /client-errors` e aparecem no mesmo log, em nível `warn`, com a mensagem,
a pilha, a rota da tela sem query (e sem o código, em `/convite/:code`) e o
`requestId` da última resposta, para achar a requisição que veio antes. Uma
tela que quebra mostra "Algo deu errado nesta tela" em vez de ficar em branco,
com botões para recarregar ou ir para as mesas; voltar no navegador também
tenta de novo.

Onde ler:

- Desenvolvimento: a saída do `npm run dev` no diretório `backend` (JSON; para
  ler formatado, `npm run dev | npx pino-pretty`).
- Docker: `docker compose logs -f backend` e `docker compose logs -f frontend`.
- Render: aba Logs da API. Para seguir uma requisição, busque pelo `reqId`;
  para os erros do site, por `Erro no navegador`; para os 500, por
  `Erro interno`.

A API não devolve detalhes internos em erros 500. Um serviço externo de
rastreio de erros (Sentry, por exemplo) não foi incluído para não depender de
conta de terceiros: os dois lados já registram no log da API, e dá para ligar
um alerta por palavra-chave no próprio Render ou num serviço de logs.
