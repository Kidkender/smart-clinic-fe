import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;
const TOKEN_KEY = 'smartclinic_token';

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('smartclinic_auth');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export default client;
