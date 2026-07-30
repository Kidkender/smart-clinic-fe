import client from './client';

export async function getRevenueReport({ from, to, groupBy }) {
  const { data } = await client.get('/reports/revenue', {
    params: { from, to, group_by: groupBy },
  });
  return data;
}
