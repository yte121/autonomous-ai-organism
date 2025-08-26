import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateTask } from './useCreateTask';
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
      createTask: vi.fn(),
    },
  },
}));

const mockToast = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  (useToast as vi.Mock).mockReturnValue({ toast: mockToast });
});

// Create a wrapper component with QueryClientProvider
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

describe('useCreateTask', () => {
  it('should initialize with default values', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTask(), { wrapper });

    expect(result.current.title).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.complexityLevel).toBe(1);
    expect(result.current.minGeneration).toBe(1);
    expect(result.current.requiredCapabilities).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should update state variables', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTask(), { wrapper });

    act(() => {
      result.current.setTitle('Test Task');
      result.current.setDescription('Test Description');
      result.current.setComplexityLevel(5);
      result.current.setMinGeneration(3);
      result.current.setRequiredCapabilities(['testing']);
    });

    expect(result.current.title).toBe('Test Task');
    expect(result.current.description).toBe('Test Description');
    expect(result.current.complexityLevel).toBe(5);
    expect(result.current.minGeneration).toBe(3);
    expect(result.current.requiredCapabilities).toEqual(['testing']);
  });

  it('should not submit if title or description is empty', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTask(), { wrapper });
    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    act(() => {
      result.current.handleSubmit(mockEvent);
    });
    expect(backend.organism.createTask).not.toHaveBeenCalled();

    act(() => {
      result.current.setTitle('Has Title');
      result.current.handleSubmit(mockEvent);
    });
    expect(backend.organism.createTask).not.toHaveBeenCalled();
  });

  it('should handle successful submission', async () => {
    const wrapper = createWrapper();
    const onSuccessCallback = vi.fn();
    const { result } = renderHook(() => useCreateTask(onSuccessCallback), { wrapper });

    (backend.organism.createTask as vi.Mock).mockResolvedValue({ id: 'task1' });

    act(() => {
      result.current.setTitle('New Task');
      result.current.setDescription('A task to be done');
    });

    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      result.current.handleSubmit(mockEvent);
    });

    expect(backend.organism.createTask).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task Created' }));
    expect(onSuccessCallback).toHaveBeenCalled();
    expect(result.current.title).toBe('');
  });

  it('should handle submission failure', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTask(), { wrapper });

    const error = new Error('Task Creation Failed');
    (backend.organism.createTask as vi.Mock).mockRejectedValue(error);

    act(() => {
      result.current.setTitle('Failed Task');
      result.current.setDescription('This will fail');
    });

    const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      result.current.handleSubmit(mockEvent);
    });

    expect(backend.organism.createTask).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Creation Failed',
      description: 'Task Creation Failed',
    }));
    expect(result.current.title).toBe('Failed Task');
  });
});
