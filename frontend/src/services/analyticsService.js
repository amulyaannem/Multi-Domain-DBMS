import api from './api'

export const getAnalytics = async (businessId) => {
  const [dashboardResult, analyticsResult] = await Promise.allSettled([
    api.get(`/businesses/${businessId}/dashboard`).then((response) => response.data),
    api.get(`/businesses/${businessId}/dashboard/analytics`).then((response) => response.data),
  ])

  return {
    dashboardData: dashboardResult.status === 'fulfilled' ? dashboardResult.value : null,
    analyticsData: analyticsResult.status === 'fulfilled' ? analyticsResult.value : null,
    dashboardError: dashboardResult.status === 'rejected' ? dashboardResult.reason : null,
    analyticsError: analyticsResult.status === 'rejected' ? analyticsResult.reason : null,
  }
}
