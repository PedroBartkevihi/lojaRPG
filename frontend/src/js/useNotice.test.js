import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotice } from './useNotice.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNotice', () => {
  it('some depois do tempo do aviso', () => {
    const { result } = renderHook(() => useNotice(3500));

    act(() => result.current[1]('Bem-vindo, Aria.'));
    expect(result.current[0]).toBe('Bem-vindo, Aria.');

    act(() => vi.advanceTimersByTime(3500));
    expect(result.current[0]).toBe('');
  });

  it('um aviso novo ganha o tempo inteiro, sem herdar o prazo do anterior', () => {
    const { result } = renderHook(() => useNotice(3500));

    act(() => result.current[1]('Bem-vindo, Aria.'));
    act(() => vi.advanceTimersByTime(2700));
    act(() => result.current[1]('Ouro insuficiente para concluir a compra.'));

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current[0]).toBe('Ouro insuficiente para concluir a compra.');

    act(() => vi.advanceTimersByTime(500));
    expect(result.current[0]).toBe('');
  });
});
