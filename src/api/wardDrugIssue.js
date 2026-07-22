import client from './client';

export async function listWardDrugIssues(wardId, params) {
  const { data } = await client.get(`/wards/${wardId}/drug-issues`, { params });
  return data;
}

export async function createWardDrugIssue(wardId, payload) {
  const { data } = await client.post(`/wards/${wardId}/drug-issues`, payload);
  return data;
}
