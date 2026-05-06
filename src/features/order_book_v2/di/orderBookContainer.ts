// DI Container: Order Book V2
// Wires domain use cases to repository implementations
// ThunkExtra is injected into Redux store as middleware extra argument

import { OrderBookRepositoryImpl } from '../data/repositories/OrderBookRepositoryImpl';
import { OrderCancelRepositoryImpl } from '../data/repositories/OrderCancelRepositoryImpl';
import { PositionsRepositoryImpl } from '../data/repositories/PositionsRepositoryImpl';
import { SipRepositoryImpl } from '../data/repositories/SipRepositoryImpl';
import { FetchOrderBookUseCase } from '../domain/usecases/FetchOrderBook';
import { FetchTradeBookUseCase } from '../domain/usecases/FetchTradeBook';
import { CancelOrderUseCase } from '../domain/usecases/CancelOrder';
import { ModifyOrderUseCase } from '../domain/usecases/ModifyOrder';
import { GetMarketStatusUseCase } from '../domain/usecases/GetMarketStatus';
import { FetchPositionsUseCase } from '../domain/usecases/FetchPositions';
import { ConvertToDeliveryUseCase } from '../domain/usecases/ConvertToDelivery';
import { FetchSipDataUseCase } from '../domain/usecases/FetchSipData';
import type { IOrderBookRepository } from '../domain/repositories/IOrderBookRepository';
import type { IOrderCancelRepository } from '../domain/repositories/IOrderCancelRepository';

// ── Repository Instances ──────────────────────────────────────────────────────
const orderBookRepository = new OrderBookRepositoryImpl();
const orderCancelRepository = new OrderCancelRepositoryImpl();
const positionsRepository = new PositionsRepositoryImpl();
const sipRepository = new SipRepositoryImpl();

// ── Use Case Instances ────────────────────────────────────────────────────────
const fetchOrderBookUseCase = new FetchOrderBookUseCase(orderBookRepository);
const fetchTradeBookUseCase = new FetchTradeBookUseCase(orderBookRepository);
const cancelOrderUseCase = new CancelOrderUseCase(orderCancelRepository);
const modifyOrderUseCase = new ModifyOrderUseCase(orderCancelRepository);
const getMarketStatusUseCase = new GetMarketStatusUseCase(orderCancelRepository);
const fetchPositionsUseCase = new FetchPositionsUseCase(positionsRepository);
const convertToDeliveryUseCase = new ConvertToDeliveryUseCase(orderBookRepository);
const fetchSipDataUseCase = new FetchSipDataUseCase(sipRepository);

// ── ThunkExtra type (injected into Redux store) ───────────────────────────────
// All thunks receive this via `extra` parameter
export interface ThunkExtra {
  // Repositories
  orderBookRepository: IOrderBookRepository;
  orderCancelRepository: IOrderCancelRepository;

  // Use cases
  fetchOrderBookUseCase: FetchOrderBookUseCase;
  fetchTradeBookUseCase: FetchTradeBookUseCase;
  cancelOrderUseCase: CancelOrderUseCase;
  modifyOrderUseCase: ModifyOrderUseCase;
  getMarketStatusUseCase: GetMarketStatusUseCase;
  fetchPositionsUseCase: FetchPositionsUseCase;
  convertToDeliveryUseCase: ConvertToDeliveryUseCase;
  fetchSipDataUseCase: FetchSipDataUseCase;
}

export const orderBookContainer: ThunkExtra = {
  orderBookRepository,
  orderCancelRepository,
  fetchOrderBookUseCase,
  fetchTradeBookUseCase,
  cancelOrderUseCase,
  modifyOrderUseCase,
  getMarketStatusUseCase,
  fetchPositionsUseCase,
  convertToDeliveryUseCase,
  fetchSipDataUseCase,
};
