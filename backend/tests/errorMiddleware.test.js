import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middlewares/errorMiddleware.js';
import { ApiError } from '../src/utils/ApiError.js';

function response() {
  const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
  return res;
}

describe('errorHandler', () => {
  it.each(['P2034', 'P2028'])('conflito de transação (%s) vira 409 para tentar de novo', (code) => {
    const res = response();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    errorHandler(Object.assign(new Error('Transaction failed'), { code }), {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Outra operação usava os mesmos dados. Tente de novo.' });
  });

  it('erro da API mantém o status e a mensagem', () => {
    const res = response();

    errorHandler(new ApiError(403, 'Proibido.'), {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Proibido.' });
  });

  it('erro desconhecido vira 500 sem expor detalhes', () => {
    const res = response();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('detalhe interno'), {}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno do servidor.' });
  });
});
