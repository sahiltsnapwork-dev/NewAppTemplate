export interface StockEntity {
  companyName: string | null;
  displayName: string | null;
  symbol: string | null;
  instrumentName: string | null;
  instrumentId: string | null;
  exchange: string | null;
  isin: string | null;
  lssymbol: string | null;
  hslcode: string | null;
  exchangeScriptID: string;
  exchangeName: string | null;
  // Equity/ETF
  // Futures
  expiryDate?: string | null;
  FUTSTK?: string | null;
  nsecode?: string | null;
  // Options
  OPTSTK?: string | null;
  strikePrice?: number | null;
  optionType?: string | null;
  // Mutual Funds
  schemeID?: string | null;
  navDate?: string | null;
  navValue?: number | null;
  // Live price (populated from streaming / store)
  lastTradedPrice?: string;
  changeValue?: string;
  changePercent?: string;
  isPositiveChange?: string;
}
