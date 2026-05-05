// Centralized Axios HTTP Client for GetQuote module
// Base URL: API_BASE_URL environment variable
// Auth: Bearer token via request interceptor
// Timeout: 60 seconds (matching AppConstant.networkTimeOut)

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env['API_BASE_URL'] ?? 'https://api.hdfcsec.com';
const MS_UAT_BASE_URL = process.env['MS_UAT_BASE_URL'] ?? 'https://msuat.hdfcsec.com';
// irmscontenta: content services (news, financials, analytics, company bio, bulk/block, performance, pivot)
const IRMS_CONTENTA_BASE_URL = process.env['IRMS_CONTENTA_BASE_URL'] ?? 'https://irmscontenta.hdfcsec.com/mcontent-services';
// irmbla: FNO search engine (futures, options)
const IRMBLA_BASE_URL = process.env['IRMBLA_BASE_URL'] ?? 'https://irmbla.hdfcsec.com';

const TIMEOUT_MS = 60_000;

function createAxiosInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor: inject auth token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Token retrieved from secure storage — placeholder
      const token = getAuthToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    },
    (error: unknown) => Promise.reject(error),
  );

  // Response interceptor: normalize errors
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Token refresh would go here — stub for now
        console.warn('[ApiClient] 401 received — token refresh not implemented');
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

// Stub: replace with actual secure token retrieval
function getAuthToken(): string | null {
  return null;
}

export const openApiClient: AxiosInstance = createAxiosInstance(API_BASE_URL);
export const msUatClient: AxiosInstance = createAxiosInstance(MS_UAT_BASE_URL);
/** irmscontenta.hdfcsec.com/mcontent-services — news, financials, analytics, bulk/block, performance, pivot, company bio */
export const irmsContentaClient: AxiosInstance = createAxiosInstance(IRMS_CONTENTA_BASE_URL);
/** irmbla.hdfcsec.com — FNO search engine (futures, options) */
export const irmblaClient: AxiosInstance = createAxiosInstance(IRMBLA_BASE_URL);

export type { AxiosRequestConfig };
