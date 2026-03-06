const normalizeResponse = (response) => {
  const { data, error, count, status, statusText } = response;
  if (count !== null && count !== undefined) {
      return { data, count };
  }
  return data;
};

const results = [
    { 
        status: 'fulfilled', 
        value: normalizeResponse({ data: { totalPGs: 10 } }) 
    }
];

const dashboardStats = results[0]?.status === 'fulfilled' ? results[0].value : {};
console.log("dashboardStats:", dashboardStats);
console.log("dashboardStats.totalPGs:", dashboardStats.totalPGs);
