import { configureStore, combineReducers } from '@reduxjs/toolkit';
import searchStocksReducer from '../../features/search_stocks/state/store/searchStocksSlice';
import { createSearchStocksThunkExtra } from '../../features/search_stocks/diBootstrap';

const rootReducer = combineReducers({
  searchStocks: searchStocksReducer,
  // Add other feature reducers here
});

export type RootState = ReturnType<typeof rootReducer>;

const thunkExtra = createSearchStocksThunkExtra();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      thunk: { extraArgument: thunkExtra },
      serializableCheck: false,
    }),
});

export type AppDispatch = typeof store.dispatch;
