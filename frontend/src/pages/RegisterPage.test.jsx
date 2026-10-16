import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from './RegisterPage.jsx';

describe('RegisterPage', () => {
  it('pede senha de 8 caracteres e explica a regra das senhas comuns', () => {
    render(<RegisterPage api={{}} onRegister={vi.fn()} onSwitch={vi.fn()} />);

    const password = screen.getByLabelText('Senha');
    expect(password).toHaveAttribute('minLength', '8');
    expect(password).toHaveAccessibleDescription(/Pelo menos 8 caracteres/);
  });

  it('mostra o motivo quando a API recusa a senha', async () => {
    const user = userEvent.setup();
    const api = { register: vi.fn().mockRejectedValue(new Error('Essa senha é muito comum. Escolha outra.')) };
    render(<RegisterPage api={api} onRegister={vi.fn()} onSwitch={vi.fn()} />);

    await user.type(screen.getByLabelText('Nome'), 'Tomas');
    await user.type(screen.getByLabelText('Email'), 'tomas@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Essa senha é muito comum. Escolha outra.')).toBeInTheDocument();
  });
});
