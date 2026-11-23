import api from './api'

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((response) => response.data)

export const getCurrentUser = () =>
  api.get('/auth/me').then((response) => response.data)
