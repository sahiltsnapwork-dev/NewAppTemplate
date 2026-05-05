// GetQuoteEventsApiDataSource
// Endpoints verified from invest right Apis.xlsx
// Option Chain: GET /api/v1/searchengine/v2/optionChain/getFNODetails?companySymbol={symbol}  (irmbla)
// Future Search: GET /api/v1/searchengine/v2/search?searchText={symbol} fut  (irmbla)
// Events: GET /getquote/events/{cmotId}  (irmscontenta fallback)

import { irmsContentaClient, irmblaClient } from './apiClient';
import { mockConfig } from '../../mock/mockConfig';
import mockEventsData from '../../mock/responses/mockEventsData.json';
import mockFnoData from '../../mock/responses/mockFnoData.json';
import type { EventDto } from '../dto/EventDto';
import type { FnoDto } from '../dto/FnoDto';

export class GetQuoteEventsApiDataSource {
  async fetchEvents(params: { cmotId: string }): Promise<{ data: EventDto[] }> {
    if (mockConfig.globalMockEnabled && mockConfig.apis.fetchEvents.mockEnabled) {
      await simulateDelay();
      return mockEventsData as { data: EventDto[] };
    }
    const { cmotId } = params;
    const response = await irmsContentaClient.get<{ data: EventDto[] }>(
      `/companyNews/companyCode/${encodeURIComponent(cmotId)}`,
    );
    console.log('[LiveAPI] fetchEvents raw response:', JSON.stringify(response.data).slice(0, 500));
    return response.data;
  }

  async fetchFnoData(params: { symbol: string; exchange: string }): Promise<FnoDto[]> {
    if (mockConfig.globalMockEnabled && mockConfig.apis.fetchFnoData.mockEnabled) {
      await simulateDelay();
      return mockFnoData as FnoDto[];
    }
    const { symbol } = params;
    const response = await irmblaClient.get(
      '/api/v1/searchengine/v2/optionChain/getFNODetails',
      { params: { companySymbol: symbol } },
    );
    console.log('[LiveAPI] fetchFnoData raw response:', JSON.stringify(response.data).slice(0, 800));
    // The irmbla response may wrap data — unwrap if needed
    const raw = response.data;
    const items: FnoDto[] = Array.isArray(raw) ? raw
      : Array.isArray(raw?.data) ? raw.data
      : Array.isArray(raw?.futures) ? [...(raw.futures ?? []), ...(raw.options ?? [])]
      : [];
    return items;
  }
}

function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, mockConfig.simulatedDelayMs));
}
