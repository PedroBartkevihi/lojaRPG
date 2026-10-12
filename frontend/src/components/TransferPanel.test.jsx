import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import TransferPanel from './TransferPanel.jsx';

afterEach(() => vi.restoreAllMocks());

it('pede confirmação e reutiliza a chave ao repetir uma entrega após falha de rede', async () => {
  const user = userEvent.setup();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const api = {
    getCampaign: vi.fn().mockResolvedValue({ members: [{ characters: [{ id: 1, name: 'Aria' }, { id: 2, name: 'Borin' }] }] }),
    characterGoldLogs: vi.fn().mockResolvedValue({ logs: [] }),
    transfer: vi.fn().mockRejectedValueOnce(new Error('Rede indisponível')).mockResolvedValue({ message: 'Entregue' })
  };
  const onRefresh = vi.fn();
  render(<TransferPanel api={api} character={{ id: 1, gold: 50 }} inventory={[]} onRefresh={onRefresh} showNotice={vi.fn()} />);
  await screen.findByRole('option', { name: 'Borin' });
  expect(screen.queryByRole('option', { name: 'Aria' })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Destinatário'), '2');
  await user.type(screen.getByLabelText('Valor a entregar'), '20');
  await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Rede indisponível');
  await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
  await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  expect(api.transfer.mock.calls[0]).toEqual(api.transfer.mock.calls[1]);
  expect(api.transfer.mock.calls[0][1]).toMatchObject({ targetCharacterId: 2, gold: 20 });
});
