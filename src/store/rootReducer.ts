// Root Reducer – combines all feature slices
// Add order_book_v2 slices here

import { combineReducers } from '@reduxjs/toolkit';
import orderBookReducer from '../features/order_book_v2/state/slices/orderBookSlice';
import orderCancelReducer from '../features/order_book_v2/state/slices/orderCancelSlice';
import positionsReducer from '../features/order_book_v2/state/slices/positionsSlice';
import sipReducer from '../features/order_book_v2/state/slices/sipSlice';

export const rootReducer = combineReducers({
  orderBook: orderBookReducer,
  orderCancel: orderCancelReducer,
  positions: positionsReducer,
  sip: sipReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
