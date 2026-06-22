import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RevenueTrend from './RevenueTrend';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from '../../store/useStore';

// Mock ECharts to prevent canvas rendering errors in jsdom
vi.mock('echarts-for-react', () => {
  return {
    default: ({ option }: any) => {
      return (
        <div data-testid="echarts-mock">
          Chart Mock - {JSON.stringify(option.series[0].data)}
        </div>
      );
    }
  };
});

// Mock the API client
vi.mock('../../api/client', () => ({
  fetchTrend: vi.fn().mockResolvedValue({
    data: [
      { date: '2015-01-01', revenue: 1000, units: 100 },
      { date: '2015-01-02', revenue: 1100, units: 110 }
    ]
  })
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('RevenueTrend', () => {
  beforeEach(() => {
    queryClient.clear();
    useStore.setState({
      dateFrom: '2015-01-01',
      dateTo: '2016-01-01',
      category: 'ALL',
      stateLocation: 'ALL',
      granularity: 'daily',
      selectedDate: null
    });
  });

  it('renders chart after data is fetched', async () => {
    renderWithProviders(<RevenueTrend />);
    const chart = await screen.findByTestId('echarts-mock');
    expect(chart).toBeInTheDocument();
  });
});