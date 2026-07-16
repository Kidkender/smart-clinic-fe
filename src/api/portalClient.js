import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1/portal`;
export const PATIENT_TOKEN_KEY = 'smartclinic_patient_token';
export const PATIENT_AUTH_KEY = 'smartclinic_patient_auth';

const portalClient = axios.create({ baseURL: BASE_URL });

portalClient.interceptors.request.use(config => {
  const token = localStorage.getItem(PATIENT_TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem(PATIENT_TOKEN_KEY);
      localStorage.removeItem(PATIENT_AUTH_KEY);
      window.dispatchEvent(new Event('patient-auth:logout'));
    }
    return Promise.reject(error);
  },
);

export default portalClient;
