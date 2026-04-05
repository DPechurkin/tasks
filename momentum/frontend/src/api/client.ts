import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Событие для глобального отображения ошибок
export const errorBus = new EventTarget()

// Response interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    // Только серверные ошибки (5xx), не клиентские (4xx)
    if (status && status >= 500) {
      errorBus.dispatchEvent(
        new CustomEvent('api-error', {
          detail: error.response?.data?.error ?? 'Ошибка сервера',
        })
      )
    }
    return Promise.reject(error)
  }
)
