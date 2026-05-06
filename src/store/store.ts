// Redux Store – configured with DI container injected as thunk middleware extra
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import { orderBookContainer } from '../features/order_book_v2/di/orderBookContainer';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: { extraArgument: orderBookContainer },
      serializableCheck: {
        // Ignore non-serializable values in specific paths
        ignoredActions: ['orderBook/convertToDelivery/fulfilled'],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
