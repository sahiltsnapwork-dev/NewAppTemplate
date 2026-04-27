import apiClient from '../apiClient';
import type { StockEntity } from '../../domain/entities/StockEntity';
import { mapRawDatumToStockEntity, mapTrendingDatumToStockEntity } from '../mappers/StockMapper';

const SEARCH_PATH = 'searchengine/v2/search?searchText=';
const TRENDING_PATH = '/content-services/trending/stocks';

export class SearchStocksApiDataSource {
  async searchStocks(query: string): Promise<StockEntity[]> {
    const response = await apiClient.get(`${SEARCH_PATH}${encodeURIComponent(query)}`);
    const data = response.data?.data ?? {};
    const results: StockEntity[] = [];

    if (Array.isArray(data.nsebsescript)) {
      for (const u of data.nsebsescript) {
        results.push(mapRawDatumToStockEntity(u, 'Equity'));
      }
    }
    if (Array.isArray(data.futurescrip)) {
      for (const u of data.futurescrip) {
        results.push({
          companyName: u.companyName ?? null,
          displayName: u.displayName ?? u.companyName ?? null,
          symbol: u.symbol ?? null,
          instrumentName: 'Future',
          instrumentId: u.instrumentId ?? null,
          exchange: u.exchange ?? null,
          isin: u.isin ?? null,
          lssymbol: u.lsSymbol ?? u.lssymbol ?? null,
          hslcode: u.exchangescriptid ?? u.symbol ?? '',
          exchangeScriptID: u.exchangescriptid ?? '',
          exchangeName: u.exchangeName ?? null,
          expiryDate: u.expiryDate ?? null,
          FUTSTK: 'FUTSTK',
          nsecode: u.nsecode ?? null,
          lastTradedPrice: u.open_price != null ? String(u.open_price) : '',
          changeValue: '',
          changePercent: '',
          isPositiveChange: 'NOSTRM',
        });
      }
    }
    if (Array.isArray(data.nsefoscrip)) {
      for (const u of data.nsefoscrip) {
        results.push({
          companyName: u.companyName ?? null,
          displayName: u.displayName ?? u.companyName ?? null,
          symbol: u.symbol ?? null,
          instrumentName: 'Options',
          instrumentId: u.instrumentId ?? null,
          exchange: u.exchange ?? null,
          isin: u.isin ?? null,
          lssymbol: u.lsSymbol ?? u.lssymbol ?? null,
          hslcode: u.exchangescriptid ?? u.symbol ?? '',
          exchangeScriptID: u.exchangescriptid ?? '',
          exchangeName: u.exchangeName ?? null,
          expiryDate: u.expiryDate ?? null,
          OPTSTK: 'OPTSTK',
          nsecode: u.nsecode ?? null,
          strikePrice: u.strikePrice ?? null,
          optionType: u.optionType ?? null,
          lastTradedPrice: u.open_price != null ? String(u.open_price) : '',
          changeValue: '',
          changePercent: '',
          isPositiveChange: 'NOSTRM',
        });
      }
    }
    if (Array.isArray(data.sgbscrip)) {
      for (const u of data.sgbscrip) {
        results.push(mapRawDatumToStockEntity(u, 'SGB'));
      }
    }
    if (Array.isArray(data.etfscrip)) {
      for (const u of data.etfscrip) {
        results.push(mapRawDatumToStockEntity(u, 'ETF'));
      }
    }
    if (Array.isArray(data.mfscheme)) {
      for (const u of data.mfscheme) {
        results.push({
          companyName: u.schemeDesc ?? null,
          displayName: u.schemeDesc ?? null,
          symbol: u.schemeID ?? null,
          instrumentName: 'Mutual Funds',
          instrumentId: null,
          exchange: '',
          isin: '',
          lssymbol: '',
          hslcode: '',
          exchangeScriptID: '',
          exchangeName: null,
          schemeID: u.schemeID ?? null,
          navValue: u.navValue ?? null,
          navDate: u.navDate ?? null,
          lastTradedPrice: '',
          changeValue: '',
          changePercent: '',
          isPositiveChange: 'NOSTRM',
        });
      }
    }

    return results;
  }

  async fetchTrendingStocks(): Promise<StockEntity[]> {
    const response = await apiClient.get(TRENDING_PATH);
    const data: unknown[] = response.data?.data ?? [];
    return (data as Array<Record<string, unknown>>).map((u) =>
      mapTrendingDatumToStockEntity(u as Parameters<typeof mapTrendingDatumToStockEntity>[0]),
    );
  }
}
