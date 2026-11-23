import api from './api'

export const listProducts = (businessId) =>
  api.get(`/businesses/${businessId}/products`).then((response) => response.data)

export const getProduct = (businessId, productId) =>
  api.get(`/businesses/${businessId}/products/${productId}`).then((response) => response.data)

export const createProduct = (businessId, product) =>
  api.post(`/businesses/${businessId}/products`, product).then((response) => response.data)

export const updateProduct = (businessId, productId, product) =>
  api.put(`/businesses/${businessId}/products/${productId}`, product).then((response) => response.data)

export const listVariants = (businessId, productId) =>
  api.get(`/businesses/${businessId}/products/${productId}/variants`).then((response) => response.data)

export const createVariant = (businessId, productId, variant) =>
  api.post(`/businesses/${businessId}/products/${productId}/variants`, variant).then((response) => response.data)

export const updateVariant = (businessId, variantId, variant) =>
  api.put(`/businesses/${businessId}/products/variants/${variantId}`, variant).then((response) => response.data)
