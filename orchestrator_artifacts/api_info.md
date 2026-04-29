# API Trace — SearchStock Feature

## Endpoint: searchStocks
- Method: GET
- Resolved URL: https://irmbla.hdfcsec.com/api/v1/searchengine/v2/search?searchText={query}
- Headers: Accept: application/json
- Query Parameters:
  - `searchText` (string) — search text

## Expected Response Shape (based on Flutter `SearchStockResultModel`)

```json
{
  "success": true,
  "message": "",
  "data": [
    {
      "companyName": "string",
      "displayName": "string",
      "symbol": "string",
      "instrumentId": "string",
      "lssymbol": "string"
    }
  ]
}
```

## Notes and Validation
- Source: `data/models/search_stock_result_model.dart` (GSD)
- Confirmed base URL: `https://irmbla.hdfcsec.com` (provided by user)
- Classification: API endpoint (not a WebView)
- Recommendations: ensure `Authorization` header is injected by app-level API client if required by the environment.
