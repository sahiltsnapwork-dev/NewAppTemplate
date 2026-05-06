// Mock Configuration
// Global flag: set USE_MOCK_DATA = true to enable all mocks
// Per-API overrides allow toggling individual endpoints

import type { MarketStatus, OrderRequestResult } from '../domain/entities/MarketStatus';

// ── Global Mock Toggle ────────────────────────────────────────────────────────
// Mutable at runtime — toggled from the HomeScreen UI
let _useMockData = true;

/** Read the current global mock flag */
export const isMockEnabled = (): boolean => _useMockData;

/** Toggle mock mode on/off and update all per-API flags */
export const setMockEnabled = (enabled: boolean): void => {
  _useMockData = enabled;
  const keys = Object.keys(MOCK_CONFIG) as Array<keyof typeof MOCK_CONFIG>;
  keys.forEach((key) => {
    (MOCK_CONFIG[key] as { mockEnabled: boolean }).mockEnabled = enabled;
  });
};

// Keep the legacy export pointing to the live value via getter
// (use isMockEnabled() for runtime checks in data sources)
export const USE_MOCK_DATA = true; // initial default — data sources use isMockEnabled()

// ── Per-API Mock Config ────────────────────────────────────────────────────────
export const MOCK_CONFIG: {
  [K in
    | 'ORDER_BOOK'
    | 'TRADE_BOOK'
    | 'POSITIONS'
    | 'MARKET_STATUS'
    | 'CANCEL_ORDER'
    | 'MODIFY_ORDER'
    | 'CONFIRM_ORDER'
    | 'CONVERT_TO_DELIVERY'
    | 'SIP']: { mockEnabled: boolean; delayMs: number; mockError: string | null };
} = {
  ORDER_BOOK: { mockEnabled: true, delayMs: 500, mockError: null },
  TRADE_BOOK: { mockEnabled: true, delayMs: 400, mockError: null },
  POSITIONS: { mockEnabled: true, delayMs: 600, mockError: null },
  MARKET_STATUS: { mockEnabled: true, delayMs: 200, mockError: null },
  CANCEL_ORDER: { mockEnabled: true, delayMs: 800, mockError: null },
  MODIFY_ORDER: { mockEnabled: true, delayMs: 800, mockError: null },
  CONFIRM_ORDER: { mockEnabled: true, delayMs: 600, mockError: null },
  CONVERT_TO_DELIVERY: { mockEnabled: true, delayMs: 700, mockError: null },
  SIP: { mockEnabled: true, delayMs: 500, mockError: null },
};

// ── Shared Mock Primitives ────────────────────────────────────────────────────
export const MOCK_MARKET_STATUS: MarketStatus = {
  statusCode: 'OPEN',
  marketType: 'EQUITY',
  exchangeId: 'NSE',
  segment: 'NORMAL',
  description: 'Market is open',
};

export const MOCK_ORDER_RESULT: OrderRequestResult = {
  statusCode: 'S',
  message: 'Order placed successfully (mock)',
};
