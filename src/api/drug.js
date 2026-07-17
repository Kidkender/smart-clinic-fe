import client from './client';

export async function searchDrugs(params) {
  const { data } = await client.get('/drugs', { params });
  return data;
}

export async function checkDrugInteractions(drugIds) {
  const { data } = await client.post('/drugs/interactions/check', { drug_ids: drugIds });
  return data;
}
