import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;
const TOKEN_KEY = 'smartclinic_token';
const REFRESH_TOKEN_KEY = 'smartclinic_refresh_token';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});
client.interceptors.request.use(config => {
  config.headers["ngrok-skip-browser-warning"] = "true";
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function forceLogout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('smartclinic_auth');
  window.dispatchEvent(new Event('auth:logout'));
}

let refreshPromise = null;

async function performRefresh() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('no refresh token');
  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'ngrok-skip-browser-warning': 'true' } },
  );
  localStorage.setItem(TOKEN_KEY, data.data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refresh_token);
  return data.data.access_token;
}

client.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      forceLogout();
    }
    return Promise.reject(error);
  },
);

export default client;
