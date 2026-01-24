import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useNetworkStatus', () => {
  const originalNavigator = { ...navigator };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalNavigator.onLine,
    });
  });

  it('should return true when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(false);
  });

  it('should update to false when going offline', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('should update to true when going online', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('should show toast when going offline', async () => {
    const { toast } = await import('sonner');

    renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(toast.error).toHaveBeenCalledWith('Ni internetne povezave', {
      id: 'network-status',
      duration: Infinity,
      description: 'Preverite vaso internetno povezavo',
    });
  });

  it('should show toast when going online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { toast } = await import('sonner');

    renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(toast.success).toHaveBeenCalledWith('Povezava vzpostavljena', {
      id: 'network-status',
      duration: 3000,
    });
  });

  it('should cleanup event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
