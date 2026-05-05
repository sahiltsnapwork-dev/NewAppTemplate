// DI Bootstrap: getQuoteDiBootstrap
// Wires data sources → repositories → use cases → thunk extra
// Constructor injection throughout — no service locators, no singletons

import { GetQuoteApiDataSource } from '../data/dataSources/GetQuoteApiDataSource';
import { GetQuoteNewsApiDataSource } from '../data/dataSources/GetQuoteNewsApiDataSource';
import { GetQuoteEventsApiDataSource } from '../data/dataSources/GetQuoteEventsApiDataSource';
import { GetQuoteRepositoryImpl } from '../data/repositories/GetQuoteRepositoryImpl';
import { GetQuoteNewsRepositoryImpl } from '../data/repositories/GetQuoteNewsRepositoryImpl';
import { GetQuoteEventsRepositoryImpl } from '../data/repositories/GetQuoteEventsRepositoryImpl';
import { FetchQuoteDataUseCase } from '../domain/useCases/FetchQuoteDataUseCase';
import { FetchPerformanceDataUseCase } from '../domain/useCases/FetchPerformanceDataUseCase';
import { FetchNewsUseCase } from '../domain/useCases/FetchNewsUseCase';
import { FetchBulkBlockUseCase } from '../domain/useCases/FetchBulkBlockUseCase';
import { FetchAnnouncementsUseCase } from '../domain/useCases/FetchAnnouncementsUseCase';
import { FetchEventsUseCase } from '../domain/useCases/FetchEventsUseCase';
import { FetchExpertTipsUseCase } from '../domain/useCases/FetchExpertTipsUseCase';
import { FetchResistanceSupportUseCase } from '../domain/useCases/FetchResistanceSupportUseCase';
import { FetchKeyStatsUseCase } from '../domain/useCases/FetchKeyStatsUseCase';
import { FetchFnoUseCase } from '../domain/useCases/FetchFnoUseCase';
import { FetchCompanyBioUseCase } from '../domain/useCases/FetchCompanyBioUseCase';

// ThunkExtra: injected into all createAsyncThunk calls via Redux middleware
export interface GetQuoteThunkExtra {
  fetchQuoteDataUseCase: FetchQuoteDataUseCase;
  fetchPerformanceDataUseCase: FetchPerformanceDataUseCase;
  fetchNewsUseCase: FetchNewsUseCase;
  fetchBulkBlockUseCase: FetchBulkBlockUseCase;
  fetchAnnouncementsUseCase: FetchAnnouncementsUseCase;
  fetchEventsUseCase: FetchEventsUseCase;
  fetchExpertTipsUseCase: FetchExpertTipsUseCase;
  fetchResistanceSupportUseCase: FetchResistanceSupportUseCase;
  fetchKeyStatsUseCase: FetchKeyStatsUseCase;
  fetchFnoUseCase: FetchFnoUseCase;
  fetchCompanyBioUseCase: FetchCompanyBioUseCase;
}

export function createGetQuoteThunkExtra(): GetQuoteThunkExtra {
  // Data Sources
  const quoteApiDataSource = new GetQuoteApiDataSource();
  const newsApiDataSource = new GetQuoteNewsApiDataSource();
  const eventsApiDataSource = new GetQuoteEventsApiDataSource();

  // Repositories (constructor injection — interfaces consumed)
  const quoteRepository = new GetQuoteRepositoryImpl(quoteApiDataSource);
  const newsRepository = new GetQuoteNewsRepositoryImpl(newsApiDataSource);
  const eventsRepository = new GetQuoteEventsRepositoryImpl(eventsApiDataSource);

  // Use Cases (pure domain — no framework deps)
  return {
    fetchQuoteDataUseCase:        new FetchQuoteDataUseCase(quoteRepository),
    fetchPerformanceDataUseCase:  new FetchPerformanceDataUseCase(quoteRepository),
    fetchNewsUseCase:             new FetchNewsUseCase(newsRepository),
    fetchBulkBlockUseCase:        new FetchBulkBlockUseCase(newsRepository),
    fetchAnnouncementsUseCase:    new FetchAnnouncementsUseCase(newsRepository),
    fetchEventsUseCase:           new FetchEventsUseCase(eventsRepository),
    fetchExpertTipsUseCase:       new FetchExpertTipsUseCase(quoteRepository),
    fetchResistanceSupportUseCase:new FetchResistanceSupportUseCase(quoteRepository),
    fetchKeyStatsUseCase:         new FetchKeyStatsUseCase(quoteRepository),
    fetchFnoUseCase:              new FetchFnoUseCase(eventsRepository),
    fetchCompanyBioUseCase:       new FetchCompanyBioUseCase(quoteRepository),
  };
}
