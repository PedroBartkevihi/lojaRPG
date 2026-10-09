import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CampaignsPage from './CampaignsPage.jsx';

const campaigns = [
  { id: 1, name: 'Mesa de demonstração', role: 'JOGADOR', memberCount: 4 },
  { id: 2, name: 'Mesa do Pedro', role: 'MESTRE', memberCount: 1, inviteCode: 'ABCDEFGH' }
];

function renderPage(props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onCampaignsChanged: vi.fn().mockResolvedValue(),
    showNotice: vi.fn()
  };

  render(<CampaignsPage campaigns={campaigns} activeCampaignId={null} {...handlers} {...props} />);
  return handlers;
}

describe('CampaignsPage', () => {
  it('lista as mesas com o papel em cada uma e abre a escolhida', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPage();

    expect(screen.getByText('Jogador - 4 participantes')).toBeInTheDocument();
    expect(screen.getByText('Mestre - 1 participante')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /abrir/i })[1]);

    expect(onSelect).toHaveBeenCalledWith(campaigns[1], '/shop');
  });

  it('entra numa mesa pelo código de convite', async () => {
    const user = userEvent.setup();
    const joined = { id: 3, name: 'Mesa do Caio', role: 'JOGADOR', memberCount: 3 };
    const api = {
      joinCampaign: vi.fn().mockResolvedValue({ message: 'Você entrou na mesa Mesa do Caio.', campaign: joined })
    };
    const { onSelect, onCampaignsChanged, showNotice } = renderPage({ api });

    await user.type(screen.getByLabelText(/código de convite/i), 'abcd-efgh');
    await user.click(screen.getByRole('button', { name: /entrar na mesa/i }));

    expect(api.joinCampaign).toHaveBeenCalledWith({ inviteCode: 'abcd-efgh' });
    expect(onCampaignsChanged).toHaveBeenCalledTimes(1);
    expect(showNotice).toHaveBeenCalledWith('Você entrou na mesa Mesa do Caio.');
    expect(onSelect).toHaveBeenCalledWith(joined, '/shop');
  });

  it('cria mesa e abre a pagina de convite', async () => {
    const user = userEvent.setup();
    const created = { id: 4, name: 'Mesa nova', role: 'MESTRE', memberCount: 1, inviteCode: 'JKLMNPQR' };
    const api = { createCampaign: vi.fn().mockResolvedValue({ campaign: created }) };
    const { onSelect } = renderPage({ api, campaigns: [] });

    expect(screen.getByText(/ainda não participa de nenhuma mesa/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/nome da mesa/i), 'Mesa nova');
    await user.click(screen.getByRole('button', { name: /criar mesa/i }));

    expect(api.createCampaign).toHaveBeenCalledWith({ name: 'Mesa nova' });
    expect(onSelect).toHaveBeenCalledWith(created, '/mesa');
  });
});
