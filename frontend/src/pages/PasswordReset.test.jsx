import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from './ForgotPasswordPage.jsx';
import ResetPasswordPage from './ResetPasswordPage.jsx';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('ForgotPasswordPage', () => {
  it('pede o link e mostra a mesma mensagem da API, sem dizer se a conta existe', async () => {
    const user = userEvent.setup();
    const message = 'Se o e-mail estiver cadastrado, enviamos um link para criar uma senha nova. Ele vale por 30 minutos.';
    const api = { forgotPassword: vi.fn().mockResolvedValue({ message }) };
    render(<ForgotPasswordPage api={api} onBack={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'tomas@exemplo.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'tomas@exemplo.com' });
    expect(await screen.findByRole('status')).toHaveTextContent(message);
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});

describe('ResetPasswordPage', () => {
  it('lê o token do link, tira da barra de endereço e salva a senha nova', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/redefinir-senha#token=abc_DEF-123');
    const api = { resetPassword: vi.fn().mockResolvedValue({ message: 'Senha alterada. Entre com a senha nova.' }) };
    const onDone = vi.fn();
    render(<ResetPasswordPage api={api} onDone={onDone} />);

    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/redefinir-senha');

    await user.type(screen.getByLabelText('Senha nova'), 'farol-da-baia-azul');
    await user.type(screen.getByLabelText('Repita a senha nova'), 'farol-da-baia-azu');
    await user.click(screen.getByRole('button', { name: 'Salvar senha nova' }));
    expect(screen.getByRole('alert')).toHaveTextContent('As duas senhas não são iguais.');
    expect(api.resetPassword).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Repita a senha nova'), 'l');
    await user.click(screen.getByRole('button', { name: 'Salvar senha nova' }));
    expect(api.resetPassword).toHaveBeenCalledWith({ token: 'abc_DEF-123', password: 'farol-da-baia-azul' });
    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada.');

    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('avisa quando o link chega sem token', () => {
    window.history.replaceState(null, '', '/redefinir-senha');
    render(<ResetPasswordPage api={{}} onDone={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Link incompleto');
    expect(screen.getByRole('button', { name: 'Salvar senha nova' })).toBeDisabled();
  });
});
