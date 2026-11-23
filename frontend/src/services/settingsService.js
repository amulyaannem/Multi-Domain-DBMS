import api from './api'

export const getAccountProfile = () =>
  api.get('/auth/me').then((response) => response.data)

export const getBusinesses = () =>
  api.get('/businesses').then((response) => response.data)

export const updateAccountProfile = (profile) =>
  api.patch('/auth/me', profile).then((response) => response.data)

export const changePassword = (passwords) =>
  api.patch('/auth/password', passwords).then((response) => response.data)

export const getBusinessProfile = (businessId) =>
  api.get(`/businesses/${businessId}`).then((response) => response.data)

export const updateBusinessProfile = (businessId, profile) =>
  api.patch(`/businesses/${businessId}`, profile).then((response) => response.data)

export const getBusinessModules = (businessId) =>
  api.get(`/businesses/${businessId}/modules`).then((response) => response.data)

export const updateBusinessModule = (businessId, moduleId, enabled) =>
  api.patch(`/businesses/${businessId}/modules/${moduleId}`, { enabled }).then((response) => response.data)

export const getBusinessMembers = (businessId) =>
  api.get(`/businesses/${businessId}/members`).then((response) => response.data)

export const updateBusinessMember = (businessId, membershipId, member_role) =>
  api.patch(`/businesses/${businessId}/members/${membershipId}`, { member_role }).then((response) => response.data)

export const removeBusinessMember = (businessId, membershipId) =>
  api.delete(`/businesses/${businessId}/members/${membershipId}`).then((response) => response.data)
