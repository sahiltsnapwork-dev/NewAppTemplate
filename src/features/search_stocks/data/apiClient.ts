import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL ?? 'https://irmbla.hdfcsec.com/api/v1/',
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    // TODO: inject auth token when auth module is wired
    // config.headers.Authorization = `Bearer ${getToken()}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

export default apiClient;
