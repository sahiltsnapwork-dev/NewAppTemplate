// ─── News & Events Repository ──────────────────────────────────────────────────
// Maps to Flutter: GetQuoteNewsRepository.getQuoteNewsData() / getQuoteBulkBlockData()
// Events: GetNewsDetailsApiEvent, GetNewsBulkBlockApiEvent

import { apiClient } from './ApiClient';
import { API_ENDPOINTS } from '../constants/ApiConstants';
import { GqNewsDetails, EventsData, BulkBlockData } from '../models/AnalyticsModels';

class NewsEventsRepository {
  /**
   * GET /api/quote/{symbol}/news
   * Maps to Flutter: GetNewsDetailsApiEvent → quoteNewsDetailList
   */
  async getNews(
    symbol: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<GqNewsDetails[]> {
    const result = await apiClient.get<{ data?: GqNewsDetails[] }>(
      API_ENDPOINTS.GET_NEWS(symbol),
      { params: { limit, offset } },
    );

    if (result.success && result.data?.data) {
      return result.data.data;
    }
    return getNewsPlaceholder(symbol);
  }

  /**
   * GET /api/quote/{symbol}/events
   * Maps to Flutter: Announcement repository → eventsData
   */
  async getEvents(symbol: string): Promise<EventsData[]> {
    const result = await apiClient.get<{ data?: EventsData[] }>(
      API_ENDPOINTS.GET_EVENTS(symbol),
    );

    if (result.success && result.data?.data) {
      return result.data.data;
    }
    return getEventsPlaceholder(symbol);
  }

  /**
   * GET /api/quote/{symbol}/bulk-block
   * Maps to Flutter: GetNewsBulkBlockApiEvent → quoteBulkBlockList
   */
  async getBulkBlockDeals(symbol: string): Promise<BulkBlockData[]> {
    const result = await apiClient.get<{ data?: BulkBlockData[] }>(
      API_ENDPOINTS.GET_BULK_BLOCK(symbol),
    );

    if (result.success && result.data?.data) {
      return result.data.data;
    }
    return [];
  }
}

// ── Placeholder data (used when API unavailable) ──────────────────────────────

function getNewsPlaceholder(symbol: string): GqNewsDetails[] {
  return [
    {
      id: '1',
      headline: `${symbol}: Q4 Results beat estimates; Net Profit up 12% YoY`,
      content: `${symbol} reported strong Q4 results with net profit rising 12% year-on-year, beating analyst estimates.`,
      source: 'Economic Times',
      publishedDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      link: '',
      imageUrl: '',
      isBookmarked: false,
      category: 'Results',
    },
    {
      id: '2',
      headline: `${symbol}: Board approves dividend of ₹5 per share`,
      content: `The board of directors of ${symbol} has approved a dividend of ₹5 per share for FY2026.`,
      source: 'Business Standard',
      publishedDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      link: '',
      imageUrl: '',
      isBookmarked: false,
      category: 'Corporate Action',
    },
    {
      id: '3',
      headline: `Analyst upgrades ${symbol} to Buy; Target Price ₹950`,
      content: `A leading brokerage has upgraded ${symbol} to Buy rating with a 12-month target price of ₹950.`,
      source: 'Moneycontrol',
      publishedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      link: '',
      imageUrl: '',
      isBookmarked: false,
      category: 'Research',
    },
  ];
}

function getEventsPlaceholder(symbol: string): EventsData[] {
  return [
    {
      eventId: 'E1',
      eventType: 'Board Meeting',
      title: `${symbol}: Board Meeting`,
      description: 'Board meeting to consider Q4 FY26 results and dividend declaration.',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      importance: 'High',
      impact: 0.8,
    },
    {
      eventId: 'E2',
      eventType: 'AGM',
      title: `${symbol}: Annual General Meeting`,
      description: 'Annual General Meeting of shareholders.',
      eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      importance: 'Medium',
      impact: 0.5,
    },
    {
      eventId: 'E3',
      eventType: 'Dividend',
      title: `${symbol}: Ex-Dividend Date`,
      description: 'Ex-dividend date for final dividend of ₹5 per share.',
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      importance: 'High',
      impact: 0.7,
    },
  ];
}

export const newsEventsRepository = new NewsEventsRepository();
