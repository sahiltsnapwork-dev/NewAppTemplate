// Mock Configuration for GetQuote module
//
// IMPORTANT — two tiers of data:
//
// 1. INITIAL DATA (always hardcoded — NOT affected by toggle):
//    fetchQuoteData, fetchPerformanceData, fetchExpertTips,
//    fetchResistanceSupport, fetchKeyStats, fetchCompanyBio
//    → These always return mock JSON so the header / Overview tab
//      is always populated regardless of the Live/Mock toggle.
//
// 2. TAB DATA (controlled by globalMockEnabled toggle):
//    fetchNews, fetchBulkDeals, fetchBlockDeals, fetchAnnouncements,
//    fetchEvents, fetchFnoData
//    → When globalMockEnabled = true  → mock JSON returned
//    → When globalMockEnabled = false → real API called

export interface ApiMockConfig {
  mockEnabled: boolean;
  delayMs?: number;
  mockError?: string | null;
}

export interface MockConfig {
  globalMockEnabled: boolean;
  simulatedDelayMs: number;
  apis: {
    // tab-specific (toggle-controlled)
    fetchNews: ApiMockConfig;
    fetchBulkDeals: ApiMockConfig;
    fetchBlockDeals: ApiMockConfig;
    fetchAnnouncements: ApiMockConfig;
    fetchEvents: ApiMockConfig;
    fetchFnoData: ApiMockConfig;
  };
}

export const mockConfig: MockConfig = {
  globalMockEnabled: true,
  simulatedDelayMs: 500,
  apis: {
    fetchNews:         { mockEnabled: true },
    fetchBulkDeals:    { mockEnabled: true },
    fetchBlockDeals:   { mockEnabled: true },
    fetchAnnouncements:{ mockEnabled: true },
    fetchEvents:       { mockEnabled: true },
    fetchFnoData:      { mockEnabled: true },
  },
};
