import api from './api'

export const listOrders = (businessId) =>
  api.get(`/businesses/${businessId}/orders`).then((response) => response.data)

export const getOrder = (businessId, orderId) =>
  api.get(`/businesses/${businessId}/orders/${orderId}`).then((response) => response.data)

export const createOrder = (businessId, order) =>
  api.post(`/businesses/${businessId}/orders`, order).then((response) => response.data)

export const placeOrder = (businessId, orderId) =>
  api.patch(`/businesses/${businessId}/orders/${orderId}/place`).then((response) => response.data)

export const updateOrderStatus = (businessId, orderId, order_status) =>
  api.patch(`/businesses/${businessId}/orders/${orderId}/status`, { order_status }).then((response) => response.data)

export const updatePaymentStatus = (businessId, orderId, payment_status) =>
  api.patch(`/businesses/${businessId}/orders/${orderId}/payment`, { payment_status }).then((response) => response.data)

export const updateDeliveryStatus = (businessId, orderId, delivery_status) =>
  api.patch(`/businesses/${businessId}/orders/${orderId}/delivery`, { delivery_status }).then((response) => response.data)
