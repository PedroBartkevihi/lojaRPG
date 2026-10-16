import { useCallback, useEffect, useRef, useState } from 'react';

const CAMPAIGN_KEY = 'lojaRpgCampaign';

export function readStoredCampaignId() {
  return Number(localStorage.getItem(CAMPAIGN_KEY)) || null;
}

// Mesa ativa, mesas do usuario e personagens dele na mesa ativa, com as cargas
// e a atualizacao periodica.
//
// A API le a mesa de `campaignIdRef`, que acompanha a tela. O localStorage so
// guarda a escolha para o proximo carregamento: ele e dividido entre as abas,
// e outra aba que trocasse de mesa mudaria a mesa das requisicoes desta.
export function useActiveCampaign({ api, campaignIdRef, loggedIn, liveTick, showNotice }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [campaignId, setCampaignId] = useState(() => campaignIdRef.current);
  const [characters, setCharacters] = useState([]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const showNoticeRef = useRef(showNotice);

  useEffect(() => {
    showNoticeRef.current = showNotice;
  }, [showNotice]);

  const setActiveCampaign = useCallback(
    (id) => {
      campaignIdRef.current = id;
      setCampaignId(id);

      if (id) {
        localStorage.setItem(CAMPAIGN_KEY, String(id));
      } else {
        localStorage.removeItem(CAMPAIGN_KEY);
      }
    },
    [campaignIdRef]
  );

  // Esquece tudo da sessao anterior (saida ou sessao recusada).
  const reset = useCallback(() => {
    setCampaigns([]);
    setCampaignsLoaded(false);
    setActiveCampaign(null);
    setCharacters([]);
    setCharactersLoaded(false);
    setSelectedCharacterId(null);
  }, [setActiveCampaign]);

  const loadCampaigns = useCallback(async () => {
    const data = await api.listCampaigns();
    setCampaigns(data.campaigns);
    setCampaignsLoaded(true);
    return data.campaigns;
  }, [api]);

  // Recarrega os personagens do usuario na mesa ativa (ouro, nivel etc.).
  // Uma resposta que chega depois de trocar de mesa e da mesa anterior: fica de fora.
  const refreshSession = useCallback(async () => {
    const requestedCampaignId = campaignIdRef.current;

    if (!requestedCampaignId) {
      return;
    }

    const data = await api.myCharacter();

    if (campaignIdRef.current !== requestedCampaignId) {
      return;
    }

    const nextCharacters = data.characters || [];
    setCharacters(nextCharacters);
    setCharactersLoaded(true);
    setSelectedCharacterId((current) =>
      current && nextCharacters.some((entry) => entry.id === current) ? current : nextCharacters[0]?.id || null
    );
    setRefreshCount((value) => value + 1);
  }, [api, campaignIdRef]);

  useEffect(() => {
    if (loggedIn) {
      loadCampaigns().catch((error) => showNoticeRef.current(error.message));
    }
  }, [loggedIn, loadCampaigns]);

  useEffect(() => {
    setCharacters([]);
    setCharactersLoaded(false);
    setSelectedCharacterId(null);

    if (loggedIn && campaignId) {
      refreshSession().catch((error) => showNoticeRef.current(error.message));
    }
  }, [loggedIn, campaignId, refreshSession]);

  // A cada batida, recarrega as mesas (alguem pode ter sido removido) e os
  // personagens; a atualizacao da sessao tambem recarrega inventario e compras.
  // Falhas aqui ficam quietas para nao encher a tela de avisos.
  useEffect(() => {
    if (liveTick > 0) {
      loadCampaigns().catch(() => {});
      refreshSession().catch(() => {});
    }
  }, [liveTick, loadCampaigns, refreshSession]);

  const campaign = campaigns.find((entry) => entry.id === campaignId) || null;

  // Esquece a mesa guardada se a pessoa saiu ou foi removida dela, e abre
  // direto a unica mesa de quem so participa de uma.
  useEffect(() => {
    if (!campaignsLoaded) {
      return;
    }

    if (campaignId && !campaign) {
      setActiveCampaign(null);
    } else if (!campaignId && campaigns.length === 1) {
      setActiveCampaign(campaigns[0].id);
    }
  }, [campaignsLoaded, campaignId, campaign, campaigns, setActiveCampaign]);

  const isMaster = campaign?.role === 'MESTRE';

  return {
    campaigns,
    campaignsLoaded,
    campaignId,
    campaign,
    isMaster,
    characters,
    selectedCharacter: characters.find((entry) => entry.id === selectedCharacterId) || characters[0] || null,
    selectedCharacterId,
    setSelectedCharacterId,
    // So depois de a lista chegar: antes disso, "sem personagem" e so carregamento.
    needsCharacter: charactersLoaded && !isMaster && characters.length === 0,
    // Quem so participa de uma mesa: ela abre sozinha, sem passar por /mesas.
    autoSelecting: campaignsLoaded && !campaignId && campaigns.length === 1,
    refreshCount,
    setActiveCampaign,
    loadCampaigns,
    refreshSession,
    reset
  };
}
