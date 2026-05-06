// Centralized Axios HTTP Client
// Source: NetworkHelperOpenApi.CallApiServer pattern (Flutter)
// All API calls in the data layer MUST use this instance – never raw fetch or direct axios

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios';

const BASE_URL = (globalThis as Record<string, unknown>).API_BASE_URL as string | undefined ?? 'https://api.hdfcsec.com/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor: inject bearer token ─────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Token is read from a globally accessible auth store (not hardcoded)
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ── Response interceptor: normalize errors ───────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<never> => {
    if (error.response?.status === 401) {
      // Token expired – clear auth and let the app redirect to login
      clearAuthToken();
    }
    return Promise.reject(normalizeApiError(error));
  }
);

// ── Token helpers (replace with your auth store implementation) ───────────────
function getAuthToken(): string | null {
  // In production: read from SecureStorage / AsyncStorage / Redux auth state
  return (globalThis as Record<string, unknown>).__authToken as string | null ?? null;
}

function clearAuthToken(): void {
  (globalThis as Record<string, unknown>).__authToken = null;
}

// ── Error normalizer ─────────────────────────────────────────────────────────
export interface ApiError {
  statusCode: number | null;
  message: string;
  raw?: unknown;
}

function normalizeApiError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data as Record<string, unknown> | undefined;
    const messageList = data?.messageList as Array<{ messageDescription?: string }> | undefined;
    const description = messageList?.[0]?.messageDescription ?? 'An error occurred';
    return {
      statusCode: error.response.status,
      message: description,
      raw: data,
    };
  }
  if (error.request) {
    return { statusCode: null, message: 'Network error – no response received', raw: error.request };
  }
  return { statusCode: null, message: error.message ?? 'Unknown error', raw: error };
}

export default apiClient;
