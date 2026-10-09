import { useState } from 'react';
import { Crown, DoorOpen, Plus, ScrollText, Users } from 'lucide-react';

const ROLE_LABELS = {
  MESTRE: 'Mestre',
  JOGADOR: 'Jogador'
};

export default function CampaignsPage({ api, campaigns, activeCampaignId, onSelect, onCampaignsChanged, showNotice }) {
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState('');

  async function createCampaign(event) {
    event.preventDefault();
    setLoading('create');

    try {
      const data = await api.createCampaign({ name });
      setName('');
      await onCampaignsChanged();
      showNotice(`Mesa "${data.campaign.name}" criada. Envie o convite para os jogadores.`);
      onSelect(data.campaign, '/mesa');
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading('');
    }
  }

  async function joinCampaign(event) {
    event.preventDefault();
    setLoading('join');

    try {
      const data = await api.joinCampaign({ inviteCode });
      setInviteCode('');
      await onCampaignsChanged();
      showNotice(data.message);
      onSelect(data.campaign, '/shop');
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading('');
    }
  }

  return (
    <section className="content-grid">
      <div className="shop-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Suas campanhas</p>
            <h2>Minhas mesas</h2>
          </div>
        </div>
        <div className="surface-panel">
          <div className="panel-title">
            <Users size={20} />
            <h3>Mesas em que voce participa</h3>
          </div>
          <div className="admin-list">
            {campaigns.map((campaign) => (
              <div className="admin-row campaign-row" key={campaign.id}>
                <div>
                  <strong>{campaign.name}</strong>
                  <span>
                    {ROLE_LABELS[campaign.role]} - {campaign.memberCount}{' '}
                    {campaign.memberCount === 1 ? 'participante' : 'participantes'}
                  </span>
                </div>
                {campaign.role === 'MESTRE' ? <Crown size={18} /> : <ScrollText size={18} />}
                <button
                  className={campaign.id === activeCampaignId ? 'secondary-action' : 'primary-action'}
                  onClick={() => onSelect(campaign, '/shop')}
                >
                  <DoorOpen size={17} />
                  {campaign.id === activeCampaignId ? 'Voltar' : 'Abrir'}
                </button>
              </div>
            ))}
            {campaigns.length === 0 && (
              <p className="empty-state">
                Voce ainda nao participa de nenhuma mesa. Crie a sua ou entre com o codigo que o Mestre passou.
              </p>
            )}
          </div>
        </div>
      </div>

      <aside className="side-column">
        <form className="surface-panel stack-form compact-form" onSubmit={joinCampaign}>
          <div className="panel-title">
            <DoorOpen size={20} />
            <h3>Entrar com convite</h3>
          </div>
          <label>
            Codigo de convite
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="ABCD-EFGH"
              autoCapitalize="characters"
              required
            />
          </label>
          <button className="primary-action" disabled={loading === 'join'}>
            <DoorOpen size={17} />
            {loading === 'join' ? 'Entrando...' : 'Entrar na mesa'}
          </button>
        </form>
        <form className="surface-panel stack-form compact-form" onSubmit={createCampaign}>
          <div className="panel-title">
            <Plus size={20} />
            <h3>Criar mesa</h3>
          </div>
          <label>
            Nome da mesa
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
          </label>
          <p className="form-hint">
            Voce sera o Mestre. A mesa comeca com o catalogo de exemplo, que voce pode editar.
          </p>
          <button className="secondary-action" disabled={loading === 'create'}>
            <Plus size={17} />
            {loading === 'create' ? 'Criando...' : 'Criar mesa'}
          </button>
        </form>
      </aside>
    </section>
  );
}
