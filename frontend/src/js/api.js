const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function parseResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export function createApi(getToken, onUnauthorized) {
  async function request(path, options = {}) {
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
      if (response.status === 401) {
        onUnauthorized?.();
      }

      throw new Error(data.message || 'Erro ao comunicar com a API.');
    }

    return data;
  }

  return {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST' }),
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
    myCharacter: () => request('/characters/me'),
    createCharacter: (body) => request('/characters', { method: 'POST', body }),
    updateCharacter: (id, body) => request(`/characters/${id}`, { method: 'PUT', body }),
    listCharacters: () => request('/characters'),
    changeGold: (id, body) => request(`/characters/${id}/gold`, { method: 'PATCH', body }),
    myInventory: () => request('/inventory/me'),
    inventoryByCharacter: (id) => request(`/inventory/${id}`),
    createPurchase: (body) => request('/purchases', { method: 'POST', body }),
    myPurchases: () => request('/purchases/me'),
    listPurchases: () => request('/purchases')
  };
}
