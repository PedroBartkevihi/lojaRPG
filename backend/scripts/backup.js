// Backup e ensaio de restauracao do PostgreSQL, sem instalar o pg_dump: as
// ferramentas rodam na imagem oficial do PostgreSQL pelo Docker, na mesma
// versao do banco (17).
//
//   npm run db:backup -- [--url <DATABASE_URL>] [--out <pasta>]
//   npm run db:restore-check -- <arquivo.dump> [--target <URL>] [--compare <URL>]
//
// O backup tem e-mails e hashes de senha: guarde-o em local privado, fora do
// repositorio (a pasta backups/ e ignorada pelo Git).
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const POSTGRES_IMAGE = process.env.BACKUP_POSTGRES_IMAGE || 'postgres:17-alpine';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_TARGET = 'postgresql://lojarpg:lojarpg@127.0.0.1:5432/lojarpg_restore';

// Tabelas conferidas depois da restauracao, alem da ultima migration aplicada.
const CHECKED_TABLES = [
  'users',
  'campaigns',
  'campaign_members',
  'shops',
  'characters',
  'items',
  'inventory',
  'purchases',
  'purchase_items',
  'gold_audit_logs',
  'inventory_logs',
  'stock_movements',
  'campaign_sessions'
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

// Dentro do container, 127.0.0.1 e o proprio container. No Docker Desktop
// (Windows e macOS) o computador e host.docker.internal; no Linux, a rede do
// host resolve.
function dockerNetwork(url) {
  const parsed = new URL(url);

  if (process.platform === 'linux') {
    return { url, args: ['--network', 'host'] };
  }

  if (['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) {
    parsed.hostname = 'host.docker.internal';
  }

  return { url: parsed.toString(), args: [] };
}

// A URL vai pelo ambiente (-e PGURL sem valor), e nao pela linha de comando,
// para a senha nao aparecer na lista de processos.
function runPostgresTool(url, command, { input, output, capture = false } = {}) {
  const network = dockerNetwork(url);
  const args = ['run', '--rm', '-i', ...network.args, '-e', 'PGURL', POSTGRES_IMAGE, 'sh', '-c', command];

  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, {
      env: { ...process.env, PGURL: network.url },
      stdio: ['pipe', output || capture ? 'pipe' : 'inherit', 'inherit']
    });
    let stdout = '';

    child.on('error', (error) => reject(new Error(`Não foi possível rodar o Docker: ${error.message}`)));

    if (output) {
      child.stdout.pipe(output);
    } else if (capture) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
    }

    if (input) {
      input.pipe(child.stdin);
    } else {
      child.stdin.end();
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command.split(' ')[0]} terminou com código ${code}.`));
      }
    });
  });
}

function timestamp() {
  return new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
}

async function dump(args) {
  const url = option(args, '--url') || process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;

  if (!url) {
    fail('Informe o banco com --url ou BACKUP_DATABASE_URL.');
  }

  const outDir = path.resolve(option(args, '--out') || path.join(repoRoot, 'backups'));
  const database = new URL(url).pathname.slice(1);
  const file = path.join(outDir, `${database}-${timestamp()}.dump`);
  mkdirSync(outDir, { recursive: true });

  console.log(`Exportando ${database} para ${file}...`);
  const output = createWriteStream(file);
  // Formato custom (-Fc): comprimido e restauravel tabela a tabela. Sem dono
  // nem permissoes, para restaurar em outro servidor com outro usuario.
  await runPostgresTool(url, 'pg_dump --format=custom --no-owner --no-privileges "$PGURL"', { output });
  await new Promise((resolve) => output.end(resolve));
  console.log(`Backup concluído (${Math.round(statSync(file).size / 1024)} KB).`);
}

async function countRows(url) {
  const tables = (
    await runPostgresTool(
      url,
      `psql "$PGURL" -At -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"`,
      { capture: true }
    )
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const present = CHECKED_TABLES.filter((table) => tables.includes(table));
  const queries = [
    ...present.map((table) => `SELECT '${table}', count(*)::text FROM "${table}"`),
    ...(tables.includes('characters') ? [`SELECT 'soma do ouro (PC)', COALESCE(SUM(gold), 0)::text FROM characters`] : []),
    ...(tables.includes('_prisma_migrations')
      ? [
          `SELECT 'última migration', (SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1)`
        ]
      : [])
  ];
  const result = await runPostgresTool(url, `psql "$PGURL" -At -F '|' -c "${queries.join(' UNION ALL ').replace(/"/g, '\\"')}"`, {
    capture: true
  });

  return new Map(
    result
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('|'))
  );
}

async function restoreCheck(args) {
  const file = args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
  const target = option(args, '--target') || process.env.RESTORE_DATABASE_URL || DEFAULT_TARGET;
  const compare = option(args, '--compare');

  if (!file) {
    fail('Informe o arquivo do backup: npm run db:restore-check -- backups/arquivo.dump');
  }

  const targetUrl = new URL(target);
  const database = targetUrl.pathname.slice(1);

  // O banco de destino e apagado e recriado: a trava evita apontar para um
  // banco de verdade por engano, como a dos testes faz com o _test.
  if (!/^[a-z0-9_]+_restore$/.test(database)) {
    fail('O banco de destino precisa ter um nome terminado em _restore (ele é apagado e recriado).');
  }

  const adminUrl = new URL(target);
  adminUrl.pathname = '/postgres';

  console.log(`Recriando o banco ${database}...`);
  await runPostgresTool(
    adminUrl.toString(),
    `psql "$PGURL" -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "${database}"' -c 'CREATE DATABASE "${database}"'`
  );

  console.log(`Restaurando ${file}...`);
  await runPostgresTool(target, 'pg_restore --no-owner --no-privileges --exit-on-error -d "$PGURL"', {
    input: createReadStream(file)
  });

  const restored = await countRows(target);
  const source = compare ? await countRows(compare) : null;
  let mismatches = 0;

  console.log('\nConferência do banco restaurado:');
  for (const [name, value] of restored) {
    const expected = source?.get(name);
    const flag = source ? (expected === value ? 'ok' : `DIFERENTE (origem: ${expected ?? 'ausente'})`) : '';
    if (source && expected !== value) mismatches += 1;
    console.log(`  ${name.padEnd(20)} ${String(value).padStart(10)}  ${flag}`);
  }

  if (mismatches > 0) {
    fail(`\n${mismatches} diferença(s) entre o backup restaurado e a origem.`);
  }

  console.log(
    source
      ? '\nRestauração conferida: as contagens batem com a origem.'
      : '\nRestauração concluída. Use --compare <URL da origem> para comparar as contagens.'
  );
}

const [command, ...args] = process.argv.slice(2);

const commands = { dump, 'restore-check': restoreCheck };

if (!commands[command]) {
  fail('Uso: node scripts/backup.js dump [--url URL] | restore-check <arquivo> [--target URL] [--compare URL]');
}

commands[command](args).catch((error) => fail(error.message));
