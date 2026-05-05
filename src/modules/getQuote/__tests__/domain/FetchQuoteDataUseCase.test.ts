// Unit tests: FetchQuoteDataUseCase

import { FetchQuoteDataUseCase } from '../../../src/modules/getQuote/domain/useCases/FetchQuoteDataUseCase';
import type { IGetQuoteRepository } from '../../../src/modules/getQuote/domain/repositories/IGetQuoteRepository';
import type { QuoteEntity } from '../../../src/modules/getQuote/domain/entities/QuoteEntity';

const mockQuoteEntity: QuoteEntity = {
  symbol: 'HDFCBANK',
  exchange: 'NSE',
  name: 'HDFC BANK LTD',
  ltp: 811.0,
  changevalue: 1.1,
  percentchange: 0.14,
  isPositiveChange: 'YES',
  netchangeindicator: '+',
  dayhigh: 815.0,
  daylow: 805.0,
  open: 810.0,
  close: 809.9,
  volume: 5000000,
  totalbuyqty: 120000,
  totalsellqty: 95000,
  buyprice1: 810.9,
  buyprice2: 810.8,
  buyprice3: 810.7,
  buyprice4: 810.6,
  buyprice5: 810.5,
  bestbuyqty1: 100,
  bestbuyqty2: 200,
  bestbuyqty3: 150,
  bestbuyqty4: 300,
  bestbuyqty5: 400,
  sellprice1: 811.0,
  sellprice2: 811.1,
  sellprice3: 811.2,
  sellprice4: 811.3,
  sellprice5: 811.4,
  bestsellqty1: 50,
  bestsellqty2: 75,
  bestsellqty3: 100,
  bestsellqty4: 125,
  bestsellqty5: 150,
  ltt: '15:30:00',
  cmotid: 4987,
  peratio: 18.5,
  pb: 2.3,
  eps: 43.8,
  roe: 16.2,
  nsemcap: 618000,
  nse52high: 1794.0,
  nse52low: 1363.55,
  sectorname: 'Banks',
  isincode: 'INE040A01034',
  facevalue: 1.0,
  averagetradedprice: 810.0,
  buynumberoforder1: null,
  buynumberoforder2: null,
  buynumberoforder3: null,
  buynumberoforder4: null,
  buynumberoforder5: null,
  sellnumberoforder1: null,
  sellnumberoforder2: null,
  sellnumberoforder3: null,
  sellnumberoforder4: null,
  sellnumberoforder5: null,
  bsemcap: null,
  nse52high: 1794.0,
  bse52high: null,
  nse52low: 1363.55,
  bse52low: null,
  lowercircuitelimit: null,
  uppercircuitelimit: null,
  registeredstate: null,
  industryname: null,
  divyield: null,
};

describe('FetchQuoteDataUseCase', () => {
  let mockRepo: jest.Mocked<IGetQuoteRepository>;
  let useCase: FetchQuoteDataUseCase;

  beforeEach(() => {
    mockRepo = {
      fetchQuoteData: jest.fn(),
      fetchPerformanceData: jest.fn(),
      fetchExpertTips: jest.fn(),
      fetchResistanceSupport: jest.fn(),
      fetchKeyStats: jest.fn(),
      fetchCompanyBio: jest.fn(),
    };
    useCase = new FetchQuoteDataUseCase(mockRepo);
  });

  it('should call repository fetchQuoteData with correct params', async () => {
    mockRepo.fetchQuoteData.mockResolvedValue(mockQuoteEntity);
    const result = await useCase.execute({ symbol: 'HDFCBANK', exchange: 'NSE' });
    expect(mockRepo.fetchQuoteData).toHaveBeenCalledWith({ symbol: 'HDFCBANK', exchange: 'NSE' });
    expect(result).toEqual(mockQuoteEntity);
  });

  it('should propagate errors from repository', async () => {
    mockRepo.fetchQuoteData.mockRejectedValue(new Error('Network error'));
    await expect(useCase.execute({ symbol: 'HDFCBANK', exchange: 'NSE' })).rejects.toThrow('Network error');
  });

  it('should return entity with ltp and change fields', async () => {
    mockRepo.fetchQuoteData.mockResolvedValue(mockQuoteEntity);
    const result = await useCase.execute({ symbol: 'HDFCBANK', exchange: 'NSE' });
    expect(result.ltp).toBe(811.0);
    expect(result.changevalue).toBe(1.1);
    expect(result.percentchange).toBe(0.14);
  });
});
