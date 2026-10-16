import { useCallback, useState } from 'react';
import { REFRESH_COOKIE_MODE } from '../js/api.js';

const TOKEN_KEY = 'lojaRpgToken';
const REFRESH_TOKEN_KEY = 'lojaRpgRefreshToken';
const USER_KEY = 'lojaRpgUser';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (_error) {
    return null;
  }
}

// A API le os tokens do localStorage a cada requisicao (e nao do estado): uma
// renovacao feita por outra aba vale aqui na hora.
export const readToken = () => localStorage.getItem(TOKEN_KEY);
export const readRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

// Sessao da conta: tokens e usuario, guardados para o proximo carregamento.
export function useSession() {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(readStoredUser);

  const storeTokens = useCallback((data) => {
    const accessToken = data.accessToken || data.token;

    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
    }

    if (REFRESH_COOKIE_MODE) {
      // O refresh token esta no cookie httpOnly; um antigo guardado aqui
      // (de antes do modo cookie) ja foi trocado pelo cookie e sai.
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }

    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
    }
  }, []);

  const forgetSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, loggedIn: Boolean(token), storeTokens, forgetSession };
}
