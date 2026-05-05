// Unit tests: getQuoteSlice

import getQuoteReducer, {
  setSelectedExchange,
  setSelectedChartType,
  setSelectedChartInterval,
  setIsMiniQuote,
  resetQuoteState,
  type GetQuoteState,
} from '../../../src/modules/getQuote/state/getQuoteSlice';
import {
  fetchQuoteData,
  fetchPerformanceData,
  fetchNews,
} from '../../../src/modules/getQuote/state/getQuoteThunks';

describe('getQuoteSlice', () => {
  describe('reducers', () => {
    it('should return initial state', () => {
      const state = getQuoteReducer(undefined, { type: '@@INIT' });
      expect(state.selectedExchange).toBe('NSE');
      expect(state.selectedChartType).toBe('Line');
      expect(state.selectedChartInterval).toBe('1M');
      expect(state.isMiniQuote).toBe(false);
      expect(state.quoteData).toBeNull();
    });

    it('should handle setSelectedExchange', () => {
      const state = getQuoteReducer(undefined, setSelectedExchange('BSE'));
      expect(state.selectedExchange).toBe('BSE');
    });

    it('should handle setSelectedChartType', () => {
      const state = getQuoteReducer(undefined, setSelectedChartType('Bar'));
      expect(state.selectedChartType).toBe('Bar');
    });

    it('should handle setSelectedChartInterval', () => {
      const state = getQuoteReducer(undefined, setSelectedChartInterval('1Y'));
      expect(state.selectedChartInterval).toBe('1Y');
    });

    it('should handle setIsMiniQuote', () => {
      const state = getQuoteReducer(undefined, setIsMiniQuote(true));
      expect(state.isMiniQuote).toBe(true);
    });

    it('should handle resetQuoteState', () => {
      // Set some state first
      let state = getQuoteReducer(undefined, setSelectedExchange('BSE'));
      state = getQuoteReducer(state, resetQuoteState());
      expect(state.selectedExchange).toBe('NSE');
      expect(state.quoteData).toBeNull();
    });
  });

  describe('fetchQuoteData extraReducers', () => {
    it('should set isLoadingQuote true on pending', () => {
      const action = { type: fetchQuoteData.pending.type };
      const state = getQuoteReducer(undefined, action);
      expect(state.isLoadingQuote).toBe(true);
      expect(state.errorQuote).toBeNull();
    });

    it('should set quoteData on fulfilled', () => {
      const mockData = { symbol: 'HDFCBANK', ltp: 811.0 };
      const action = { type: fetchQuoteData.fulfilled.type, payload: mockData };
      const state = getQuoteReducer(undefined, action);
      expect(state.quoteData).toEqual(mockData);
      expect(state.isLoadingQuote).toBe(false);
    });

    it('should set errorQuote on rejected', () => {
      const action = {
        type: fetchQuoteData.rejected.type,
        payload: 'Network error',
      };
      const state = getQuoteReducer(undefined, action);
      expect(state.errorQuote).toBe('Network error');
      expect(state.isLoadingQuote).toBe(false);
    });
  });

  describe('fetchNews extraReducers', () => {
    it('should set isLoadingNews true on pending', () => {
      const action = { type: fetchNews.pending.type };
      const state = getQuoteReducer(undefined, action);
      expect(state.isLoadingNews).toBe(true);
    });

    it('should set news on fulfilled', () => {
      const mockNews = [{ id: '1', headline: 'Test News', source: 'ET' }];
      const action = { type: fetchNews.fulfilled.type, payload: mockNews };
      const state = getQuoteReducer(undefined, action);
      expect(state.news).toEqual(mockNews);
      expect(state.isLoadingNews).toBe(false);
    });
  });
});
