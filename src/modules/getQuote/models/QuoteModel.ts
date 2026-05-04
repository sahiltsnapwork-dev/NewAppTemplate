// ─── Quote Models ─────────────────────────────────────────────────────────────
// Maps to Flutter: GqStreamingModel, CompanyQuoteModel
// Bootstrap data source: Hardcoded_responce.json

export interface GqStreamingModel {
  symbol?: string;
  exchange?: string;
  stockType?: string;
  // Price
  ltp?: number;           // lastPrice
  changeValue?: number;   // absolute change
  percentChange?: number; // percentage change
  // Bid/Ask
  buyPrice?: number;
  sellPrice?: number;
  buyQnty?: number;
  sellQnty?: number;
  ltq?: number;           // last traded quantity
  ltt?: string;           // last traded time
  timestamp?: string;
  // OHLC
  openPrice?: number;
  dayHigh?: number;
  dayLow?: number;
  prevClose?: number;
  closePrice?: number;
  atp?: number;           // average trade price
  // Volume
  volume?: number;
  totalBuyQty?: number;
  totalSellQty?: number;
  // Market Status
  netChangeIndicator?: string; // '+' or '-'
  isPositiveChange?: string;   // 'YES' | 'NO'
  // 52-week
  nse52High?: number;
  nse52Low?: number;
  bse52High?: number;
  bse52Low?: number;
  nse52HighDate?: string;
  nse52LowDate?: string;
  bse52HighDate?: string;
  bse52LowDate?: string;
  // Financials
  eps?: number;
  peRatio?: number;
  pb?: number;
  roe?: number;
  divPercentage?: number;
  divAmount?: number;
  faceValue?: number;
  nseMcap?: number;
  bseCap?: number;
  // Circuit limits
  lowerCircuitLimit?: number;
  upperCircuitLimit?: number;
  // Misc
  groupSeries?: string;
  sectorName?: string;
  lotSize?: number;
  isin?: string;
}

export interface CompanyQuoteModel {
  symbol?: string;
  name?: string;
  exchange?: string;
  sector?: string;
  isin?: string;
  instrumentId?: number;
  hslCode?: string;
  isNseListed?: string;
  isBseListed?: string;
  isNseFoListed?: string;
  preopenAllowed?: string;
  gsmFlag?: string;
  gsmStageId?: number;
  gsmSuvMsg?: string;
  scriptStatus?: string;
  // Logo
  companyLogoUrl?: string;
  // Events flag
  eventsFlag?: string;
}

export interface BestBidAsk {
  buyPrice1?: number;
  buyPrice2?: number;
  buyPrice3?: number;
  buyPrice4?: number;
  buyPrice5?: number;
  sellPrice1?: number;
  sellPrice2?: number;
  sellPrice3?: number;
  sellPrice4?: number;
  sellPrice5?: number;
  bestBuyQty1?: number;
  bestBuyQty2?: number;
  bestBuyQty3?: number;
  bestBuyQty4?: number;
  bestBuyQty5?: number;
  bestSellQty1?: number;
  bestSellQty2?: number;
  bestSellQty3?: number;
  bestSellQty4?: number;
  bestSellQty5?: number;
  buyNumberOfOrder1?: number;
  buyNumberOfOrder2?: number;
  buyNumberOfOrder3?: number;
  buyNumberOfOrder4?: number;
  buyNumberOfOrder5?: number;
  sellNumberOfOrder1?: number;
  sellNumberOfOrder2?: number;
  sellNumberOfOrder3?: number;
  sellNumberOfOrder4?: number;
  sellNumberOfOrder5?: number;
}

/**
 * Full quote response (bootstrapped from Hardcoded_responce.json)
 */
export interface FullQuoteResponse extends GqStreamingModel, CompanyQuoteModel, BestBidAsk {
  instrumenttype?: string | null;
  optiontype?: string | null;
  strikeprice?: number | null;
  expirydate?: string | null;
  markettype?: string | null;
  marketlot?: number | null;
  freezequantity?: number | null;
  oi?: number | null;
  previousdayoi?: number | null;
  settlementtype?: string | null;
  cmotid?: number;
  ltas?: string | null;
  fillprice?: number | null;
  emarginflag?: boolean;
  spotallow?: string;
  isnewresearchflag?: string;
}

