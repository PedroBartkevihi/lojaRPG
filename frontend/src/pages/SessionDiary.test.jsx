import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import SessionDiary from './SessionDiary.jsx';
import PurchaseHistory from '../components/PurchaseHistory.jsx';

afterEach(() => vi.restoreAllMocks());
it('o Mestre inicia e encerra a sessão; jogadores consultam o resumo', async () => {
  const user = userEvent.setup();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  let active = null;
  const session = { id: 3, number: 1, notes: 'Cripta', startedAt: '2026-10-11T10:00:00Z', endedAt: null };
  const api = {
    listSessions: vi.fn(async () => ({ sessions: active ? [active] : [], active })),
    startSession: vi.fn(async () => { active = session; return { session }; }),
    closeSession: vi.fn(async () => { active = null; return { session: { ...session, endedAt: '2026-10-11T11:00:00Z' } }; }),
    sessionSummary: vi.fn().mockResolvedValue({ session, summary: { spent: 100, purchaseCount: 2, goldChange: 50, movements: [] } })
  };
  const { rerender } = render(<SessionDiary api={api} isMaster showNotice={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sessão' })).toBeEnabled());
  await user.type(screen.getByLabelText('Notas da sessão'), 'Cripta');
  await user.click(screen.getByRole('button', { name: 'Iniciar sessão' }));
  expect(await screen.findByText(/o grupo gastou 1 PO/)).toBeInTheDocument();
  expect(api.startSession).toHaveBeenCalledWith({ notes: 'Cripta' });
  await user.click(screen.getByRole('button', { name: 'Encerrar sessão' }));
  await waitFor(() => expect(api.closeSession).toHaveBeenCalledWith(3, {}));
  rerender(<SessionDiary api={api} isMaster={false} showNotice={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Iniciar sessão' })).not.toBeInTheDocument();
});

it('envia o filtro de sessão ao histórico e retorna à primeira página', async () => {
  const user = userEvent.setup();
  const api = {
    listSessions: vi.fn().mockResolvedValue({ sessions: [{ id: 8, number: 7, endedAt: '2026-10-11' }] }),
    myPurchases: vi.fn().mockResolvedValue({ purchases: [] })
  };
  render(<PurchaseHistory api={api} character={{ id: 1 }} />);
  await screen.findByRole('option', { name: 'Sessão 7' });
  await user.selectOptions(screen.getByLabelText('Filtrar por sessão'), '8');
  await waitFor(() => expect(api.myPurchases).toHaveBeenLastCalledWith({ limit: 25, characterId: 1, sessionId: '8' }));
});
