// Repository Implementation: SIP
// Layer: Data – implements ISipRepository
// Mock fallback: uses mockConfig

import type { ISipRepository } from '../../domain/repositories/ISipRepository';
import type {
  StockSipData,
  SipRequestBookModel,
  SipOrderTrailItem,
  SipChildOrderItem,
  SipBasketInfo,
} from '../../domain/entities/StockSip';
import {
  fetchStockSipData,
  fetchSipRequestBook,
  fetchSipOrderTrail,
  fetchSipChildOrders,
} from '../datasources/SipApiDataSource';
import { MOCK_CONFIG } from '../../mock/mockConfig';
import { MOCK_SIP_DATA, MOCK_SIP_REQUEST_BOOK, MOCK_SIP_TRAIL, MOCK_SIP_CHILDREN } from '../../mock/sipMock';

export class SipRepositoryImpl implements ISipRepository {
  async getStockSipData(tradingAccountNumber: string): Promise<StockSipData[]> {
    if (MOCK_CONFIG.SIP.mockEnabled) {
      return MOCK_SIP_DATA;
    }

    const response = await fetchStockSipData(tradingAccountNumber);
    if (response.statusCode !== '000') return [];
    return (response.data?.sipDataList ?? []).map((dto) => ({
      sipReferenceNumber: dto.sipReferenceNumber,
      basketName: dto.basketName,
      status: dto.status,
      frequency: dto.frequency,
      startDate: dto.startDate,
      endDate: dto.endDate,
      amount: dto.amount,
      tradingAccountNumber: dto.tradingAccountNumber,
      nextInstallmentDate: dto.nextInstallmentDate,
      totalInstallments: dto.totalInstallments,
      completedInstallments: dto.completedInstallments,
      remainingInstallments: dto.remainingInstallments,
    }));
  }

  async getSipRequestBook(
    tradingAccountNumber: string,
    status: number,
    startDate: string,
    endDate: string
  ): Promise<SipRequestBookModel[]> {
    if (MOCK_CONFIG.SIP.mockEnabled) {
      return MOCK_SIP_REQUEST_BOOK;
    }

    const response = await fetchSipRequestBook(tradingAccountNumber, status, startDate, endDate);
    if (response.statusCode === 'ND') return [];
    if (response.statusCode !== '000') {
      throw new Error(response.messageList?.[0]?.messageDescription ?? 'SIP request book error');
    }
    return (response.data?.sipRequestBookList ?? []).map((dto) => ({
      sipReferenceNumber: dto.sipReferenceNumber,
      basketName: dto.basketName,
      status: dto.status,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      tradingAccountNumber: dto.tradingAccountNumber,
    }));
  }

  async getSipOrderTrail(
    tradingAccountNumber: string,
    sipReferenceNumber: string
  ): Promise<{ basketInfo: SipBasketInfo; trailData: SipOrderTrailItem[] }> {
    if (MOCK_CONFIG.SIP.mockEnabled) {
      return MOCK_SIP_TRAIL;
    }

    const response = await fetchSipOrderTrail(tradingAccountNumber, sipReferenceNumber);
    const basketInfo: SipBasketInfo = {
      sipReferenceNumber: response.data?.basketInfoData?.sipReferenceNumber ?? sipReferenceNumber,
      basketName: response.data?.basketInfoData?.basketName ?? '',
      totalAmount: response.data?.basketInfoData?.totalAmount ?? 0,
      status: response.data?.basketInfoData?.status ?? '',
    };
    const trailData: SipOrderTrailItem[] = (response.data?.basketTrailInfoData ?? []).map((t) => ({
      trailDate: t.trailDate,
      installmentNumber: t.installmentNumber,
      status: t.status,
      amount: t.amount,
      executedAmount: t.executedAmount,
    }));
    return { basketInfo, trailData };
  }

  async getSipChildOrders(
    tradingAccountNumber: string,
    sipReferenceNumber: string
  ): Promise<{ basketInfo: SipBasketInfo; childOrders: SipChildOrderItem[] }> {
    if (MOCK_CONFIG.SIP.mockEnabled) {
      return MOCK_SIP_CHILDREN;
    }

    const response = await fetchSipChildOrders(tradingAccountNumber, sipReferenceNumber);
    const basketInfo: SipBasketInfo = {
      sipReferenceNumber: response.data?.basketInfoData?.sipReferenceNumber ?? sipReferenceNumber,
      basketName: response.data?.basketInfoData?.basketName ?? '',
      totalAmount: response.data?.basketInfoData?.totalAmount ?? 0,
      status: response.data?.basketInfoData?.status ?? '',
    };
    const childOrders: SipChildOrderItem[] = (response.data?.basketChildInfoData ?? []).map((c) => ({
      exchangeOrderNumber: c.exchangeOrderNumber,
      instrumentId: c.instrumentId,
      lsSymbol: c.lsSymbol ?? c.lssymbol,
      lssymbol: c.lssymbol ?? c.lsSymbol,
      quantity: c.quantity,
      price: c.price,
      orderSide: c.orderSide,
      status: c.status,
      orderDateTime: c.orderDateTime,
    }));
    return { basketInfo, childOrders };
  }
}
