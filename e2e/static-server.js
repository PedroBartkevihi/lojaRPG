// Serve o build do front-end como o site estatico do Render: arquivos de
// frontend/dist, qualquer outra rota cai no index.html, e os cabecalhos sao
// os do render.yaml. So a URL da API na CSP muda para a API dos testes. Assim
// os testes de ponta a ponta tambem conferem a politica de seguranca.
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'frontend', 'dist');
const port = Number(process.env.PORT || 4173);
const apiUrl = process.env.E2E_API_URL;
const PRODUCTION_API = 'https://lojarpg-api.onrender.com';

const blueprint = parse(readFileSync(path.join(root, 'render.yaml'), 'utf8'));
const site = blueprint.services.find((service) => service.name === 'lojarpg-web');
const headers = Object.fromEntries(
  (site.headers || [])
    .filter((header) => header.path === '/*')
    .map(({ name, value }) => {
      let headerValue = String(value);

      if (name === 'Content-Security-Policy') {
        if (!headerValue.includes(PRODUCTION_API)) {
          throw new Error(`A CSP do render.yaml não libera ${PRODUCTION_API}.`);
        }
        // Os testes rodam em HTTP local: sem esta troca o navegador tentaria
        // HTTPS em tudo.
        headerValue = headerValue.replace(PRODUCTION_API, apiUrl).replace(/;\s*upgrade-insecure-requests/, '');
      }

      return [name, headerValue];
    })
);

if (!headers['Content-Security-Policy']) {
  throw new Error('O render.yaml não define a Content-Security-Policy do site.');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch (_error) {
    // "%E0" e afins: o Render devolve o index.html em vez de cair.
    return path.join(dist, 'index.html');
  }
  const file = path.normalize(path.join(dist, decoded));

  if (file.startsWith(dist + path.sep)) {
    try {
      if (statSync(file).isFile()) {
        return file;
      }
    } catch (_error) {
      // Rota da aplicacao: cai no index.html.
    }
  }

  return path.join(dist, 'index.html');
}

createServer((request, response) => {
  const file = resolveFile(new URL(request.url, 'http://localhost').pathname);
  response.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Site de teste em http://127.0.0.1:${port}, com os cabeçalhos do render.yaml.`);
});
