import { configureStore } from '@reduxjs/toolkit';
import getQuoteReducer from './getQuoteSlice';

export const store = configureStore({
  reducer: {
    getQuote: getQuoteReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
