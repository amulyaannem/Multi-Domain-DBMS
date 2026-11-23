import api from './api'

export const getDashboard = (businessId) =>
  api.get(`/businesses/${businessId}/dashboard`).then((response) => response.data)
