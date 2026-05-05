import { configureStore } from '@reduxjs/toolkit';
import getQuoteReducer from '../modules/getQuote/state/getQuoteSlice';
import { createGetQuoteThunkExtra } from '../modules/getQuote/di/getQuoteDiBootstrap';

const thunkExtra = createGetQuoteThunkExtra();

export const store = configureStore({
  reducer: {
    getQuote: getQuoteReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      thunk: { extraArgument: thunkExtra },
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
