// GetQuoteApiDataSource
// Endpoints from invest right Apis.xlsx (verified)
// irmscontenta.hdfcsec.com/mcontent-services — performance, pivot, company bio
// api.hdfcsec.com — main quote, expert tips, key stats

import { mockConfig } from '../../mock/mockConfig';
import mockQuoteData from '../../mock/responses/mockQuoteData.json';
import mockPerformanceData from '../../mock/responses/mockPerformanceData.json';
import mockExpertTipsData from '../../mock/responses/mockExpertTipsData.json';
import mockResistanceSupportData from '../../mock/responses/mockResistanceSupportData.json';
import mockKeyStatsData from '../../mock/responses/mockKeyStatsData.json';
import mockCompanyBioData from '../../mock/responses/mockCompanyBioData.json';
import type { QuoteDto } from '../dto/QuoteDto';
import type { BarChartDto } from '../dto/BarChartDto';
import type { ExpertTipDto } from '../dto/ExpertTipDto';

// Endpoint paths (verified from Excel)
// Performance:         GET /companyPriceHistorical/exchange/{exchange}/companyCode/{coCode}  (irmscontenta)
// Resistance/Support:  GET /pivotClassic/exchange/{exchange}/companyCode/{coCode}/status/daily  (irmscontenta)
// Company Bio:         GET /compBackground/companyCode/{coCode}  (irmscontenta)
// Main Quote:          GET /api/v1/getquote/equity/{exchange}/{symbol}  (api.hdfcsec.com)
// Expert Tips:         GET /api/v1/getquote/expert-tip/{symbol}  (api.hdfcsec.com)
// Key Stats:           GET /api/v1/getquote/keystats/{exchange}/{symbol}  (api.hdfcsec.com)

// NOTE: All methods below are INITIAL DATA — always hardcoded regardless of toggle.
// The toggle (globalMockEnabled) only controls tab-specific APIs (News, Events, FNO).

export class GetQuoteApiDataSource {
  async fetchQuoteData(params: { symbol: string; exchange: string }): Promise<QuoteDto> {
    // Always hardcoded — header/price data must always be populated
    await simulateDelay();
    return mockQuoteData as QuoteDto;
  }

  async fetchPerformanceData(params: {
    coCode: string | number;
    exchange: string;
    interval?: string;
  }): Promise<BarChartDto[]> {
    // Always hardcoded — Overview chart always populated
    await simulateDelay();
    return mockPerformanceData as BarChartDto[];
  }

  async fetchExpertTips(params: { symbol: string }): Promise<ExpertTipDto | null> {
    // Always hardcoded
    await simulateDelay();
    return mockExpertTipsData as ExpertTipDto;
  }

  async fetchResistanceSupport(params: { coCode: string | number; exchange: string }): Promise<unknown[]> {
    // Always hardcoded
    await simulateDelay();
    return mockResistanceSupportData;
  }

  async fetchKeyStats(params: { symbol: string; exchange: string }): Promise<unknown[]> {
    // Always hardcoded
    await simulateDelay();
    return mockKeyStatsData;
  }

  async fetchCompanyBio(params: { coCode: string | number }): Promise<unknown | null> {
    // Always hardcoded
    await simulateDelay();
    return mockCompanyBioData;
  }
}

function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, mockConfig.simulatedDelayMs));
}
