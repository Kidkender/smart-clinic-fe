import client from './client';

export async function getRevenueReport({ from, to, groupBy }) {
  const { data } = await client.get('/reports/revenue', {
    params: { from, to, group_by: groupBy },
  });
  return data;
}

export async function getClinicalReport({ from, to, groupBy }) {
  const { data } = await client.get('/reports/clinical', {
    params: { from, to, group_by: groupBy },
  });
  return data;
}

export async function getBedOccupancyReport({ departmentId } = {}) {
  const { data } = await client.get('/reports/bed-occupancy', {
    params: { department_id: departmentId },
  });
  return data;
}

export async function getInventoryMovementReport({ from, to }) {
  const { data } = await client.get('/reports/inventory/movement', {
    params: { from, to },
  });
  return data;
}

export async function getTopDrugsReport({ from, to, limit }) {
  const { data } = await client.get('/reports/inventory/top-drugs', {
    params: { from, to, limit },
  });
  return data;
}

export async function getDashboardAlerts() {
  const { data } = await client.get('/reports/dashboard-alerts');
  return data;
}
