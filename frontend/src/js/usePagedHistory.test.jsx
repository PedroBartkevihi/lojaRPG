import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePagedHistory } from './usePagedHistory.js';

describe('usePagedHistory', () => {
  it('aviso que chega com uma carga em andamento gera mais uma carga ao terminar', async () => {
    const pending = [];
    const loadPage = vi.fn(() => new Promise((resolve) => pending.push(resolve)));
    const { result, rerender } = renderHook(({ refreshKey }) => usePagedHistory(loadPage, refreshKey), { initialProps: { refreshKey: 0 } });
    expect(loadPage).toHaveBeenCalledTimes(1);

    rerender({ refreshKey: 1 });
    expect(loadPage).toHaveBeenCalledTimes(1);

    await act(async () => pending[0]({ entries: [{ id: 1 }], pagination: {} }));
    expect(loadPage).toHaveBeenCalledTimes(2);

    await act(async () => pending[1]({ entries: [{ id: 2 }, { id: 1 }], pagination: {} }));
    expect(result.current.entries.map((entry) => entry.id)).toEqual([2, 1]);
    expect(loadPage).toHaveBeenCalledTimes(2);
  });
});
