// GetQuoteNewsApiDataSource
// Endpoints verified from invest right Apis.xlsx
// Headlines:  GET /companyNews/companyCode/{coCode}  (irmscontenta)
// Bulk Deals: GET /bulkBlockDeal/companyCode/{coCode}/exchange/{exchange}/bulk/recordCount/{n}
// Block Deals: GET /bulkAndBlockDeal/companyCode/{coCode}/exchange/{exchange}/option/block/recordCount/{n}
// Announcements: same pattern (use news endpoint as fallback)

import { irmsContentaClient } from './apiClient';
import { mockConfig } from '../../mock/mockConfig';
import mockNewsData from '../../mock/responses/mockNewsData.json';
import mockBulkBlockData from '../../mock/responses/mockBulkBlockData.json';
import type { NewsDto } from '../dto/NewsDto';
import type { BulkBlockDto } from '../dto/BulkBlockDto';

export class GetQuoteNewsApiDataSource {
  async fetchNews(params: { cmotId: string }): Promise<{ data: NewsDto[] }> {
    if (mockConfig.globalMockEnabled && mockConfig.apis.fetchNews.mockEnabled) {
      await simulateDelay();
      return mockNewsData as { data: NewsDto[] };
    }
    const { cmotId } = params;
    const response = await irmsContentaClient.get<{ data: NewsDto[] }>(
      `/companyNews/companyCode/${encodeURIComponent(cmotId)}`,
    );
    console.log('[LiveAPI] fetchNews raw response:', JSON.stringify(response.data).slice(0, 500));
    return response.data;
  }

  async fetchBulkDeals(params: {
    cmotId: string;
    exchange: string;
    perPage?: string;
  }): Promise<{ data: BulkBlockDto[] }> {
    if (mockConfig.globalMockEnabled && mockConfig.apis.fetchBulkDeals.mockEnabled) {
      await simulateDelay();
      return mockBulkBlockData as { data: BulkBlockDto[] };
    }
    const { cmotId, exchange, perPage = '10' } = params;
    const response = await irmsContentaClient.get<{ data: BulkBlockDto[] }>(
      `/bulkBlockDeal/companyCode/${encodeURIComponent(cmotId)}/exchange/${encodeURIComponent(exchange)}/bulk/recordCount/${perPage}`,
    );
    console.log('[LiveAPI] fetchBulkDeals raw response:', JSON.stringify(response.data).slice(0, 500));
    return response.data;
  }

  async fetchBlockDeals(params: {
    cmotId: string;
    exchange: string;
    perPage?: string;
  }): Promise<{ data: BulkBlockDto[] }> {
    if (mockConfig.globalMockEnabled && mockConfig.apis.fetchBlockDeals.mockEnabled) {
      await simulateDelay();
      return mockBulkBlockData as { data: BulkBlockDto[] };
    }
    const { cmotId, exchange, perPage = '10' } = params;
    const response = await irmsContentaClient.get<{ data: BulkBlockDto[] }>(
      `/bulkAndBlockDeal/companyCode/${encodeURIComponent(cmotId)}/exchange/${encodeURIComponent(exchange)}/option/block/recordCount/${perPage}`,
    );
    console.log('[LiveAPI] fetchBlockDeals raw response:', JSON.stringify(response.data).slice(0, 500));
    return response.data;
  }

  async fetchAnnouncements(params: {
    cmotId: string;
    exchange: string;
  }): Promise<{ data: NewsDto[] }> {
    if (mockConfig.globalMockEnabled && mockConfig.apis.fetchAnnouncements.mockEnabled) {
      await simulateDelay();
      return mockNewsData as { data: NewsDto[] };
    }
    const { cmotId } = params;
    // Announcements use the same company news endpoint
    const response = await irmsContentaClient.get<{ data: NewsDto[] }>(
      `/companyNews/companyCode/${encodeURIComponent(cmotId)}`,
    );
    console.log('[LiveAPI] fetchAnnouncements raw response:', JSON.stringify(response.data).slice(0, 500));
    return response.data;
  }
}

function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, mockConfig.simulatedDelayMs));
}
