import axios from 'axios'

const getEnv = (key: 'VITE_OME_API_BASE' | 'VITE_OME_API_USER' | 'VITE_OME_API_PASS', fallback: string = ''): string => {
  return window.__ENV__?.[key] || import.meta.env[key] || fallback
}

export const api = axios.create({
  baseURL: getEnv('VITE_OME_API_BASE', 'http://localhost:8081/v1'),
})

const username = getEnv('VITE_OME_API_USER')
const password = getEnv('VITE_OME_API_PASS')

if (password) {
  const token = username
    ? btoa(`${username}:${password}`)
    : btoa(password)
  api.defaults.headers.common['Authorization'] = `Basic ${token}`
}

api.interceptors.response.use(
  (response) => {
    // OME API often wraps the actual data in a 'response' field
    // but some endpoints might return it directly or wrap it differently.
    // Based on the spec, most successful responses are OmeResponse<T>
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)
