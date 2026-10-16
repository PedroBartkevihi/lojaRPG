import { createContext, useContext } from 'react';

// Mesa ativa para os componentes da casca do app (topo e abas), sem passar
// mesa, papel e usuario de componente em componente. As paginas ainda recebem
// props; podem passar a ler daqui aos poucos.
export const ActiveCampaignContext = createContext(null);

export function useActiveCampaignContext() {
  const value = useContext(ActiveCampaignContext);

  if (!value) {
    throw new Error('useActiveCampaignContext precisa estar dentro de ActiveCampaignContext.Provider.');
  }

  return value;
}
