import { useEffect } from 'react';

const INVITE_KEY = 'lojaRpgInvite';

// O convite guardado vale por um dia: quem abriu o link e so entrou semanas
// depois nao deve cair naquela mesa sem perceber.
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export function savePendingInvite(code) {
  localStorage.setItem(INVITE_KEY, JSON.stringify({ code, savedAt: Date.now() }));
}

export function clearPendingInvite() {
  localStorage.removeItem(INVITE_KEY);
}

export function readPendingInvite() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVITE_KEY));

    if (saved?.code && Date.now() - saved.savedAt < INVITE_TTL_MS) {
      return saved.code;
    }
  } catch (_error) {
    // Valor de uma versao antiga (so o codigo): tratado como vencido.
  }

  clearPendingInvite();
  return null;
}

// Destino logo depois de entrar: o convite guardado, se houver, ou a loja.
// O convite so e apagado quando a entrada na mesa acontece, porque a tela
// ainda passa por /login ou /register antes de chegar a /convite.
export function landingPath() {
  const pendingInvite = readPendingInvite();
  return pendingInvite ? `/convite/${pendingInvite}` : '/shop';
}

// Quem abre um link de convite sem estar logado entra na mesa depois do login.
export function usePendingInvite(loggedIn, inviteCode) {
  useEffect(() => {
    if (!loggedIn && inviteCode) {
      savePendingInvite(inviteCode);
    }
  }, [loggedIn, inviteCode]);
}
