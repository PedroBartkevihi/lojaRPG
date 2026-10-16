import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTick } from './useLiveTick.js';

function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

beforeEach(() => {
  vi.useFakeTimers();
  setHidden(false);
});

afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
});

describe('useLiveTick', () => {
  it('bate a cada intervalo só com a aba visível e bate ao voltar para a aba', () => {
    const { result } = renderHook(() => useLiveTick(true, 1000));

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current).toBe(3);

    setHidden(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(3);

    setHidden(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toBe(4);
  });

  it('trocar o intervalo conta da última batida, e não do zero', () => {
    const { result, rerender } = renderHook(({ interval }) => useLiveTick(true, interval), { initialProps: { interval: 10000 } });

    act(() => vi.advanceTimersByTime(9000));
    rerender({ interval: 30000 });
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe(0);

    // Com o canal caindo e voltando, antes a contagem recomecava e nunca batia.
    rerender({ interval: 10000 });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current).toBe(2);
  });

  it('continua batendo se o relógio do sistema voltar', () => {
    const { result } = renderHook(() => useLiveTick(true, 10000));

    act(() => vi.advanceTimersByTime(5000));
    vi.setSystemTime(Date.now() - 60 * 60 * 1000);
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current).toBe(6);
  });

  it('não bate sem sessão', () => {
    const { result } = renderHook(() => useLiveTick(false, 1000));

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });
});
