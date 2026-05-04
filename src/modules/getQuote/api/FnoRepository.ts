// ─── F&O (Futures & Options) Repository ──────────────────────────────────────
// Maps to Flutter: GetQuoteFutureOptionRepository + GqFnoModel
// Event: GetQuoteFutureOptionApiEvent

import { apiClient } from './ApiClient';
import { API_ENDPOINTS } from '../constants/ApiConstants';
import { GqFnoModel } from '../models/AnalyticsModels';

export interface OptionsChainRow {
  strikePrice: number;
  expiryDate: string;
  // Call side (CE)
  ceOI?: number;
  ceChangeOI?: number;
  ceVolume?: number;
  ceIV?: number;
  ceLTP?: number;
  ceChangePercent?: number;
  ceDelta?: number;
  ceGamma?: number;
  ceTheta?: number;
  ceVega?: number;
  // Put side (PE)
  peOI?: number;
  peChangeOI?: number;
  peVolume?: number;
  peIV?: number;
  peLTP?: number;
  peChangePercent?: number;
  peDelta?: number;
  peGamma?: number;
  peTheta?: number;
  peVega?: number;
  // ATM indicator
  isATM?: boolean;
}

export interface ExpiryDate {
  date: string;
  label: string;
  daysToExpiry: number;
}

export interface FuturesData {
  symbol: string;
  expiryDate: string;
  ltp: number;
  change: number;
  changePercent: number;
  openInterest: number;
  changeOI: number;
  volume: number;
  bid: number;
  ask: number;
  premium: number;
  lotSize: number;
}

class FnoRepository {
  /**
   * GET /api/quote/{symbol}/options
   * Maps to Flutter: GetQuoteFutureOptionApiEvent (option chain)
   */
  async getOptionsChain(
    symbol: string,
    expiryDate?: string,
  ): Promise<{ chain: OptionsChainRow[]; expiries: ExpiryDate[]; spotPrice: number }> {
    const result = await apiClient.get<{
      chain?: OptionsChainRow[];
      expiries?: ExpiryDate[];
      spotPrice?: number;
    }>(API_ENDPOINTS.GET_OPTIONS_CHAIN(symbol), {
      params: expiryDate ? { expiry: expiryDate } : undefined,
    });

    if (result.success && result.data?.chain) {
      return {
        chain: result.data.chain,
        expiries: result.data.expiries ?? [],
        spotPrice: result.data.spotPrice ?? 0,
      };
    }
    return generateOptionsChainPlaceholder(symbol);
  }

  /**
   * GET /api/quote/{symbol}/futures
   * Maps to Flutter: futures data for FUT instrument type
   */
  async getFutures(symbol: string): Promise<FuturesData[]> {
    const result = await apiClient.get<{ data?: FuturesData[] }>(
      API_ENDPOINTS.GET_FUTURES(symbol),
    );
    return result.data?.data ?? generateFuturesPlaceholder(symbol);
  }

  /**
   * Fetch single F&O contract details
   * Maps to Flutter: GqFnoModel
   */
  async getFnoDetails(
    symbol: string,
    instrumentType: 'FUT' | 'OPT',
    expiryDate: string,
    strikePrice?: number,
    optionType?: 'CE' | 'PE',
  ): Promise<GqFnoModel | null> {
    const result = await apiClient.get<GqFnoModel>(
      API_ENDPOINTS.GET_OPTIONS_CHAIN(symbol),
      {
        params: { instrumentType, expiryDate, strikePrice, optionType },
      },
    );
    return result.data;
  }
}

// ── Placeholder Data Generators ───────────────────────────────────────────────

function generateOptionsChainPlaceholder(symbol: string): {
  chain: OptionsChainRow[];
  expiries: ExpiryDate[];
  spotPrice: number;
} {
  const spotPrice = symbol === 'HDFCBANK' ? 811.0 : 100.0;
  const strikes = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(i => Math.round(spotPrice + i * 20));
  const expiryDate = getNextThursday();

  const chain: OptionsChainRow[] = strikes.map((strike) => {
    const isATM = Math.abs(strike - spotPrice) < 10;
    const moneyness = strike - spotPrice;
    const ceIV = 18 + Math.abs(moneyness) * 0.1;
    const peIV = 18 + Math.abs(moneyness) * 0.12;
    const ceLTP = Math.max(0.05, (spotPrice - strike + 15 + Math.random() * 5));
    const peLTP = Math.max(0.05, (strike - spotPrice + 12 + Math.random() * 5));
    return {
      strikePrice: strike,
      expiryDate,
      ceOI: Math.floor(Math.random() * 5000000 + 500000),
      ceChangeOI: Math.floor((Math.random() - 0.5) * 200000),
      ceVolume: Math.floor(Math.random() * 1000000),
      ceIV: parseFloat(ceIV.toFixed(2)),
      ceLTP: parseFloat(Math.max(0.05, ceLTP).toFixed(2)),
      ceChangePercent: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
      ceDelta: parseFloat(Math.max(0, Math.min(1, 0.5 - moneyness / (spotPrice * 0.1))).toFixed(2)),
      peOI: Math.floor(Math.random() * 5000000 + 500000),
      peChangeOI: Math.floor((Math.random() - 0.5) * 200000),
      peVolume: Math.floor(Math.random() * 1000000),
      peIV: parseFloat(peIV.toFixed(2)),
      peLTP: parseFloat(Math.max(0.05, peLTP).toFixed(2)),
      peChangePercent: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
      peDelta: parseFloat(Math.max(-1, Math.min(0, -0.5 + moneyness / (spotPrice * 0.1))).toFixed(2)),
      isATM,
    };
  });

  return {
    chain,
    spotPrice,
    expiries: [
      { date: expiryDate, label: 'Weekly', daysToExpiry: 7 },
      { date: getNextMonthlyExpiry(), label: 'Monthly', daysToExpiry: 28 },
    ],
  };
}

function generateFuturesPlaceholder(symbol: string): FuturesData[] {
  const spotPrice = symbol === 'HDFCBANK' ? 811.0 : 100.0;
  return [
    {
      symbol,
      expiryDate: getNextThursday(),
      ltp: parseFloat((spotPrice + 2.5).toFixed(2)),
      change: 1.1,
      changePercent: 0.14,
      openInterest: 285000,
      changeOI: 12000,
      volume: 450000,
      bid: parseFloat((spotPrice + 2.4).toFixed(2)),
      ask: parseFloat((spotPrice + 2.6).toFixed(2)),
      premium: 2.5,
      lotSize: 550,
    },
    {
      symbol,
      expiryDate: getNextMonthlyExpiry(),
      ltp: parseFloat((spotPrice + 5.0).toFixed(2)),
      change: 0.8,
      changePercent: 0.10,
      openInterest: 95000,
      changeOI: 3500,
      volume: 125000,
      bid: parseFloat((spotPrice + 4.9).toFixed(2)),
      ask: parseFloat((spotPrice + 5.1).toFixed(2)),
      premium: 5.0,
      lotSize: 550,
    },
  ];
}

function getNextThursday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilThursday);
  return d.toISOString().split('T')[0];
}

function getNextMonthlyExpiry(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  // Last Thursday of next month
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const dayOfWeek = lastDay.getDay();
  lastDay.setDate(lastDay.getDate() - ((dayOfWeek - 4 + 7) % 7));
  return lastDay.toISOString().split('T')[0];
}

export const fnoRepository = new FnoRepository();
