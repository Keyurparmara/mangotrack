import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
  timeout: 15000,
})

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Just pass errors through — never auto-logout
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  getTeam: () => api.get('/auth/team'),
  changePassword: (userId, newPassword) => api.put(`/auth/users/${userId}/password`, { new_password: newPassword }),
  login: (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoryAPI = {
  list: () => api.get('/mango-categories'),
  create: (data) => api.post('/mango-categories', data),
  delete: (id) => api.delete(`/mango-categories/${id}`),
}

// ─── Box Types ───────────────────────────────────────────────────────────────
export const boxTypeAPI = {
  list: () => api.get('/box-types'),
  create: (data) => api.post('/box-types', data),
  delete: (id) => api.delete(`/box-types/${id}`),
}

// ─── Purchases ───────────────────────────────────────────────────────────────
export const purchaseAPI = {
  create: (data) => api.post('/purchases/', data),
  list: () => api.get('/purchases/'),
  get: (id) => api.get(`/purchases/${id}`),
}

// ─── Sales ───────────────────────────────────────────────────────────────────
export const salesAPI = {
  create: (data) => api.post('/sales/', data),
  list: (employee_id) => api.get('/sales/', { params: employee_id ? { employee_id } : {} }),
  getMySales: () => api.get('/sales/'),
  get: (id) => api.get(`/sales/${id}`),
  getCustomers: () => api.get('/sales/customers/'),
}

// ─── Stock ───────────────────────────────────────────────────────────────────
export const stockAPI = {
  get: () => api.get('/stock/'),
  getMango: () => api.get('/stock/mango'),
  getBoxes: () => api.get('/stock/boxes'),
}

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentAPI = {
  create: (data) => api.post('/payments/', data),
  list: () => api.get('/payments/'),
  update: (id, data) => api.put(`/payments/${id}`, data),
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export const reminderAPI = {
  list: () => api.get('/reminders/'),
  markDone: (id) => api.put(`/reminders/${id}/done`),
}

// ─── Purchase Payments ───────────────────────────────────────────────────────
export const purchasePaymentAPI = {
  create: (data) => api.post('/purchase-payments/', data),
  getByPurchase: (purchaseId) => api.get(`/purchase-payments/by-purchase/${purchaseId}`),
  addTransaction: (ppId, data) => api.post(`/purchase-payments/${ppId}/transactions/`, data),
  list: () => api.get('/purchase-payments/'),
}

// ─── Truck Payments ──────────────────────────────────────────────────────────
export const truckPaymentAPI = {
  create: (data) => api.post('/truck-payments/', data),
  list: () => api.get('/truck-payments/'),
  get: (id) => api.get(`/truck-payments/${id}`),
  addTransaction: (id, data) => api.post(`/truck-payments/${id}/transactions/`, data),
}

// ─── Parties ─────────────────────────────────────────────────────────────────
export const partyAPI = {
  list: () => api.get('/parties'),
  get: (name) => api.get(`/parties/${encodeURIComponent(name)}`),
}
