const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Uma pagina de erro do proxy (HTML) vira resposta sem corpo, e quem chamou
// recebe a mensagem generica em vez de um erro de JSON.
async function parseResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return {};
  }
}

const RENEWAL_UNAVAILABLE_MESSAGE = 'Não foi possível renovar a sessão agora. Tente de novo em instantes.';

// Com VITE_REFRESH_COOKIE=true, o refresh token fica num cookie httpOnly da
// API, que o JavaScript da pagina nao le, em vez do localStorage. So vale com
// o site e a API no mesmo dominio (veja o DEPLOY.md): em dominios diferentes,
// navegadores que bloqueiam cookies de terceiros recusariam o cookie.
export const REFRESH_COOKIE_MODE = import.meta.env.VITE_REFRESH_COOKIE === 'true';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQuery(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return `${path}${query ? `?${query}` : ''}`;
}

// `getCampaignId` devolve a mesa ativa; as rotas da loja ficam todas abaixo
// de /campaigns/:id.
export function createApi(getToken, onUnauthorized, getRefreshToken, onTokenRefresh, getCampaignId, { refreshCookie = REFRESH_COOKIE_MODE } = {}) {
  const campaignPath = (path = '') => `/campaigns/${getCampaignId?.()}${path}`;
  let renewing = null;

  // Quando o access token vence, varias requisicoes recebem 401 juntas. Cada
  // refresh token so vale uma vez, entao todas esperam a mesma renovacao.
  // Devolve 'renewed', 'rejected' (a sessao acabou) ou 'unavailable' (rede
  // fora, limite ou erro do servidor: a sessao fica para a proxima tentativa).
  async function renewSession(usedToken) {
    // Outra requisicao (ou outra aba) ja renovou: basta repetir com o token novo.
    if (getToken() !== usedToken) {
      return 'renewed';
    }

    // No modo cookie o navegador manda o cookie sozinho. Um refresh token
    // antigo do localStorage (de antes do modo cookie) ainda vai uma vez no
    // corpo, e a API responde com o cookie: ninguem precisa entrar de novo.
    const refreshToken = getRefreshToken?.();

    if (!refreshToken && !refreshCookie) {
      return 'rejected';
    }

    if (!renewing) {
      renewing = request('/auth/refresh', { method: 'POST', body: refreshToken ? { refreshToken } : {}, retry: false })
        .then((refreshed) => {
          onTokenRefresh?.(refreshed);
          return 'renewed';
        })
        .catch(async (error) => {
          if (refreshToken && getRefreshToken?.() !== refreshToken) {
            return 'renewed';
          }

          // Outra aba pode ter girado o mesmo cookie um instante antes; o
          // token novo dela chega pelo localStorage.
          if (refreshCookie && error.status === 401) {
            await wait(500);
            if (getToken() !== usedToken) {
              return 'renewed';
            }
          }

          // So a recusa do refresh token (401) encerra a sessao.
          return error.status === 401 ? 'rejected' : 'unavailable';
        })
        .finally(() => {
          renewing = null;
        });
    }

    return renewing;
  }

  async function request(path, options = {}) {
    const retry = options.retry !== false;
    const headers = {
      'X-Currency-Unit': 'PC',
      ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body = options.body;

    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    // So as rotas de autenticacao usam o cookie (ele tem Path=/auth).
    const authCookie = refreshCookie && path.startsWith('/auth/');

    if (authCookie) {
      headers['X-Refresh-Transport'] = 'cookie';
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body,
      ...(authCookie ? { credentials: 'include' } : {})
    });
    const data = await parseResponse(response);

    // So e sessao vencida quando a requisicao levava um token. Um 401 sem token
    // (senha errada) ou da propria renovacao e so um erro para quem chamou.
    if (response.status === 401 && token && path !== '/auth/refresh') {
      const renewal = retry ? await renewSession(token) : 'rejected';

      if (renewal === 'renewed') {
        return request(path, { ...options, retry: false });
      }

      if (renewal === 'unavailable') {
        throw new Error(RENEWAL_UNAVAILABLE_MESSAGE);
      }

      onUnauthorized?.();
    }

    if (!response.ok) {
      const error = new Error(data.message || 'Erro ao comunicar com a API.');
      error.status = response.status;
      throw error;
    }

    return data;
  }

  // Envia a imagem direto ao Cloudinary com a assinatura da API e devolve a
  // URL final, que o formulario guarda em imageUrl.
  async function uploadItemImage(file) {
    const { uploadUrl, fields, maxBytes } = await request(campaignPath('/uploads/item-image'), { method: 'POST' });

    if (file.size > maxBytes) {
      throw new Error(`A imagem tem mais de ${Math.round(maxBytes / 1024 / 1024)} MB. Escolha uma menor.`);
    }

    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', file);

    let response;
    try {
      response = await fetch(uploadUrl, { method: 'POST', body: form });
    } catch (_error) {
      throw new Error('Não foi possível enviar a imagem. Confira a conexão e tente de novo.');
    }
    const data = await parseResponse(response);

    if (!response.ok || !data.secure_url) {
      throw new Error(data.error?.message ? `O envio da imagem falhou: ${data.error.message}` : 'O envio da imagem falhou.');
    }

    return data.secure_url;
  }

  return {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: (body) => request('/auth/logout', { method: 'POST', body, retry: false }),
    forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body }),
    resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),
    listCampaigns: () => request('/campaigns'),
    createCampaign: (body) => request('/campaigns', { method: 'POST', body }),
    joinCampaign: (body) => request('/campaigns/join', { method: 'POST', body }),
    getCampaign: () => request(campaignPath()),
    setShopState: (body) => request(campaignPath('/shop'), { method: 'PATCH', body }),
    listShops: () => request(campaignPath('/shops')),
    createShop: (body) => request(campaignPath('/shops'), { method: 'POST', body }),
    updateShop: (id, body) => request(campaignPath(`/shops/${id}`), { method: 'PATCH', body }),
    listSessions: (params = {}) => request(withQuery(campaignPath('/sessions'), params)),
    startSession: (body) => request(campaignPath('/sessions'), { method: 'POST', body }),
    closeSession: (id, body) => request(campaignPath(`/sessions/${id}/close`), { method: 'POST', body }),
    sessionSummary: (id) => request(campaignPath(`/sessions/${id}/summary`)),
    deleteCampaign: () => request(campaignPath(), { method: 'DELETE' }),
    regenerateInviteCode: () => request(campaignPath('/invite-code'), { method: 'POST' }),
    removeMember: (userId) => request(campaignPath(`/members/${userId}`), { method: 'DELETE' }),
    listItems: (params = {}) => request(withQuery(campaignPath('/items'), params)),
    createItem: (body) => request(campaignPath('/items'), { method: 'POST', body }),
    updateItem: (id, body) => request(campaignPath(`/items/${id}`), { method: 'PUT', body }),
    deleteItem: (id) => request(campaignPath(`/items/${id}`), { method: 'DELETE' }),
    reactivateItem: (id) => request(campaignPath(`/items/${id}/reactivate`), { method: 'PATCH' }),
    listCategories: () => request(campaignPath('/catalog/categories')),
    createCategory: (body) => request(campaignPath('/catalog/categories'), { method: 'POST', body }),
    updateCategory: (id, body) => request(campaignPath(`/catalog/categories/${id}`), { method: 'PUT', body }),
    deleteCategory: (id) => request(campaignPath(`/catalog/categories/${id}`), { method: 'DELETE' }),
    listRarities: () => request(campaignPath('/catalog/rarities')),
    createRarity: (body) => request(campaignPath('/catalog/rarities'), { method: 'POST', body }),
    updateRarity: (id, body) => request(campaignPath(`/catalog/rarities/${id}`), { method: 'PUT', body }),
    deleteRarity: (id) => request(campaignPath(`/catalog/rarities/${id}`), { method: 'DELETE' }),
    listStockMovements: (params = {}) => request(withQuery(campaignPath('/catalog/stock-movements'), params)),
    myCharacter: () => request(campaignPath('/characters/me')),
    createCharacter: (body) => request(campaignPath('/characters'), { method: 'POST', body }),
    updateCharacter: (id, body) => request(campaignPath(`/characters/${id}`), { method: 'PUT', body }),
    listCharacters: () => request(campaignPath('/characters')),
    changeGold: (id, body) => request(campaignPath(`/characters/${id}/gold`), { method: 'PATCH', body }),
    listGoldAudit: (params = {}) => request(withQuery(campaignPath('/characters/gold-audit'), params)),
    myInventory: (params = {}) => request(withQuery(campaignPath('/inventory/me'), params)),
    sellItem: (characterId, body) => request(campaignPath(`/inventory/${characterId}/sell`), { method: 'POST', body }),
    useItem: (characterId, body) => request(campaignPath(`/inventory/${characterId}/use`), { method: 'POST', body }),
    transfer: (characterId, body) => request(campaignPath(`/inventory/${characterId}/give`), { method: 'POST', body }),
    characterGoldLogs: (id, params = {}) => request(withQuery(campaignPath(`/inventory/${id}/gold-logs`), params)),
    listInventoryLogs: (params = {}) => request(withQuery(campaignPath('/inventory/logs'), params)),
    characterInventoryLogs: (id, params = {}) => request(withQuery(campaignPath(`/inventory/${id}/logs`), params)),
    giveGold: (body) => request(campaignPath('/rewards/gold'), { method: 'POST', body }),
    giveItem: (body) => request(campaignPath('/rewards/items'), { method: 'POST', body }),
    createPurchase: (body) => request(campaignPath('/purchases'), { method: 'POST', body }),
    myPurchases: (params = {}) => request(withQuery(campaignPath('/purchases/me'), params)),
    listPurchases: (params = {}) => request(withQuery(campaignPath('/purchases'), params)),
    uploadConfig: () => request(campaignPath('/uploads/config')),
    listItemRequests: () => request(campaignPath('/requests')),
    createItemRequest: (body) => request(campaignPath('/requests'), { method: 'POST', body }),
    cancelItemRequest: (id) => request(campaignPath(`/requests/${id}/cancel`), { method: 'POST' }),
    approveItemRequest: (id, body) => request(campaignPath(`/requests/${id}/approve`), { method: 'POST', body }),
    rejectItemRequest: (id, body) => request(campaignPath(`/requests/${id}/reject`), { method: 'POST', body }),
    uploadItemImage
  };
}
