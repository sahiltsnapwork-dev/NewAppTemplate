import { searchStocksApi } from '../api/searchService';

export type Datum = {
  companyName?: string;
  displayName?: string;
  symbol?: string;
  instrumentId?: string;
  lssymbol?: string;
};

export async function getSearchStocks(query: string): Promise<Datum[]> {
  const data = await searchStocksApi(query);
  // Flutter model: { success, message, data: [Datum] }
  if (!data) return [];
  const payload = data.data ?? data;
  if (!Array.isArray(payload)) return [];
  return payload.map((d: any) => ({
    companyName: d.companyName ?? d.displayName,
    displayName: d.displayName,
    symbol: d.symbol ?? d.lssymbol,
    instrumentId: d.instrumentId,
    lssymbol: d.lssymbol,
  }));
}
