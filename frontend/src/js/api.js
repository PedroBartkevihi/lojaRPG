const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function parseResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function createApi(getToken, onUnauthorized, getRefreshToken, onTokenRefresh) {
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
    listItems: (params = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.set(key, value);
        }
      });
      const query = search.toString();
      return request(`/items${query ? `?${query}` : ''}`);
    },
    createItem: (body) => request('/items', { method: 'POST', body }),
    updateItem: (id, body) => request(`/items/${id}`, { method: 'PUT', body }),
    deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),
    reactivateItem: (id) => request(`/items/${id}/reactivate`, { method: 'PATCH' }),
    listCategories: () => request('/catalog/categories'),
    createCategory: (body) => request('/catalog/categories', { method: 'POST', body }),
    updateCategory: (id, body) => request(`/catalog/categories/${id}`, { method: 'PUT', body }),
    deleteCategory: (id) => request(`/catalog/categories/${id}`, { method: 'DELETE' }),
    listRarities: () => request('/catalog/rarities'),
    createRarity: (body) => request('/catalog/rarities', { method: 'POST', body }),
    updateRarity: (id, body) => request(`/catalog/rarities/${id}`, { method: 'PUT', body }),
    deleteRarity: (id) => request(`/catalog/rarities/${id}`, { method: 'DELETE' }),
    listStockMovements: (params = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.set(key, value);
        }
      });
      const query = search.toString();
      return request(`/catalog/stock-movements${query ? `?${query}` : ''}`);
    },
    myCharacter: () => request('/characters/me'),
    createCharacter: (body) => request('/characters', { method: 'POST', body }),
    updateCharacter: (id, body) => request(`/characters/${id}`, { method: 'PUT', body }),
    listCharacters: () => request('/characters'),
    changeGold: (id, body) => request(`/characters/${id}/gold`, { method: 'PATCH', body }),
    listGoldAudit: (params = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.set(key, value);
        }
      });
      const query = search.toString();
      return request(`/characters/gold-audit${query ? `?${query}` : ''}`);
    },
    myInventory: (params = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.set(key, value);
        }
      });
      const query = search.toString();
      return request(`/inventory/me${query ? `?${query}` : ''}`);
    },
    inventoryByCharacter: (id) => request(`/inventory/${id}`),
    createPurchase: (body) => request('/purchases', { method: 'POST', body }),
    myPurchases: (params = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.set(key, value);
        }
      });
      const query = search.toString();
      return request(`/purchases/me${query ? `?${query}` : ''}`);
    },
    listPurchases: () => request('/purchases')
  };
}
