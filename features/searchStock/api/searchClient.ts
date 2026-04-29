import axios from 'axios';

const DEFAULT_BASE = process.env.API_BASE_URL || 'https://irmbla.hdfcsec.com';

export const apiClient = axios.create({
  baseURL: DEFAULT_BASE,
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

export default apiClient;
