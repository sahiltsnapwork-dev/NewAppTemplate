// ─── News, Events, Bulk/Block Models ──────────────────────────────────────────
// Maps to Flutter: GqNewsDetails, EventsData, BulkBlockData

export interface GqNewsDetails {
  id?: string;
  headline?: string;
  content?: string;
  source?: string;
  publishedDate?: string;
  link?: string;
  imageUrl?: string;
  isBookmarked?: boolean;
  category?: string;
}

export interface EventsData {
  eventId?: string;
  eventType?: string;
  title?: string;
  description?: string;
  eventDate?: string;
  importance?: string; // High / Medium / Low
  impact?: number;
}

export interface BulkBlockData {
  dealId?: string;
  symbol?: string;
  dealQuantity?: number;
  dealPrice?: number;
  dealDate?: string;
  buyerName?: string;
  sellerName?: string;
  dealValue?: number;
  percentageVolume?: number;
  exchange?: string;
  dealType?: string; // Bulk | Block
}

// ─── Resistance & Support ──────────────────────────────────────────────────────
export interface ResistanceSupport {
  level?: number;
  type?: string; // R1, R2, S1, S2, Pivot
  strength?: number;
}

// ─── Chart / Performance Model ────────────────────────────────────────────────
export interface BarChartModel {
  period?: string;
  value?: number;
  type?: string; // Open | Close | High | Low
  date?: string;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

// ─── Analytics Models ─────────────────────────────────────────────────────────
export interface AnalyticsRatio {
  // Valuation
  peRatio?: number;
  pbRatio?: number;
  pcfRatio?: number;
  evEbitda?: number;
  // Profitability
  roe?: number;
  roa?: number;
  netMargin?: number;
  operatingMargin?: number;
  // Efficiency
  assetTurnover?: number;
  inventoryTurnover?: number;
  // Liquidity
  currentRatio?: number;
  quickRatio?: number;
  // Leverage
  debtToEquity?: number;
  debtToAsset?: number;
  // Growth
  epsGrowth?: number;
  revenueGrowth?: number;
}

export interface PeerData {
  symbol?: string;
  companyName?: string;
  sector?: string;
  ltp?: number;
  changePercent?: number;
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  roe?: number;
}

export interface TrendAnalyticsData {
  period?: string;
  trend?: string; // Bullish | Bearish | Neutral
  strength?: number;
  indicator?: string;
  value?: number;
}

// ─── F&O Model ────────────────────────────────────────────────────────────────
export interface GqFnoModel {
  instrumentType?: string; // FUT | OPT
  expiryDate?: string;
  strikePrice?: number;
  optionType?: string; // CE | PE
  openInterest?: number;
  changeInOI?: number;
  impliedVolatility?: number;
  ltp?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  // Greeks
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

// ─── Expert Tips Model ────────────────────────────────────────────────────────
export interface ExpertTipModel {
  tipId?: string;
  title?: string;
  content?: string;
  expert?: string;
  category?: string;
  createdDate?: string;
  rating?: string;
  analysis?: string;
  targetPrice?: number;
  currentPrice?: number;
  action?: string; // BUY | SELL | HOLD
}

// ─── Company Bio Model ────────────────────────────────────────────────────────
export interface CompanyBioModel {
  companyName?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  employees?: number;
  ceo?: string;
  chairman?: string;
  boardMembers?: string[];
  industry?: string;
  subsector?: string;
  services?: string[];
  aboutText?: string;
}

// ─── MF Holdings Model ────────────────────────────────────────────────────────
export interface MfHoldingData {
  fundName?: string;
  schemeName?: string;
  units?: number;
  value?: number;
  percentageOfNav?: number;
  changeInUnits?: number;
  aum?: number;
  holdingDate?: string;
}

// ─── Financials Models ────────────────────────────────────────────────────────
export interface BalanceSheetData {
  date?: string;
  period?: string;
  totalAssets?: number;
  currentAssets?: number;
  nonCurrentAssets?: number;
  totalLiabilities?: number;
  currentLiabilities?: number;
  longTermDebt?: number;
  equity?: number;
  reserves?: number;
  shareCapital?: number;
  bookValue?: number;
}

export interface PLData {
  date?: string;
  period?: string;
  revenue?: number;
  otherIncome?: number;
  totalIncome?: number;
  expenses?: number;
  ebitda?: number;
  depreciation?: number;
  ebit?: number;
  interestExpense?: number;
  pbt?: number;
  tax?: number;
  netProfit?: number;
  eps?: number;
  dilutedEps?: number;
}

export interface ResultsData {
  date?: string;
  quarter?: string;
  revenue?: number;
  netProfit?: number;
  eps?: number;
  revenueGrowthYoy?: number;
  profitGrowthYoy?: number;
  isPositiveSurprise?: boolean;
}

export interface ShareholdingData {
  date?: string;
  promoterHolding?: number;
  fiiHolding?: number;
  diiHolding?: number;
  publicHolding?: number;
  otherHolding?: number;
  // Change from previous quarter
  promoterChange?: number;
  fiiChange?: number;
  diiChange?: number;
}

// ─── Key Stats / Performance ───────────────────────────────────────────────────
export interface KeyStatsData {
  symbol?: string;
  // Performance metrics for different periods
  oneDay?: number;
  fiveDay?: number;
  oneMonth?: number;
  threeMonth?: number;
  sixMonth?: number;
  oneYear?: number;
  threeYear?: number;
  fiveYear?: number;
  // Volume metrics
  avgVolume10D?: number;
  avgVolume30D?: number;
  // Technical
  rsi?: number;
  macd?: number;
  signal?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  beta?: number;
}
