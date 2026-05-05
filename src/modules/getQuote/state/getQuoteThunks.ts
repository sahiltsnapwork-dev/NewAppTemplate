// Redux Thunks: getQuoteThunks
// Each thunk maps to a Flutter BLoC Event
// Thunks delegate to use cases via ThunkExtra (injected at store creation)

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { QuoteEntity } from '../domain/entities/QuoteEntity';
import type { BarChartEntity } from '../domain/entities/BarChartEntity';
import type { NewsEntity } from '../domain/entities/NewsEntity';
import type { BulkBlockEntity } from '../domain/entities/BulkBlockEntity';
import type { EventEntity } from '../domain/entities/EventEntity';
import type { ExpertTipEntity } from '../domain/entities/ExpertTipEntity';
import type { ResistanceSupportEntity } from '../domain/entities/ResistanceSupportEntity';
import type { KeyStatsEntity } from '../domain/entities/KeyStatsEntity';
import type { FnoEntity } from '../domain/entities/FnoEntity';
import type { CompanyBioEntity } from '../domain/entities/CompanyBioEntity';
import type { GetQuoteThunkExtra } from '../di/getQuoteDiBootstrap';

// fetchQuoteData — mirrors GetQuotePerformanceDetailApiEvent (main quote part)
export const fetchQuoteData = createAsyncThunk<
  QuoteEntity,
  { symbol: string; exchange: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchQuoteData', async (params, { extra }) => {
  return extra.fetchQuoteDataUseCase.execute(params);
});

// fetchPerformanceData — mirrors GetQuotePerformanceDetailApiEvent (chart part)
export const fetchPerformanceData = createAsyncThunk<
  BarChartEntity[],
  { coCode: string | number; exchange: string; interval?: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchPerformanceData', async (params, { extra }) => {
  return extra.fetchPerformanceDataUseCase.execute(params);
});

// fetchNews — mirrors GetNewsDetailsApiEvent
export const fetchNews = createAsyncThunk<
  NewsEntity[],
  { cmotId: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchNews', async (params, { extra }) => {
  return extra.fetchNewsUseCase.execute(params);
});

// fetchBulkBlock — mirrors GetNewsBulkBlockApiEvent
export const fetchBulkBlock = createAsyncThunk<
  BulkBlockEntity[],
  { cmotId: string; exchange: string; perPage?: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchBulkBlock', async (params, { extra }) => {
  return extra.fetchBulkBlockUseCase.execute(params);
});

// fetchAnnouncements — mirrors GetAnnouncementApiEvent
export const fetchAnnouncements = createAsyncThunk<
  NewsEntity[],
  { cmotId: string; exchange: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchAnnouncements', async (params, { extra }) => {
  return extra.fetchAnnouncementsUseCase.execute(params);
});

// fetchEvents — mirrors GetEventsApiEvent
export const fetchEvents = createAsyncThunk<
  EventEntity[],
  { cmotId: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchEvents', async (params, { extra }) => {
  return extra.fetchEventsUseCase.execute(params);
});

// fetchExpertTips — mirrors expert tip API event
export const fetchExpertTips = createAsyncThunk<
  ExpertTipEntity | null,
  { symbol: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchExpertTips', async (params, { extra }) => {
  return extra.fetchExpertTipsUseCase.execute(params);
});

// fetchResistanceSupport — mirrors resistance/support API event
export const fetchResistanceSupport = createAsyncThunk<
  ResistanceSupportEntity[],
  { coCode: string | number; exchange: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchResistanceSupport', async (params, { extra }) => {
  return extra.fetchResistanceSupportUseCase.execute(params);
});

// fetchKeyStats — mirrors key stats API event
export const fetchKeyStats = createAsyncThunk<
  KeyStatsEntity[],
  { symbol: string; exchange: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchKeyStats', async (params, { extra }) => {
  return extra.fetchKeyStatsUseCase.execute(params);
});

// fetchFnoData — mirrors F&O data API event
export const fetchFnoData = createAsyncThunk<
  FnoEntity[],
  { symbol: string; exchange: string },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchFnoData', async (params, { extra }) => {
  return extra.fetchFnoUseCase.execute(params);
});

// fetchCompanyBio — mirrors company bio API event
export const fetchCompanyBio = createAsyncThunk<
  CompanyBioEntity | null,
  { coCode: string | number },
  { extra: GetQuoteThunkExtra }
>('getQuote/fetchCompanyBio', async (params, { extra }) => {
  return extra.fetchCompanyBioUseCase.execute(params);
});
