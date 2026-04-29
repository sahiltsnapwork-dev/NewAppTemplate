import apiClient from './searchClient';

export async function searchStocksApi(query: string) {
  const res = await apiClient.get('/api/v1/searchengine/v2/search', {
    params: { searchText: query },
  });
  return res.data;
}
