import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('bms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      sessionStorage.removeItem('bms_token')
      sessionStorage.removeItem('bms_user')
      sessionStorage.removeItem('bms_business')
    }
    return Promise.reject(error)
  },
)

export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error.response?.data?.message || error.message || fallback

export default api
