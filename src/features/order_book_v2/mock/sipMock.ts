// Mock: SIP data
// Matches real API contract (APIs #12–#15)

import type {
  StockSipData,
  SipRequestBookModel,
  SipBasketInfo,
  SipOrderTrailItem,
  SipChildOrderItem,
} from '../domain/entities/StockSip';

export const MOCK_SIP_DATA: StockSipData[] = [
  {
    sipReferenceNumber: 'SIP001',
    basketName: 'Monthly Blue Chip SIP',
    status: 'ACTIVE',
    frequency: 'MONTHLY',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    amount: 5000,
    tradingAccountNumber: '12345678',
    nextInstallmentDate: '2026-06-01',
    totalInstallments: 24,
    completedInstallments: 16,
    remainingInstallments: 8,
  },
  {
    sipReferenceNumber: 'SIP002',
    basketName: 'Weekly Tech Fund SIP',
    status: 'PAUSED',
    frequency: 'WEEKLY',
    startDate: '2024-06-01',
    amount: 1000,
    tradingAccountNumber: '12345678',
    totalInstallments: 52,
    completedInstallments: 30,
    remainingInstallments: 22,
  },
];

export const MOCK_SIP_REQUEST_BOOK: SipRequestBookModel[] = [
  {
    sipReferenceNumber: 'SIP001',
    basketName: 'Monthly Blue Chip SIP',
    status: 1,
    fromDate: '2025-01-01',
    toDate: '2025-12-31',
    tradingAccountNumber: '12345678',
  },
];

const MOCK_BASKET_INFO: SipBasketInfo = {
  sipReferenceNumber: 'SIP001',
  basketName: 'Monthly Blue Chip SIP',
  totalAmount: 5000,
  status: 'ACTIVE',
};

export const MOCK_SIP_TRAIL: { basketInfo: SipBasketInfo; trailData: SipOrderTrailItem[] } = {
  basketInfo: MOCK_BASKET_INFO,
  trailData: [
    {
      trailDate: '2025-04-01',
      installmentNumber: 16,
      status: 'Executed',
      amount: 5000,
      executedAmount: 4998.50,
    },
    {
      trailDate: '2025-03-01',
      installmentNumber: 15,
      status: 'Executed',
      amount: 5000,
      executedAmount: 5000.00,
    },
  ],
};

export const MOCK_SIP_CHILDREN: { basketInfo: SipBasketInfo; childOrders: SipChildOrderItem[] } = {
  basketInfo: MOCK_BASKET_INFO,
  childOrders: [
    {
      exchangeOrderNumber: '1100000099887766',
      instrumentId: '2885',
      lsSymbol: 'RELIANCE',
      lssymbol: 'RELIANCE',
      quantity: 2,
      price: 2450.00,
      orderSide: 1,
      status: 'Traded',
      orderDateTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      exchangeOrderNumber: '1100000099887767',
      instrumentId: '1660',
      lsSymbol: 'HDFCBANK',
      lssymbol: 'HDFCBANK',
      quantity: 1,
      price: 1650.00,
      orderSide: 1,
      status: 'Traded',
      orderDateTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
};
