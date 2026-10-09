const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function parseResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

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
export function createApi(getToken, onUnauthorized, getRefreshToken, onTokenRefresh, getCampaignId) {
  const campaignPath = (path = '') => `/campaigns/${getCampaignId?.()}${path}`;

  async function request(path, options = {}) {
    const retry = options.retry !== false;
    const headers = {
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

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body
    });
    const data = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401 && retry && path !== '/auth/refresh') {
        const refreshToken = getRefreshToken?.();

        if (refreshToken) {
          try {
            const refreshed = await request('/auth/refresh', {
              method: 'POST',
              body: { refreshToken },
              retry: false
            });
            onTokenRefresh?.(refreshed);
            return request(path, options);
          } catch (_refreshError) {
            onUnauthorized?.();
          }
        } else {
          onUnauthorized?.();
        }
      } else if (response.status === 401) {
        onUnauthorized?.();
      }

      throw new Error(data.message || 'Erro ao comunicar com a API.');
    }

    return data;
  }

  return {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    refresh: (body) => request('/auth/refresh', { method: 'POST', body, retry: false }),
    logout: (body) => request('/auth/logout', { method: 'POST', body, retry: false }),
    me: () => request('/auth/me'),
    listCampaigns: () => request('/campaigns'),
    createCampaign: (body) => request('/campaigns', { method: 'POST', body }),
    joinCampaign: (body) => request('/campaigns/join', { method: 'POST', body }),
    getCampaign: () => request(campaignPath()),
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
    inventoryByCharacter: (id) => request(campaignPath(`/inventory/${id}`)),
    sellItem: (characterId, body) => request(campaignPath(`/inventory/${characterId}/sell`), { method: 'POST', body }),
    useItem: (characterId, body) => request(campaignPath(`/inventory/${characterId}/use`), { method: 'POST', body }),
    listInventoryLogs: () => request(campaignPath('/inventory/logs')),
    giveGold: (body) => request(campaignPath('/rewards/gold'), { method: 'POST', body }),
    giveItem: (body) => request(campaignPath('/rewards/items'), { method: 'POST', body }),
    createPurchase: (body) => request(campaignPath('/purchases'), { method: 'POST', body }),
    myPurchases: (params = {}) => request(withQuery(campaignPath('/purchases/me'), params)),
    listPurchases: () => request(campaignPath('/purchases'))
  };
}
