// Data Source: SIP API
// Source: SipRequestBookListRepo, SipOrderTrailRepo, SipChildOrderDetailsRepo, StockSipDataRepository
// APIs #12–#15
// Layer: Data – uses apiClient

import apiClient from '../../../../core/api/apiClient';
import { ORDER_BOOK_ENDPOINTS } from '../../../../core/api/endpoints';
import type {
  StockSipApiResponse,
  SipRequestBookApiResponse,
  SipOrderTrailApiResponse,
  SipChildOrderApiResponse,
} from '../dto/SipDto';

// ── Stock SIP Data – API #13 ──────────────────────────────────────────────────
export async function fetchStockSipData(
  tradingAccountNumber: string
): Promise<StockSipApiResponse> {
  const response = await apiClient.post<StockSipApiResponse>(
    ORDER_BOOK_ENDPOINTS.STOCK_SIP_DATA,
    { requestType: 'sipData', tradingAccountNumber }
  );
  return response.data;
}

// ── SIP Request Book – API #12 ────────────────────────────────────────────────
export async function fetchSipRequestBook(
  tradingAccountNumber: string,
  status: number,
  startDate: string,
  endDate: string
): Promise<SipRequestBookApiResponse> {
  const response = await apiClient.post<SipRequestBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.SIP_REQUEST_BOOK,
    { tradingAccountNumber, status, startDate, endDate }
  );
  return response.data;
}

// ── SIP Order Trail – API #14 ─────────────────────────────────────────────────
export async function fetchSipOrderTrail(
  tradingAccountNumber: string,
  sipReferenceNumber: string
): Promise<SipOrderTrailApiResponse> {
  const response = await apiClient.post<SipOrderTrailApiResponse>(
    ORDER_BOOK_ENDPOINTS.SIP_ORDER_TRAIL,
    { tradingAccountNumber, sipReferenceNumber }
  );
  return response.data;
}

// ── SIP Child Orders – API #15 ────────────────────────────────────────────────
export async function fetchSipChildOrders(
  tradingAccountNumber: string,
  sipReferenceNumber: string
): Promise<SipChildOrderApiResponse> {
  const response = await apiClient.post<SipChildOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.SIP_CHILD_ORDERS,
    { tradingAccountNumber, sipReferenceNumber }
  );
  return response.data;
}
