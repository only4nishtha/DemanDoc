import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      activeView: 'Overview',
      dateFrom: '2015-01-01',
      dateTo: '2016-01-01',
      category: 'ALL',
      stateLocation: 'ALL',
      granularity: 'monthly',
      selectedDate: null
    });
  });

  it('should initialize with default state', () => {
    const state = useStore.getState();
    expect(state.activeView).toBe('Overview');
    expect(state.dateFrom).toBe('2015-01-01');
    expect(state.category).toBe('ALL');
  });

  it('should update active view', () => {
    useStore.getState().setActiveView('Promotions');
    expect(useStore.getState().activeView).toBe('Promotions');
  });

  it('should update date range correctly', () => {
    useStore.getState().setDateRange('2014-01-01', '2014-06-30');
    expect(useStore.getState().dateFrom).toBe('2014-01-01');
    expect(useStore.getState().dateTo).toBe('2014-06-30');
  });

  it('should update granularity', () => {
    useStore.getState().setGranularity('daily');
    expect(useStore.getState().granularity).toBe('daily');
  });

  it('should update category and location', () => {
    useStore.getState().setCategory('FOODS');
    useStore.getState().setStateLocation('CA');
    
    expect(useStore.getState().category).toBe('FOODS');
    expect(useStore.getState().stateLocation).toBe('CA');
  });
});