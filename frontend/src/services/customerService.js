import api from './api'

export const listCustomers = (businessId) =>
  api.get(`/businesses/${businessId}/customers`).then((response) => response.data)

export const getCustomer = (businessId, customerId) =>
  api.get(`/businesses/${businessId}/customers/${customerId}`).then((response) => response.data)

export const createCustomer = (businessId, customer) =>
  api.post(`/businesses/${businessId}/customers`, customer).then((response) => response.data)

export const updateCustomer = (businessId, customerId, customer) =>
  api.put(`/businesses/${businessId}/customers/${customerId}`, customer).then((response) => response.data)
