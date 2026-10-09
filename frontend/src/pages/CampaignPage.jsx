import { useEffect, useState } from 'react';
import { Copy, Crown, DoorOpen, Link2, RefreshCcw, ScrollText, Trash2, UserMinus, Users } from 'lucide-react';

export function formatInviteCode(code = '') {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

function describeCharacters(characters) {
  if (characters.length === 0) {
    return 'Sem personagem ainda';
  }

  return characters.map((character) => `${character.name} (${character.className} nivel ${character.level})`).join(', ');
}

export default function CampaignPage({ api, campaign, user, showNotice, onCampaignsChanged, onLeave }) {
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState(campaign.inviteCode);
  const [loading, setLoading] = useState(true);

  const isMaster = campaign.role === 'MESTRE';
  const inviteLink = inviteCode ? `${window.location.origin}/convite/${inviteCode}` : '';

  async function loadCampaign() {
    setLoading(true);

    try {
      const data = await api.getCampaign();
      setMembers(data.members);
      setInviteCode(data.campaign.inviteCode);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaign();
  }, []);

  async function copy(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      showNotice(message);
    } catch (_error) {
      showNotice('Nao foi possivel copiar. Selecione o texto e copie manualmente.');
    }
  }

  async function regenerateCode() {
    if (!window.confirm('Gerar um novo codigo? O codigo e o link atuais deixam de funcionar.')) {
      return;
    }

    try {
      const data = await api.regenerateInviteCode();
      setInviteCode(data.campaign.inviteCode);
      showNotice('Novo codigo de convite gerado.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function removeMember(member) {
    if (!window.confirm(`Remover ${member.name} da mesa? Os personagens ficam guardados caso volte com um convite.`)) {
      return;
    }

    try {
      const data = await api.removeMember(member.userId);
      await loadCampaign();
      await onCampaignsChanged();
      showNotice(data.message);
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function leaveCampaign() {
    if (!window.confirm(`Sair da mesa "${campaign.name}"?`)) {
      return;
    }

    try {
      const data = await api.removeMember(user.id);
      showNotice(data.message);
      await onLeave();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function deleteCampaign() {
    if (
      !window.confirm(
        `Excluir a mesa "${campaign.name}"? Itens, personagens, compras e historicos dela serao apagados para todos.`
      )
    ) {
      return;
    }

    try {
      const data = await api.deleteCampaign();
      showNotice(data.message);
      await onLeave();
    } catch (error) {
      showNotice(error.message);
    }
  }

  return (
    <section className="content-grid">
      <div className="shop-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Participantes</p>
            <h2>{campaign.name}</h2>
          </div>
          <button className="secondary-action" onClick={loadCampaign}>
            <RefreshCcw size={17} />
            Atualizar
          </button>
        </div>
        <div className="surface-panel">
          <div className="panel-title">
            <Users size={20} />
            <h3>Grupo</h3>
          </div>
          {loading ? (
            <p className="empty-state">Carregando participantes...</p>
          ) : (
            <div className="admin-list">
              {members.map((member) => (
                <div className="admin-row campaign-row" key={member.userId}>
                  <div>
                    <strong>
                      {member.name}
                      {member.userId === user.id ? ' (voce)' : ''}
                    </strong>
                    <span>
                      {member.role === 'MESTRE' && member.characters.length === 0
                        ? 'Conduz a campanha'
                        : describeCharacters(member.characters)}
                    </span>
                  </div>
                  <span className="category-pill">
                    {member.role === 'MESTRE' ? <Crown size={15} /> : <ScrollText size={15} />}
                    {member.role === 'MESTRE' ? 'Mestre' : 'Jogador'}
                  </span>
                  {isMaster && member.role !== 'MESTRE' ? (
                    <button className="danger-action" onClick={() => removeMember(member)}>
                      <UserMinus size={17} />
                      Remover
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="side-column">
        {isMaster ? (
          <>
            <div className="surface-panel">
              <div className="panel-title">
                <Link2 size={20} />
                <h3>Convite</h3>
              </div>
              <p className="form-hint">Envie o link ou o codigo para os jogadores entrarem na mesa.</p>
              <p className="invite-code" aria-label="Codigo de convite">
                {formatInviteCode(inviteCode)}
              </p>
              <input className="invite-link" value={inviteLink} readOnly aria-label="Link de convite" />
              <div className="form-actions">
                <button className="primary-action" onClick={() => copy(inviteLink, 'Link de convite copiado.')}>
                  <Copy size={17} />
                  Copiar link
                </button>
                <button
                  className="secondary-action"
                  onClick={() => copy(formatInviteCode(inviteCode), 'Codigo copiado.')}
                >
                  <Copy size={17} />
                  Copiar codigo
                </button>
                <button className="text-action" onClick={regenerateCode}>
                  <RefreshCcw size={17} />
                  Gerar novo codigo
                </button>
              </div>
            </div>
            <div className="surface-panel">
              <div className="panel-title">
                <Trash2 size={20} />
                <h3>Encerrar mesa</h3>
              </div>
              <p className="form-hint">Apaga a mesa e tudo o que pertence a ela. Nao da para desfazer.</p>
              <button className="danger-action full" onClick={deleteCampaign}>
                <Trash2 size={17} />
                Excluir mesa
              </button>
            </div>
          </>
        ) : (
          <div className="surface-panel">
            <div className="panel-title">
              <DoorOpen size={20} />
              <h3>Sair da mesa</h3>
            </div>
            <p className="form-hint">Seus personagens ficam guardados e voltam se voce entrar de novo com um convite.</p>
            <button className="danger-action full" onClick={leaveCampaign}>
              <DoorOpen size={17} />
              Sair da mesa
            </button>
          </div>
        )}
      </aside>
    </section>
  );
}
