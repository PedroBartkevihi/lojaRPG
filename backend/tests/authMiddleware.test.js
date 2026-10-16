import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({ env: { jwtSecret: 'segredo-do-teste-do-middleware' } }));
vi.mock('../src/models/userModel.js', () => ({ findSessionUser: vi.fn() }));

const { authenticate } = await import('../src/middlewares/authMiddleware.js');
const { findSessionUser } = await import('../src/models/userModel.js');

function requestWith(token) {
  return { get: () => (token ? `Bearer ${token}` : '') };
}

beforeEach(() => {
  findSessionUser.mockReset();
});

describe('authenticate', () => {
  it('token inválido vira 401', async () => {
    const next = vi.fn();

    await authenticate(requestWith('token-falso'), {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('falha do banco com token válido não vira 401 (e não desloga ninguém)', async () => {
    const token = jwt.sign({ sub: 2 }, 'segredo-do-teste-do-middleware');
    const failure = new Error('Banco indisponível');
    findSessionUser.mockRejectedValue(failure);
    const next = vi.fn();

    await authenticate(requestWith(token), {}, next);

    expect(next).toHaveBeenCalledWith(failure);
  });

  it('com token válido e usuário existente, segue para a rota', async () => {
    const token = jwt.sign({ sub: 2, sv: 1 }, 'segredo-do-teste-do-middleware');
    findSessionUser.mockResolvedValue({ user: { id: 2, name: 'Aria' }, sessionVersion: 1 });
    const request = requestWith(token);
    const next = vi.fn();

    await authenticate(request, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(request.user).toEqual({ id: 2, name: 'Aria' });
  });

  it('token sem versão (emitido antes dela existir) vale como versão 0', async () => {
    const token = jwt.sign({ sub: 2 }, 'segredo-do-teste-do-middleware');
    findSessionUser.mockResolvedValue({ user: { id: 2, name: 'Aria' }, sessionVersion: 0 });
    const next = vi.fn();

    await authenticate(requestWith(token), {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('token de antes da última troca de senha vira 401', async () => {
    const token = jwt.sign({ sub: 2, sv: 0 }, 'segredo-do-teste-do-middleware');
    findSessionUser.mockResolvedValue({ user: { id: 2, name: 'Aria' }, sessionVersion: 1 });
    const request = requestWith(token);
    const next = vi.fn();

    await authenticate(request, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(request.user).toBeUndefined();
  });
});
