import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCampaignEvents } from './useCampaignEvents.js';

// Canal falso: cada abertura fica pendente ate o teste fechar.
function fakeApi() {
  const opened = [];
  const api = {
    streamCampaignEvents: vi.fn(({ onEvent }) => new Promise((resolve) => opened.push({ onEvent, close: resolve })))
  };
  return { api, opened };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCampaignEvents', () => {
  it('ao reconectar conta uma mudança, porque o que mudou com o canal fechado não chegou', async () => {
    const { api, opened } = fakeApi();
    const { result } = renderHook(() => useCampaignEvents({ api, campaignId: 1, enabled: true }));

    act(() => opened[0].onEvent('ready'));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(0);

    // A API fecha o canal depois de 10 min; o site reabre em 2 s.
    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    await act(async () => opened[0].close());
    act(() => vi.advanceTimersByTime(2000));
    expect(api.streamCampaignEvents).toHaveBeenCalledTimes(2);

    act(() => opened[1].onEvent('ready'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(1);
  });

  it('recarrega quando abre depois de uma tentativa que falhou (aparelho que acorda sem rede)', async () => {
    const { api, opened } = fakeApi();
    api.streamCampaignEvents.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useCampaignEvents({ api, campaignId: 1, enabled: true }));

    await act(async () => {});
    act(() => vi.advanceTimersByTime(2000));
    expect(api.streamCampaignEvents).toHaveBeenCalledTimes(2);

    act(() => opened[0].onEvent('ready'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(1);
  });

  it('canal que cai logo depois de abrir continua com a espera crescente', async () => {
    const { api, opened } = fakeApi();
    renderHook(() => useCampaignEvents({ api, campaignId: 1, enabled: true }));

    for (const [index, wait] of [[0, 2000], [1, 4000], [2, 8000]]) {
      act(() => opened[index].onEvent('ready'));
      act(() => vi.advanceTimersByTime(5000));
      await act(async () => opened[index].close());
      act(() => vi.advanceTimersByTime(wait - 1));
      expect(api.streamCampaignEvents).toHaveBeenCalledTimes(index + 1);
      act(() => vi.advanceTimersByTime(1));
      expect(api.streamCampaignEvents).toHaveBeenCalledTimes(index + 2);
    }
  });
});
