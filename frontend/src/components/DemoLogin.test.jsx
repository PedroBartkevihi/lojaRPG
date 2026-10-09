import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DemoLogin from './DemoLogin.jsx';

afterEach(() => {
  vi.useRealTimers();
});

describe('DemoLogin', () => {
  it('entra com a conta de jogador da demonstração', async () => {
    const user = userEvent.setup();
    const session = { user: { name: 'Aria' } };
    const api = { login: vi.fn().mockResolvedValue(session) };
    const onLogin = vi.fn();

    render(<DemoLogin api={api} onLogin={onLogin} />);
    await user.click(screen.getByRole('button', { name: /entrar como jogador/i }));

    expect(api.login).toHaveBeenCalledWith({ email: 'aria@lojarpg.local', password: 'jogador123' });
    expect(onLogin).toHaveBeenCalledWith(session);
  });

  it('avisa que a API está acordando quando a entrada demora', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const api = { login: vi.fn(() => new Promise(() => {})) };

    render(<DemoLogin api={api} onLogin={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /entrar como mestre/i }));

    expect(screen.queryByText(/está acordando/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/está acordando/i)).toBeInTheDocument();
  });
});
