// Domain Entity: QuoteEntity
// Mirrors GqStreamingModel + Hardcoded_response.json fields
// All fields nullable to match API response behavior

export interface QuoteEntity {
  // Identification
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  instrumentid: number | null;
  hslcode: string | null;
  isin: string | null;
  cmotid: number | null;

  // Price Data
  ltp: number | null;           // Last traded price
  changevalue: number | null;   // Absolute change
  percentchange: number | null; // Percentage change
  netchangeindicator: string | null; // '+' or '-'
  isPositiveChange: string | null;

  // OHLC
  openprice: number | null;
  prevclose: number | null;
  closeprice: number | null;
  dayhigh: number | null;
  daylow: number | null;
  atp: number | null;           // Average traded price

  // Volume
  volume: number | null;
  ltq: number | null;           // Last traded quantity
  ltt: string | null;           // Last traded time
  ltas: string | null;
  timestamp: string | null;

  // 52-week
  nse52high: number | null;
  nse52low: number | null;
  bse52high: number | null;
  bse52low: number | null;
  nse52highdate: string | null;
  nse52lowdate: string | null;
  bse52highdate: string | null;
  bse52lowdate: string | null;

  // Market Depth — Buy side
  buyprice: number | null;
  buyprice1: number | null;
  buyprice2: number | null;
  buyprice3: number | null;
  buyprice4: number | null;
  buyprice5: number | null;
  buyqnty: number | null;
  bestbuyqty1: number | null;
  bestbuyqty2: number | null;
  bestbuyqty3: number | null;
  bestbuyqty4: number | null;
  bestbuyqty5: number | null;
  buynumberoforder1: number | null;
  buynumberoforder2: number | null;
  buynumberoforder3: number | null;
  buynumberoforder4: number | null;
  buynumberoforder5: number | null;
  totalbuyqty: number | null;

  // Market Depth — Sell side
  sellprice: number | null;
  sellprice1: number | null;
  sellprice2: number | null;
  sellprice3: number | null;
  sellprice4: number | null;
  sellprice5: number | null;
  sellqnty: number | null;
  bestsellqty1: number | null;
  bestsellqty2: number | null;
  bestsellqty3: number | null;
  bestsellqty4: number | null;
  bestsellqty5: number | null;
  sellnumberoforder1: number | null;
  sellnumberoforder2: number | null;
  sellnumberoforder3: number | null;
  sellnumberoforder4: number | null;
  sellnumberoforder5: number | null;
  totalsellqty: number | null;

  // Fundamental Data
  eps: number | null;
  peratio: number | null;
  pb: number | null;
  roe: number | null;
  divpercentage: number | null;
  divamount: number | null;
  facevalue: number | null;
  nsemcap: number | null;
  bsecap: number | null;
  sectorname: string | null;
  groupseries: string | null;

  // Circuit Limits
  lowercircuitlimit: number | null;
  uppercircuitlimit: number | null;

  // Flags
  ismtfreco: string | null;
  preopenallowed: string | null;
  isbselisted: string | null;
  isnselisted: string | null;
  isnsefolisted: string | null;
  isbsefolisted: string | null;
  emarginflag: boolean | null;
  gsmflag: string | null;
  gsmstageid: number | null;
  gsmsuvmsg: string | null;
  scriptstatus: string | null;
  spotallow: string | null;
  isnewresearchflag: string | null;
  eventsflag: string | null;
  companylogourl: string | null;
  bestbuyflag: number | null;
  bestsellflag: number | null;

  // F&O specific
  instrumenttype: string | null;
  optiontype: string | null;
  strikeprice: number | null;
  expirydate: string | null;
  expirytype: string | null;
  oi: number | null;
  previousdayoi: number | null;
  markettype: string | null;
  lotsize: number | null;
  freezequantity: number | null;
  marketlot: number | null;
  settlementtype: string | null;
  fillprice: number | null;
}