/** Factory: build GqStreamingModel from raw API/hardcoded JSON */
export function mapToStreamingModel(raw: Record<string, unknown>): GqStreamingModel {
  return {
    symbol:             raw.symbol as string,
    exchange:           raw.exchange as string,
    ltp:                raw.ltp as number,
    changeValue:        raw.changevalue as number,
    percentChange:      raw.percentchange as number,
    buyPrice:           raw.buyprice as number,
    sellPrice:          raw.sellprice as number,
    buyQnty:            raw.buyqnty as number,
    sellQnty:           raw.sellqnty as number,
    ltq:                raw.ltq as number,
    ltt:                raw.ltt as string,
    timestamp:          raw.timestamp as string,
    openPrice:          raw.openprice as number,
    dayHigh:            raw.dayhigh as number,
    dayLow:             raw.daylow as number,
    prevClose:          raw.prevclose as number,
    closePrice:         raw.closeprice as number,
    atp:                raw.atp as number,
    volume:             raw.volume as number,
    totalBuyQty:        raw.totalbuyqty as number,
    totalSellQty:       raw.totalsellqty as number,
    netChangeIndicator: raw.netchangeindicator as string,
    isPositiveChange:   raw.isPositiveChange as string,
    nse52High:          raw.nse52high as number,
    nse52Low:           raw.nse52low as number,
    bse52High:          raw.bse52high as number,
    bse52Low:           raw.bse52low as number,
    nse52HighDate:      raw.nse52highdate as string,
    nse52LowDate:       raw.nse52lowdate as string,
    bse52HighDate:      raw.bse52highdate as string,
    bse52LowDate:       raw.bse52lowdate as string,
    eps:                raw.eps as number,
    peRatio:            raw.peratio as number,
    pb:                 raw.pb as number,
    roe:                raw.roe as number,
    divPercentage:      raw.divpercentage as number,
    divAmount:          raw.divamount as number,
    faceValue:          raw.facevalue as number,
    nseMcap:            raw.nsemcap as number,
    bseCap:             raw.bsecap as number,
    lowerCircuitLimit:  raw.lowercircuitlimit as number,
    upperCircuitLimit:  raw.uppercircuitlimit as number,
    groupSeries:        raw.groupseries as string,
    sectorName:         raw.sectorname as string,
    lotSize:            raw.lotsize as number,
    isin:               raw.isin as string,
  };
}

export function mapToCompanyModel(raw: Record<string, unknown>): CompanyQuoteModel {
  return {
    symbol:          raw.symbol as string,
    name:            raw.name as string,
    exchange:        raw.exchange as string,
    sector:          raw.sectorname as string,
    isin:            raw.isin as string,
    instrumentId:    raw.instrumentid as number,
    hslCode:         raw.hslcode as string,
    isNseListed:     raw.isnselisted as string,
    isBseListed:     raw.isbselisted as string,
    isNseFoListed:   raw.isnsefolisted as string,
    preopenAllowed:  raw.preopenallowed as string,
    gsmFlag:         raw.gsmflag as string,
    gsmStageId:      raw.gsmstageid as number,
    gsmSuvMsg:       raw.gsmsuvmsg as string,
    scriptStatus:    raw.scriptstatus as string,
    companyLogoUrl:  raw.companylogourl as string,
    eventsFlag:      raw.eventsflag as string,
  };
}

export function mapToBestBidAsk(raw: Record<string, unknown>): BestBidAsk {
  return {
    buyPrice1: raw.buyprice1 as number,
    buyPrice2: raw.buyprice2 as number,
    buyPrice3: raw.buyprice3 as number,
    buyPrice4: raw.buyprice4 as number,
    buyPrice5: raw.buyprice5 as number,
    sellPrice1: raw.sellprice1 as number,
    sellPrice2: raw.sellprice2 as number,
    sellPrice3: raw.sellprice3 as number,
    sellPrice4: raw.sellprice4 as number,
    sellPrice5: raw.sellprice5 as number,
    bestBuyQty1: raw.bestbuyqty1 as number,
    bestBuyQty2: raw.bestbuyqty2 as number,
    bestBuyQty3: raw.bestbuyqty3 as number,
    bestBuyQty4: raw.bestbuyqty4 as number,
    bestBuyQty5: raw.bestbuyqty5 as number,
    bestSellQty1: raw.bestsellqty1 as number,
    bestSellQty2: raw.bestsellqty2 as number,
    bestSellQty3: raw.bestsellqty3 as number,
    bestSellQty4: raw.bestsellqty4 as number,
    bestSellQty5: raw.bestsellqty5 as number,
    buyNumberOfOrder1: raw.buynumberoforder1 as number,
    buyNumberOfOrder2: raw.buynumberoforder2 as number,
    buyNumberOfOrder3: raw.buynumberoforder3 as number,
    buyNumberOfOrder4: raw.buynumberoforder4 as number,
    buyNumberOfOrder5: raw.buynumberoforder5 as number,
    sellNumberOfOrder1: raw.sellnumberoforder1 as number,
    sellNumberOfOrder2: raw.sellnumberoforder2 as number,
    sellNumberOfOrder3: raw.sellnumberoforder3 as number,
    sellNumberOfOrder4: raw.sellnumberoforder4 as number,
    sellNumberOfOrder5: raw.sellnumberoforder5 as number,
  };
}
