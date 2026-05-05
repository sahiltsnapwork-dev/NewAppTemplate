// Unit tests: GetQuoteRepositoryImpl

import { GetQuoteRepositoryImpl } from '../../../src/modules/getQuote/data/repositories/GetQuoteRepositoryImpl';
import type { GetQuoteApiDataSource } from '../../../src/modules/getQuote/data/dataSources/GetQuoteApiDataSource';

describe('GetQuoteRepositoryImpl', () => {
  let mockDataSource: jest.Mocked<GetQuoteApiDataSource>;
  let repo: GetQuoteRepositoryImpl;

  beforeEach(() => {
    mockDataSource = {
      fetchQuoteData: jest.fn(),
      fetchPerformanceData: jest.fn(),
      fetchExpertTips: jest.fn(),
      fetchResistanceSupport: jest.fn(),
      fetchKeyStats: jest.fn(),
      fetchCompanyBio: jest.fn(),
    } as unknown as jest.Mocked<GetQuoteApiDataSource>;
    repo = new GetQuoteRepositoryImpl(mockDataSource);
  });

  describe('fetchQuoteData', () => {
    it('should call data source and return entity', async () => {
      const mockDto = {
        symbol: 'HDFCBANK',
        exchange: 'NSE',
        name: 'HDFC BANK LTD',
        ltp: 811.0,
        changevalue: 1.1,
        percentchange: 0.14,
        netchangeindicator: '+',
        dayhigh: 815.0,
        daylow: 805.0,
        open: 810.0,
        close: 809.9,
        volume: 5000000,
        totalbuyqty: 120000,
        totalsellqty: 95000,
        buyprice1: 810.9, buyprice2: null, buyprice3: null, buyprice4: null, buyprice5: null,
        bestbuyqty1: 100, bestbuyqty2: null, bestbuyqty3: null, bestbuyqty4: null, bestbuyqty5: null,
        sellprice1: 811.0, sellprice2: null, sellprice3: null, sellprice4: null, sellprice5: null,
        bestsellqty1: 50, bestsellqty2: null, bestsellqty3: null, bestsellqty4: null, bestsellqty5: null,
        ltt: '15:30:00',
        cmotid: 4987,
        peratio: 18.5,
        pb: 2.3,
        eps: 43.8,
        roe: 16.2,
        nsemcap: 618000,
        bsemcap: null,
        nse52high: 1794.0,
        bse52high: null,
        nse52low: 1363.55,
        bse52low: null,
        sectorname: 'Banks',
        industryname: null,
        isincode: 'INE040A01034',
        facevalue: 1.0,
        divyield: null,
        averagetradedprice: 810.0,
        registeredstate: null,
        lowercircuitelimit: null,
        uppercircuitelimit: null,
        buynumberoforder1: null, buynumberoforder2: null, buynumberoforder3: null,
        buynumberoforder4: null, buynumberoforder5: null,
        sellnumberoforder1: null, sellnumberoforder2: null, sellnumberoforder3: null,
        sellnumberoforder4: null, sellnumberoforder5: null,
      };
      mockDataSource.fetchQuoteData.mockResolvedValue(mockDto);

      const result = await repo.fetchQuoteData({ symbol: 'HDFCBANK', exchange: 'NSE' });

      expect(mockDataSource.fetchQuoteData).toHaveBeenCalledWith({ symbol: 'HDFCBANK', exchange: 'NSE' });
      expect(result.symbol).toBe('HDFCBANK');
      expect(result.ltp).toBe(811.0);
    });

    it('should propagate errors from data source', async () => {
      mockDataSource.fetchQuoteData.mockRejectedValue(new Error('API error'));
      await expect(repo.fetchQuoteData({ symbol: 'HDFCBANK', exchange: 'NSE' }))
        .rejects.toThrow('API error');
    });
  });

  describe('fetchPerformanceData', () => {
    it('should call data source with correct params', async () => {
      mockDataSource.fetchPerformanceData.mockResolvedValue([]);
      await repo.fetchPerformanceData({ symbol: 'HDFCBANK', exchange: 'NSE', interval: '1M' });
      expect(mockDataSource.fetchPerformanceData).toHaveBeenCalledWith({
        symbol: 'HDFCBANK',
        exchange: 'NSE',
        interval: '1M',
      });
    });
  });
});
