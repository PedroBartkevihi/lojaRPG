import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Compass, X } from 'lucide-react';

const STORAGE_PREFIX = 'lojaRpgGuide:';

function readGuide(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${campaignId}`)) || {};
  } catch (_error) {
    return {};
  }
}

function saveGuide(campaignId, state) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${campaignId}`, JSON.stringify(state));
  } catch (_error) {
    // Sem localStorage (aba privada), o guia so nao lembra o progresso.
  }
}

// O Mestre visitou as abas de itens ou catalogo: conta como revisar.
export function markCatalogReviewed(campaignId) {
  if (campaignId) {
    saveGuide(campaignId, { ...readGuide(campaignId), catalog: true });
  }
}

// Primeiros passos de uma mesa nova. Cada passo marca sozinho a partir dos
// dados que o painel ja carrega e fica marcado (no navegador) mesmo se o dado
// mudar depois: um jogador que gasta todo o ouro nao reabre o guia. Com tudo
// feito, ou dispensado, o guia some.
export default function MasterGuide({ campaign, items, characters, onNavigate }) {
  const campaignId = campaign?.id;
  const [stored, setStored] = useState(() => readGuide(campaignId));

  useEffect(() => {
    setStored(readGuide(campaignId));
  }, [campaignId]);

  const players = Math.max(0, (campaign?.memberCount || 1) - 1);
  const owners = new Set(characters.map((character) => character.userId)).size;
  const signals = useMemo(
    () => ({
      // Um item criado depois da mesa ou tirado da loja mostra que o catalogo
      // de exemplo ja foi mexido. O updatedAt nao serve: muda com o estoque a
      // cada compra ou venda de jogador. Editar um item passa pelas abas, que
      // marcam o passo (markCatalogReviewed).
      catalog: items.some(
        (item) =>
          !item.isActive || new Date(item.createdAt).getTime() - new Date(campaign?.createdAt).getTime() > 60000
      ),
      invite: players > 0,
      characters: players > 0 && owners >= players,
      // So depois de todos terem personagem: senao o ouro do primeiro jogador
      // marcava o passo e o guia sumia antes de o ultimo criar o dele.
      gold: players > 0 && owners >= players && characters.every((character) => character.gold > 0)
    }),
    [items, characters, players, owners, campaign?.createdAt]
  );

  const done = {
    catalog: Boolean(stored.catalog || signals.catalog),
    invite: Boolean(stored.invite || signals.invite),
    characters: Boolean(stored.characters || signals.characters),
    gold: Boolean(stored.gold || signals.gold)
  };
  const allDone = Object.values(done).every(Boolean);

  // Guarda os passos que acabaram de ficar prontos.
  useEffect(() => {
    if (!campaignId) return;
    const current = readGuide(campaignId);
    const next = { ...current };
    let changed = false;

    for (const [key, value] of Object.entries(signals)) {
      if (value && !current[key]) {
        next[key] = true;
        changed = true;
      }
    }

    if (changed) {
      saveGuide(campaignId, next);
      setStored(next);
    }
  }, [campaignId, signals]);

  if (!campaign || campaign.isDemo || stored.dismissed || allDone) {
    return null;
  }

  function dismiss() {
    const next = { ...readGuide(campaignId), dismissed: true };
    saveGuide(campaignId, next);
    setStored(next);
  }

  const steps = [
    {
      key: 'catalog',
      title: 'Revisar o catálogo',
      detail: 'A mesa começa com itens de exemplo: ajuste preços, estoque e o que não fizer sentido na campanha.',
      action: { label: 'Abrir itens', onClick: () => onNavigate('itens') }
    },
    {
      key: 'invite',
      title: 'Convidar os jogadores',
      detail: 'Envie o link ou o código de convite da aba Mesa.',
      action: { label: 'Ver convite', onClick: () => onNavigate('mesa') }
    },
    {
      key: 'characters',
      title: 'Esperar os personagens',
      detail:
        players > 0
          ? `${Math.min(owners, players)} de ${players} ${players === 1 ? 'jogador criou' : 'jogadores criaram'} personagem.`
          : 'Cada jogador cria o personagem na loja depois de entrar.'
    },
    {
      key: 'gold',
      title: 'Dar o ouro inicial',
      detail: 'Use as recompensas abaixo, dividindo entre o grupo ou dando o mesmo valor para cada um.'
    }
  ];
  const completed = steps.filter((step) => done[step.key]).length;

  return (
    <section className="surface-panel master-guide" aria-labelledby="master-guide-title">
      <div className="panel-title">
        <Compass size={20} />
        <h3 id="master-guide-title">Primeiros passos da mesa</h3>
        <span className="guide-progress">
          {completed} de {steps.length}
        </span>
        <button type="button" className="icon-button" onClick={dismiss} title="Dispensar o guia" aria-label="Dispensar o guia">
          <X size={17} />
        </button>
      </div>
      <ol className="guide-steps">
        {steps.map((step) => (
          <li key={step.key} className={done[step.key] ? 'done' : ''}>
            {done[step.key] ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
            <div>
              <strong>
                {step.title}
                <span className="visually-hidden">{done[step.key] ? ' (feito)' : ' (pendente)'}</span>
              </strong>
              <span>{step.detail}</span>
            </div>
            {!done[step.key] && step.action && (
              <button type="button" className="text-action" onClick={step.action.onClick}>
                {step.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
