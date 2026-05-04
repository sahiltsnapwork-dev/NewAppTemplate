// ─── API Endpoints ─────────────────────────────────────────────────────────────
// Source: Flutter GetQuoteDataRepository + GSD 06_QUICK_REFERENCE.md
// All endpoints validated against Flutter codebase paths

// Base URL — replace with actual backend host in production
export const BASE_URL = 'https://api.hdfcsec.com'; // Production base (HDFC Securities)

// ── Quote Endpoints ──────────────────────────────────────────────────────────
export const API_ENDPOINTS = {
  // Core quote data — maps to Flutter: SEARCH_DETAILS_COMPANY_NEW/{exchange}/companyList/{symbols}
  GET_QUOTE_EQUITY: (symbol: string) =>
    `/api/quote/equity/${symbol}`,

  // Full quote details
  GET_QUOTE_DETAILS: (symbol: string) =>
    `/api/quote/${symbol}/details`,

  // Overview data (key stats + performance)
  GET_QUOTE_OVERVIEW: (symbol: string) =>
    `/api/quote/${symbol}/overview`,

  // Historical chart OHLCV data
  GET_CHART_DATA: (symbol: string) =>
    `/api/quote/${symbol}/chart`,

  // ── Financials ─────────────────────────────────────────────────────────────
  GET_BALANCE_SHEET: (symbol: string) =>
    `/api/quote/${symbol}/balance-sheet`,

  GET_PL_STATEMENT: (symbol: string) =>
    `/api/quote/${symbol}/pl`,

  GET_RESULTS: (symbol: string) =>
    `/api/quote/${symbol}/results`,

  GET_FINANCIAL_RATIOS: (symbol: string) =>
    `/api/quote/${symbol}/ratios`,

  GET_SHAREHOLDING_PATTERN: (symbol: string) =>
    `/api/quote/${symbol}/shareholding`,

  // ── News & Events ──────────────────────────────────────────────────────────
  GET_NEWS: (symbol: string) =>
    `/api/quote/${symbol}/news`,

  GET_EVENTS: (symbol: string) =>
    `/api/quote/${symbol}/events`,

  GET_BULK_BLOCK: (symbol: string) =>
    `/api/quote/${symbol}/bulk-block`,

  // ── Analytics ──────────────────────────────────────────────────────────────
  GET_ANALYTICS_PEERS: (symbol: string) =>
    `/api/quote/${symbol}/peers`,

  GET_ANALYTICS_RATIOS: (symbol: string) =>
    `/api/quote/${symbol}/ratios`,

  GET_TREND_ANALYTICS: (symbol: string) =>
    `/api/quote/${symbol}/trend-analytics`,

  GET_RESISTANCE_SUPPORT: (symbol: string) =>
    `/api/quote/${symbol}/resistance-support`,

  // ── Derivatives ────────────────────────────────────────────────────────────
  GET_OPTIONS_CHAIN: (symbol: string) =>
    `/api/quote/${symbol}/options`,

  GET_FUTURES: (symbol: string) =>
    `/api/quote/${symbol}/futures`,

  // ── Company Info ───────────────────────────────────────────────────────────
  GET_COMPANY_BIO: (symbol: string) =>
    `/api/quote/${symbol}/company-bio`,

  GET_MF_HOLDINGS: (symbol: string) =>
    `/api/quote/${symbol}/mf-holdings`,

  GET_EXPERT_TIPS: (symbol: string) =>
    `/api/quote/${symbol}/expert-tips`,

  // ── Key Statistics ─────────────────────────────────────────────────────────
  GET_KEY_STATS: (symbol: string) =>
    `/api/quote/${symbol}/key-stats`,
} as const;

// ── WebView Chart URLs ─────────────────────────────────────────────────────────
// These are rendered in WebView (not REST API) — matches Flutter InAppWebView usage
export const WEBVIEW_URLS = {
  // TradingView chart widget (publicly accessible)
  TRADING_VIEW_CHART: (symbol: string, exchange: string) =>
    `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${exchange}%3A${symbol}&interval=D&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=Dark&style=1&timezone=Asia%2FKolkata&withdateranges=1&showpopupbutton=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost`,

  // Trendlyne analytics (publicly accessible web page)
  TRENDLYNE_ANALYTICS: (symbol: string) =>
    `https://trendlyne.com/equity/technical-analysis/${symbol}/`,

  // Huffman Trendlyne single-tab stock summary (SWOT / Technical)
  TRENDLYNE_SWOT: (symbol: string) =>
    `https://huffman.trendlyne.com/clientapi/huffman/webview/singletab-stock-summary/${symbol}/#swot`,

  TRENDLYNE_TECHNICAL: (symbol: string) =>
    `https://huffman.trendlyne.com/clientapi/huffman/webview/singletab-stock-summary/${symbol}/#technical`,

  // Screener.in financials (publicly accessible)
  SCREENER_FINANCIALS: (symbol: string) =>
    `https://www.screener.in/company/${symbol}/`,

  // NSE official quote page (publicly accessible)
  NSE_OFFICIAL_QUOTE: (symbol: string) =>
    `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,

  // BSE official quote page (publicly accessible)
  BSE_OFFICIAL_QUOTE: (symbol: string) =>
    `https://www.bseindia.com/stock-share-price/${symbol}/`,
} as const;

// Request timeouts (ms)
export const REQUEST_TIMEOUT = 30000;
export const CHART_REQUEST_TIMEOUT = 15000;

// Chart intervals (maps to Flutter selectedChartInterval)
export const CHART_INTERVALS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'] as const;
export type ChartInterval = typeof CHART_INTERVALS[number];

// Chart types (maps to Flutter selectedChartType)
export const CHART_TYPES = {
  MOUNTAIN: 'M',
  CANDLE: 'C',
  LINE: 'L',
} as const;
export type ChartType = typeof CHART_TYPES[keyof typeof CHART_TYPES];

// Exchange options
export const EXCHANGES = ['NSE', 'BSE'] as const;
export type Exchange = typeof EXCHANGES[number];

// NSE Tab count: 12, BSE Tab count: 10
export const NSE_TABS = [
  'Overview',
  'SWOT Analysis',
  'Future',
  'Option',
  'Technical Analysis',
  'Research Calls',
  'News',
  'Events',
  'Analytics',
  'Financials',
  'MF Holdings',
  'Company Bio',
] as const;

export const BSE_TABS = [
  'Overview',
  'SWOT Analysis',
  'Technical Analysis',
  'Research Calls',
  'News',
  'Events',
  'Analytics',
  'Financials',
  'MF Holdings',
  'Company Bio',
] as const;
