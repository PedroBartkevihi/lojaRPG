import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStoredCampaignId, useActiveCampaign } from './useActiveCampaign.js';
import { landingPath, readPendingInvite, savePendingInvite } from './usePendingInvite.js';
import { useSession } from './useSession.js';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePendingInvite', () => {
  it('guarda o convite por um dia e leva a ele depois de entrar', () => {
    vi.useFakeTimers();
    savePendingInvite('ABCD1234');
    expect(landingPath()).toBe('/convite/ABCD1234');

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(readPendingInvite()).toBeNull();
    expect(landingPath()).toBe('/shop');
  });
});

describe('useSession', () => {
  it('guarda tokens e usuário e esquece tudo ao sair', () => {
    const { result } = renderHook(() => useSession());

    act(() => result.current.storeTokens({ accessToken: 'a1', refreshToken: 'r1', user: { id: 1, name: 'Lia' } }));
    expect(result.current).toMatchObject({ token: 'a1', loggedIn: true, user: { name: 'Lia' } });
    expect(localStorage.getItem('lojaRpgRefreshToken')).toBe('r1');

    act(() => result.current.forgetSession());
    expect(result.current).toMatchObject({ token: null, loggedIn: false, user: null });
    expect(localStorage.length).toBe(0);
  });
});

describe('useActiveCampaign', () => {
  it('abre sozinha a única mesa, carrega os personagens e esquece tudo no reset', async () => {
    const api = {
      listCampaigns: vi.fn().mockResolvedValue({ campaigns: [{ id: 7, name: 'Mesa', role: 'JOGADOR' }] }),
      myCharacter: vi.fn().mockResolvedValue({ characters: [{ id: 3, name: 'Aria' }] })
    };
    const campaignIdRef = { current: null };
    const { result } = renderHook(() => useActiveCampaign({ api, campaignIdRef, loggedIn: true, liveTick: 0, showNotice: vi.fn() }));

    await waitFor(() => expect(result.current.campaign?.id).toBe(7));
    await waitFor(() => expect(result.current.selectedCharacter?.name).toBe('Aria'));
    expect(campaignIdRef.current).toBe(7);
    expect(readStoredCampaignId()).toBe(7);
    expect(result.current.isMaster).toBe(false);

    act(() => result.current.reset());
    expect(result.current.campaign).toBeNull();
    expect(campaignIdRef.current).toBeNull();
    expect(readStoredCampaignId()).toBeNull();
  });
});
