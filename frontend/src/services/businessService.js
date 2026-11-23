import api from './api'

export const getBusinesses = () =>
  api.get('/businesses').then((response) => response.data)

export const registerBusiness = (business) =>
  api.post('/businesses', business).then((response) => response.data)
