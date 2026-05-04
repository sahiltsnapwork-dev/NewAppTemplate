// ─── Quote Data Repository ─────────────────────────────────────────────────────
// Maps to Flutter: lib/feature/get_quote/repository/getQuoteDataRepository.dart
// Provides core quote data, performance, and key stats

import { apiClient, ApiResponse } from './ApiClient';
import { API_ENDPOINTS } from '../constants/ApiConstants';
import {
  GqStreamingModel,
  CompanyQuoteModel,
  BestBidAsk,
  mapToStreamingModel,
  mapToCompanyModel,
  mapToBestBidAsk,
  FullQuoteResponse,
} from '../models/QuoteModel';
import {
  BarChartModel,
  ResistanceSupport,
  KeyStatsData,
  ExpertTipModel,
} from '../models/AnalyticsModels';
import {
  HARDCODED_STREAMING,
  HARDCODED_COMPANY,
  HARDCODED_BEST_BID_ASK,
} from '../constants/HardcodedData';

export interface QuoteData {
  streaming: GqStreamingModel;
  company: CompanyQuoteModel;
  bidAsk: BestBidAsk;
}

class GetQuoteRepository {
  /**
   * GET /api/quote/equity/{symbol}
   * Maps to Flutter: GetQuoteDataRepository.getGetQuoteData()
   * Falls back to hardcoded bootstrap data on error
   */
  async getQuoteData(symbol: string, exchange: string): Promise<QuoteData> {
    const url = API_ENDPOINTS.GET_QUOTE_EQUITY(symbol);
    const result = await apiClient.get<Record<string, unknown>>(url, {
      params: { exchange },
    });

    if (result.success && result.data) {
      return {
        streaming: mapToStreamingModel(result.data),
        company: mapToCompanyModel(result.data),
        bidAsk: mapToBestBidAsk(result.data),
      };
    }

    // Fallback: bootstrap with hardcoded data
    console.warn('[GetQuoteRepository] Using hardcoded bootstrap data:', result.error);
    return {
      streaming: HARDCODED_STREAMING,
      company: HARDCODED_COMPANY,
      bidAsk: HARDCODED_BEST_BID_ASK,
    };
  }

  /**
   * GET /api/quote/{symbol}/details
   * Maps to Flutter: GetQuoteDataRepository.getGetQuoteData() for full details
   */
  async getQuoteDetails(symbol: string): Promise<ApiResponse<FullQuoteResponse>> {
    return apiClient.get<FullQuoteResponse>(API_ENDPOINTS.GET_QUOTE_DETAILS(symbol));
  }

  /**
   * GET /api/quote/{symbol}/chart?interval=1D&range=1d
   * Maps to Flutter: getQuotePerformanceList chart data
   */
  async getChartData(
    symbol: string,
    interval: string = '1D',
    range: string = '1d',
  ): Promise<BarChartModel[]> {
    const result = await apiClient.get<{ chart?: BarChartModel[] }>(
      API_ENDPOINTS.GET_CHART_DATA(symbol),
      { params: { interval, range } },
    );

    if (result.success && result.data?.chart) {
      return result.data.chart;
    }

    // Return empty placeholder data on error
    return generatePlaceholderChartData(symbol, interval);
  }

  /**
   * GET /api/quote/{symbol}/resistance-support
   * Maps to Flutter: GetQuoteResistanceSupportApiEvent
   */
  async getResistanceSupport(symbol: string): Promise<ResistanceSupport[]> {
    const result = await apiClient.get<{ data?: ResistanceSupport[] }>(
      API_ENDPOINTS.GET_RESISTANCE_SUPPORT(symbol),
    );
    return result.data?.data ?? [];
  }

  /**
   * GET /api/quote/{symbol}/key-stats
   * Maps to Flutter: GetQuoteKeyStatsApiEvent
   */
  async getKeyStats(symbol: string): Promise<KeyStatsData | null> {
    const result = await apiClient.get<KeyStatsData>(API_ENDPOINTS.GET_KEY_STATS(symbol));
    return result.data;
  }

  /**
   * GET /api/quote/{symbol}/expert-tips
   * Maps to Flutter: GetExpertsTipApiEvent
   */
  async getExpertTips(symbol: string): Promise<ExpertTipModel[]> {
    const result = await apiClient.get<{ data?: ExpertTipModel[] }>(
      API_ENDPOINTS.GET_EXPERT_TIPS(symbol),
    );
    return result.data?.data ?? [];
  }
}

/** Generate placeholder OHLCV chart data for fallback */
function generatePlaceholderChartData(symbol: string, interval: string): BarChartModel[] {
  const basePrice = symbol === 'HDFCBANK' ? 811.0 : 100.0;
  const points = interval === '1D' ? 20 : interval === '5D' ? 30 : 40;
  return Array.from({ length: points }, (_, i) => {
    const open = basePrice + (Math.random() - 0.5) * 10;
    const close = open + (Math.random() - 0.5) * 5;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    return {
      period: interval,
      date: new Date(Date.now() - (points - i) * 15 * 60 * 1000).toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      value: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 100000 + 50000),
    };
  });
}

export const getQuoteRepository = new GetQuoteRepository();
