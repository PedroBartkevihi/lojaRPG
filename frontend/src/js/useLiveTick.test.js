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

  it('não bate sem sessão', () => {
    const { result } = renderHook(() => useLiveTick(false, 1000));

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });
});
