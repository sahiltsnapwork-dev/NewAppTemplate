// ─── Analytics & Financials Repository ────────────────────────────────────────
// Maps to Flutter:
//   GetAnalyticsPeersRepository, GetAnalyticsRatioRepository,
//   GetTrendAnalyticsRepository + financial data repositories

import { apiClient } from './ApiClient';
import { API_ENDPOINTS } from '../constants/ApiConstants';
import {
  AnalyticsRatio,
  PeerData,
  TrendAnalyticsData,
  BalanceSheetData,
  PLData,
  ResultsData,
  ShareholdingData,
  CompanyBioModel,
  MfHoldingData,
} from '../models/AnalyticsModels';

class AnalyticsFinancialsRepository {
  // ── Peers ────────────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/peers
   * Maps to Flutter: GetQuoteAnalyticsPeersApiEvent
   */
  async getPeers(symbol: string): Promise<PeerData[]> {
    const result = await apiClient.get<{ data?: PeerData[] }>(
      API_ENDPOINTS.GET_ANALYTICS_PEERS(symbol),
    );
    return result.data?.data ?? getPeersPlaceholder(symbol);
  }

  // ── Ratios ───────────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/ratios
   * Maps to Flutter: GetQuoteAnalyticsRatioApiEvent
   */
  async getAnalyticsRatios(symbol: string): Promise<AnalyticsRatio | null> {
    const result = await apiClient.get<AnalyticsRatio>(
      API_ENDPOINTS.GET_ANALYTICS_RATIOS(symbol),
    );
    return result.data ?? getRatiosPlaceholder();
  }

  // ── Trend Analytics ──────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/trend-analytics
   * Maps to Flutter: GetTrendAnalyticsApiEvent
   */
  async getTrendAnalytics(symbol: string): Promise<TrendAnalyticsData[]> {
    const result = await apiClient.get<{ data?: TrendAnalyticsData[] }>(
      API_ENDPOINTS.GET_TREND_ANALYTICS(symbol),
    );
    return result.data?.data ?? getTrendPlaceholder();
  }

  // ── Balance Sheet ────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/balance-sheet
   * Maps to Flutter: balencesheet_ui.dart / BalanceSheet data
   */
  async getBalanceSheet(symbol: string): Promise<BalanceSheetData[]> {
    const result = await apiClient.get<{ periods?: BalanceSheetData[] }>(
      API_ENDPOINTS.GET_BALANCE_SHEET(symbol),
    );
    return result.data?.periods ?? getBalanceSheetPlaceholder();
  }

