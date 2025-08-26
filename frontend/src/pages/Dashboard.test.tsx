import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { useQuery } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useQuery hook itself
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useQuery: vi.fn(),
  };
});

const useQueryMock = useQuery as vi.Mock;

// A wrapper is needed because the child components use hooks like useQuery
const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Dashboard Page', () => {
  beforeEach(() => {
    useQueryMock.mockClear();
  });

  it('renders the skeleton while loading', () => {
    useQueryMock.mockReturnValue({ isLoading: true });
    render(<Dashboard />, { wrapper });
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  it('renders the error state on error', () => {
    useQueryMock.mockReturnValue({ isError: true, error: new Error('Network Error') });
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('renders the dashboard on success', () => {
    useQueryMock.mockImplementation((options) => {
      if (options.queryKey.includes('organisms')) {
        return {
          isLoading: false,
          isError: false,
          data: { organisms: [{ id: '1', name: 'Org1', generation: 1, capabilities: [], status: 'active' }] }
        };
      }
      if (options.queryKey.includes('tasks')) {
        return {
          isLoading: false,
          isError: false,
          data: { tasks: [{ id: 't1', status: 'completed' }] }
        };
      }
      return { isLoading: false, isError: false, data: {} };
    });

    render(<Dashboard />, { wrapper });

    // Check for titles of sections, which proves the child components are rendering
    expect(screen.getByText('AI Organism Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Active Organisms')).toBeInTheDocument(); // From DashboardStats
    expect(screen.getByText('Recent Activity')).toBeInTheDocument(); // From RecentActivity
    expect(screen.getByText('Organism Status Distribution')).toBeInTheDocument(); // From Chart Card
    expect(screen.getByText('Task Progress Overview')).toBeInTheDocument(); // From Chart Card
  });
});
