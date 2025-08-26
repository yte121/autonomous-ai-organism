import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateOrganism } from './useCreateOrganism';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import backend from '~backend/client';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('~backend/client', () => ({
  default: {
    organism: {
      create: vi.fn(),
    },
  },
}));

const mockToast = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  (useToast as vi.Mock).mockReturnValue({ toast: mockToast });
});

// Create a wrapper component with QueryClientProvider for the hook
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCreateOrganism', () => {
  it('should initialize with default values', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateOrganism(), { wrapper });

    expect(result.current.name).toBe('');
    expect(result.current.capabilities).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should update name and capabilities', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateOrganism(), { wrapper });

    act(() => {
      result.current.setName('Test Organism');
      result.current.setCapabilities(['learning']);
    });

    expect(result.current.name).toBe('Test Organism');
    expect(result.current.capabilities).toEqual(['learning']);
  });

  it('should not submit if name is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateOrganism(), { wrapper });

    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    act(() => {
      result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(backend.organism.create).not.toHaveBeenCalled();
  });

  it('should handle successful submission', async () => {
    const wrapper = createWrapper();
    const onSuccessCallback = vi.fn();
    const { result } = renderHook(() => useCreateOrganism(onSuccessCallback), { wrapper });

    (backend.organism.create as vi.Mock).mockResolvedValue({ id: '123' });

    act(() => {
      result.current.setName('New Organism');
      result.current.setCapabilities(['testing']);
    });

    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      result.current.handleSubmit(mockEvent);
    });

    expect(backend.organism.create).toHaveBeenCalledWith({
      name: 'New Organism',
      initial_capabilities: ['testing'],
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Organism Created' }));
    expect(onSuccessCallback).toHaveBeenCalled();
    expect(result.current.name).toBe('');
    expect(result.current.capabilities).toEqual([]);
  });

  it('should handle submission failure', async () => {
    const wrapper = createWrapper();
    const onSuccessCallback = vi.fn();
    const { result } = renderHook(() => useCreateOrganism(onSuccessCallback), { wrapper });

    const error = new Error('Creation Failed');
    (backend.organism.create as vi.Mock).mockRejectedValue(error);

    act(() => {
      result.current.setName('Failed Organism');
    });

    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      result.current.handleSubmit(mockEvent);
    });

    expect(backend.organism.create).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Creation Failed',
      description: 'Creation Failed',
      variant: 'destructive',
    }));
    expect(onSuccessCallback).not.toHaveBeenCalled();
    // State should not be reset on failure
    expect(result.current.name).toBe('Failed Organism');
  });
});
