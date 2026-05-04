// ─── Base API Client ──────────────────────────────────────────────────────────
// Mirrors Flutter: lib/utility/Network/api_client.dart + network_helper.dart
// Uses axios with interceptors for request/response handling

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BASE_URL, REQUEST_TIMEOUT } from '../constants/ApiConstants';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  statusCode: number;
  success: boolean;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor — add auth token if available
    this.instance.interceptors.request.use(
      (config) => {
        // Auth token injection point (extend as needed)
        // config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor — normalize responses
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          return Promise.reject(error);
        } else if (error.request) {
          // No response received (network error / timeout)
          return Promise.reject(new Error('Network error. Please check your connection.'));
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.get<T>(url, config);
      return {
        data: response.data,
        error: null,
        statusCode: response.status,
        success: true,
      };
    } catch (err: unknown) {
      return this.handleError<T>(err);
    }
  }

  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post<T>(url, body, config);
      return {
        data: response.data,
        error: null,
        statusCode: response.status,
        success: true,
      };
    } catch (err: unknown) {
      return this.handleError<T>(err);
    }
  }

  private handleError<T>(err: unknown): ApiResponse<T> {
    if (axios.isAxiosError(err)) {
      const statusCode = err.response?.status ?? 0;
      const message =
        (err.response?.data as { message?: string })?.message ??
        err.message ??
        'Unknown error';
      return { data: null, error: message, statusCode, success: false };
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { data: null, error: message, statusCode: 0, success: false };
  }
}

// Singleton instance
export const apiClient = new ApiClient();
