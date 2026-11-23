import api from './api'

export const getInventory = (businessId) =>
  api.get(`/businesses/${businessId}/products/inventory/all`).then((response) => response.data)

export const getLowStock = (businessId) =>
  api.get(`/businesses/${businessId}/products/inventory/low-stock`).then((response) => response.data)

export const updateInventory = (businessId, productId, adjustment) =>
  api.put(`/businesses/${businessId}/products/inventory/${productId}`, adjustment).then((response) => response.data)
