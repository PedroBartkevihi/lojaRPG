import { API_URL, getLastRequestId } from './api.js';

const MAX_REPORTS_PER_PAGE = 10;
const sent = new Set();

// Manda um erro do navegador para o log da API, sem dados pessoais: a
// mensagem, a pilha, a rota da tela (sem query, fragmento nem o codigo de um
// convite, que da entrada na mesa) e o id da
// ultima requisicao. O mesmo erro so vai uma vez por carregamento, e no
// maximo dez por pagina. Falhar ao relatar nao gera outro relato.
export function reportClientError({ message, stack, kind = 'error' }) {
  const text = String(message || 'Erro desconhecido').slice(0, 500);

  if (sent.has(text) || sent.size >= MAX_REPORTS_PER_PAGE) {
    return;
  }

  sent.add(text);

  try {
    fetch(`${API_URL}/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        stack: stack ? String(stack).slice(0, 4000) : undefined,
        path: window.location.pathname.replace(/^\/convite\/[^/]+/, '/convite/:code'),
        requestId: getLastRequestId() || undefined,
        kind
      }),
      keepalive: true
    }).catch(() => {});
  } catch (_error) {
    // Sem fetch (navegador muito antigo): o erro fica so no console.
  }
}

export function installErrorReporting() {
  window.addEventListener('error', (event) => {
    reportClientError({ message: event.message, stack: event.error?.stack, kind: 'error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientError({ message: reason?.message || String(reason), stack: reason?.stack, kind: 'unhandledrejection' });
  });
}

// Para os testes: esquece os erros ja enviados.
export function resetErrorReporting() {
  sent.clear();
}