  // ── P&L ──────────────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/pl
   * Maps to Flutter: pl_ui.dart / P&L data
   */
  async getPLStatement(symbol: string): Promise<PLData[]> {
    const result = await apiClient.get<{ periods?: PLData[] }>(
      API_ENDPOINTS.GET_PL_STATEMENT(symbol),
    );
    return result.data?.periods ?? getPLPlaceholder();
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/results
   * Maps to Flutter: results_ui.dart
   */
  async getResults(symbol: string): Promise<ResultsData[]> {
    const result = await apiClient.get<{ data?: ResultsData[] }>(
      API_ENDPOINTS.GET_RESULTS(symbol),
    );
    return result.data?.data ?? getResultsPlaceholder();
  }

  // ── Shareholding Pattern ─────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/shareholding
   * Maps to Flutter: shareholding_pattern_ui.dart
   */
  async getShareholdingPattern(symbol: string): Promise<ShareholdingData[]> {
    const result = await apiClient.get<{ data?: ShareholdingData[] }>(
      API_ENDPOINTS.GET_SHAREHOLDING_PATTERN(symbol),
    );
    return result.data?.data ?? getShareholdingPlaceholder();
  }

  // ── Company Bio ──────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/company-bio
   * Maps to Flutter: company_bio_ui.dart
   */
  async getCompanyBio(symbol: string): Promise<CompanyBioModel | null> {
    const result = await apiClient.get<CompanyBioModel>(
      API_ENDPOINTS.GET_COMPANY_BIO(symbol),
    );
    return result.data ?? getCompanyBioPlaceholder(symbol);
  }

  // ── MF Holdings ──────────────────────────────────────────────────────────────
  /**
   * GET /api/quote/{symbol}/mf-holdings
   * Maps to Flutter: mf_holdings_ui.dart
   */
  async getMFHoldings(symbol: string): Promise<MfHoldingData[]> {
    const result = await apiClient.get<{ data?: MfHoldingData[] }>(
      API_ENDPOINTS.GET_MF_HOLDINGS(symbol),
    );
    return result.data?.data ?? getMFHoldingsPlaceholder(symbol);
  }
}

// ── Placeholder Generators ────────────────────────────────────────────────────

function getPeersPlaceholder(symbol: string): PeerData[] {
  const peers = ['ICICIBANK', 'AXISBANK', 'KOTAKBANK', 'SBIN', 'INDUSINDBK'];
  return peers
    .filter(s => s !== symbol)
    .slice(0, 4)
    .map((s) => ({
      symbol: s,
      companyName: `${s} Ltd`,
      sector: 'Banks',
      ltp: parseFloat((Math.random() * 800 + 300).toFixed(2)),
      changePercent: parseFloat(((Math.random() - 0.5) * 4).toFixed(2)),
      marketCap: parseFloat((Math.random() * 500000 + 100000).toFixed(2)),
      peRatio: parseFloat((Math.random() * 20 + 8).toFixed(2)),
      pbRatio: parseFloat((Math.random() * 4 + 1).toFixed(2)),
      roe: parseFloat((Math.random() * 20 + 10).toFixed(2)),
    }));
}

function getRatiosPlaceholder(): AnalyticsRatio {
  return {
    peRatio: 16.73,
    pbRatio: 2.22,
    roe: 15.02,
    roa: 1.8,
    netMargin: 22.5,
    operatingMargin: 28.3,
    currentRatio: 1.2,
    quickRatio: 0.9,
    debtToEquity: 0.45,
    debtToAsset: 0.31,
    epsGrowth: 12.5,
    revenueGrowth: 18.2,
  };
}

function getTrendPlaceholder(): TrendAnalyticsData[] {
  return [
    { period: 'Short Term', trend: 'Bullish', strength: 65, indicator: 'RSI', value: 58.4 },
    { period: 'Medium Term', trend: 'Neutral', strength: 50, indicator: 'MACD', value: 2.3 },
    { period: 'Long Term', trend: 'Bullish', strength: 72, indicator: 'SMA200', value: 765.0 },
  ];
}

function getBalanceSheetPlaceholder(): BalanceSheetData[] {
  return [
    { date: '2024-03-31', period: 'FY24', totalAssets: 3500000, totalLiabilities: 3100000, equity: 400000, bookValue: 160.5 },
    { date: '2023-03-31', period: 'FY23', totalAssets: 3100000, totalLiabilities: 2750000, equity: 350000, bookValue: 142.0 },
    { date: '2022-03-31', period: 'FY22', totalAssets: 2700000, totalLiabilities: 2400000, equity: 300000, bookValue: 122.5 },
  ];
}

function getPLPlaceholder(): PLData[] {
  return [
    { date: '2024-03-31', period: 'FY24', revenue: 250000, netProfit: 55000, eps: 72.5, ebitda: 90000 },
    { date: '2023-03-31', period: 'FY23', revenue: 210000, netProfit: 46000, eps: 60.8, ebitda: 76000 },
    { date: '2022-03-31', period: 'FY22', revenue: 175000, netProfit: 38000, eps: 50.2, ebitda: 63000 },
  ];
}

function getResultsPlaceholder(): ResultsData[] {
  return [
    { date: '2024-12-31', quarter: 'Q3 FY25', revenue: 68000, netProfit: 16700, eps: 22.0, revenueGrowthYoy: 10.5, profitGrowthYoy: 12.8, isPositiveSurprise: true },
    { date: '2024-09-30', quarter: 'Q2 FY25', revenue: 65200, netProfit: 15500, eps: 20.4, revenueGrowthYoy: 9.2, profitGrowthYoy: 11.0, isPositiveSurprise: false },
    { date: '2024-06-30', quarter: 'Q1 FY25', revenue: 63100, netProfit: 14700, eps: 19.4, revenueGrowthYoy: 8.0, profitGrowthYoy: 9.5, isPositiveSurprise: true },
  ];
}

function getShareholdingPlaceholder(): ShareholdingData[] {
  return [
    { date: '2024-12-31', promoterHolding: 0, fiiHolding: 27.5, diiHolding: 25.2, publicHolding: 47.3, fiiChange: 0.8, diiChange: -0.5 },
    { date: '2024-09-30', promoterHolding: 0, fiiHolding: 26.7, diiHolding: 25.7, publicHolding: 47.6, fiiChange: -0.3, diiChange: 1.2 },
  ];
}

function getCompanyBioPlaceholder(symbol: string): CompanyBioModel {
  return {
    companyName: 'HDFC Bank Limited',
    description: 'HDFC Bank is one of India\'s leading private sector banks, providing a wide range of banking and financial services including commercial and investment banking on the wholesale side and transactional / branch banking on the retail side.',
    website: 'https://www.hdfcbank.com',
    headquarters: 'Mumbai, Maharashtra, India',
    founded: '1994',
    employees: 177000,
    ceo: 'Sashidhar Jagdishan',
    industry: 'Banking & Financial Services',
    subsector: 'Private Sector Banks',
    services: ['Retail Banking', 'Wholesale Banking', 'Investment Banking', 'Wealth Management', 'Insurance'],
  };
}

function getMFHoldingsPlaceholder(symbol: string): MfHoldingData[] {
  return [
    { fundName: 'SBI Blue Chip Fund', schemeName: 'SBI Blue Chip Fund - Regular Plan - Growth', units: 5000000, value: 405500, percentageOfNav: 2.8, aum: 14500000, holdingDate: '2024-12-31' },
    { fundName: 'ICICI Pru Bluechip Fund', schemeName: 'ICICI Prudential Bluechip Fund - Growth', units: 4200000, value: 340620, percentageOfNav: 3.1, aum: 11000000, holdingDate: '2024-12-31' },
    { fundName: 'Mirae Asset Large Cap Fund', schemeName: 'Mirae Asset Large Cap Fund - Regular Plan - Growth', units: 3800000, value: 308180, percentageOfNav: 2.5, aum: 12300000, holdingDate: '2024-12-31' },
  ];
}

export const analyticsFinancialsRepository = new AnalyticsFinancialsRepository();
