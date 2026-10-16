// Banco dos testes de ponta a ponta, usado pela API dos testes e pelo reset da
// demonstracao em fixtures.js.
export const databaseUrl = process.env.E2E_DATABASE_URL || 'postgresql://lojarpg:lojarpg@127.0.0.1:5432/lojarpg_e2e';

// Os testes criam contas e mesas: a trava evita apontar para o banco de
// desenvolvimento ou de producao por engano.
if (!/_(e2e|review)$/.test(new URL(databaseUrl).pathname)) {
  throw new Error('E2E_DATABASE_URL precisa apontar para um banco cujo nome termina em _e2e ou _review.');
}
