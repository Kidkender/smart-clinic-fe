import portalClient from './portalClient';

export async function getSurvey(token) {
  const { data } = await portalClient.get(`/public/surveys/${token}`);
  return data;
}

export async function submitSurvey(token, payload) {
  const { data } = await portalClient.post(`/public/surveys/${token}`, payload);
  return data;
}
