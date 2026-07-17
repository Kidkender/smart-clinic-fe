import client from './client';

export async function searchIcd10(query) {
  const { data } = await client.get('/icd10', { params: { q: query } });
  return data;
}
