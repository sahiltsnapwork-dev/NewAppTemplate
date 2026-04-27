import type { StockEntity } from '../../domain/entities/StockEntity';

interface RawDatum {
  companyName?: string;
  displayName?: string;
  symbol?: string;
  instrumentName?: string;
  instrumentId?: string;
  exchange?: string;
  isin?: string;
  lsSymbol?: string;
  lssymbol?: string;
  hslcode?: string;
  exchangescriptid?: string;
  exchangeName?: string;
  expiryDate?: string;
  FUTSTK?: string;
  nsecode?: string;
  OPTSTK?: string;
  strikePrice?: number;
  optionType?: string;
  schemeID?: string;
  navDate?: string;
  navValue?: number;
  // Real API fields
  open_price?: number;
  searchSymbol?: string;
  normalizeValue?: number;
  // Trending API shape
  name?: string;
  nselistedflag?: string;
  nsesymbol?: string;
  isin_code?: string;
}

export function mapRawDatumToStockEntity(
  raw: RawDatum,
  overrideInstrumentName?: string,
): StockEntity {
  return {
    companyName: raw.companyName ?? raw.name ?? null,
    displayName: raw.displayName ?? raw.name ?? null,
    symbol: raw.symbol ?? raw.hslcode ?? null,
    instrumentName: overrideInstrumentName ?? raw.instrumentName ?? null,
    instrumentId: raw.instrumentId ?? null,
    exchange: raw.exchange ?? null,
    isin: raw.isin ?? null,
    lssymbol: raw.lsSymbol ?? raw.lssymbol ?? null,
    hslcode: raw.hslcode ?? raw.symbol ?? null,
    exchangeScriptID: raw.exchangescriptid ?? raw.nsesymbol ?? '',
    exchangeName: raw.exchangeName ?? null,
    expiryDate: raw.expiryDate ?? null,
    FUTSTK: raw.FUTSTK ?? null,
    nsecode: raw.nsecode ?? null,
    OPTSTK: raw.OPTSTK ?? null,
    strikePrice: raw.strikePrice ?? null,
    optionType: raw.optionType ?? null,
    schemeID: raw.schemeID ?? null,
    navDate: raw.navDate ?? null,
    navValue: raw.navValue ?? null,
    lastTradedPrice: raw.open_price != null ? String(raw.open_price) : '',
    changeValue: '',
    changePercent: '',
    isPositiveChange: 'NOSTRM',
  };
}

interface RawTrendingDatum {
  instrumentId?: string;
  hslcode?: string;
  name?: string;
  nsesymbol?: string;
  nselistedflag?: string;
  isin?: string;
}

export function mapTrendingDatumToStockEntity(raw: RawTrendingDatum): StockEntity {
  const isNseListed = raw.nselistedflag === 'Y';
  return {
    companyName: raw.name ?? null,
    displayName: raw.name ?? null,
    symbol: raw.hslcode ?? null,
    instrumentName: 'Equity',
    instrumentId: raw.instrumentId ?? null,
    exchange: isNseListed ? 'NSE' : 'BSE',
    isin: raw.isin ?? null,
    lssymbol: isNseListed
      ? `item_NSE_${raw.hslcode ?? ''}`
      : `item_BSE_${raw.hslcode ?? ''}`,
    hslcode: raw.hslcode ?? null,
    exchangeScriptID: isNseListed ? (raw.nsesymbol ?? '') : (raw.hslcode ?? ''),
    exchangeName: null,
    lastTradedPrice: '',
    changeValue: '',
    changePercent: '',
    isPositiveChange: 'NOSTRM',
  };
}
