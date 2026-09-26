import axios from 'axios'

const configuredUrl = import.meta.env.VITE_API_URL || (typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : '') || '/api'
export const api = axios.create({ baseURL: configuredUrl.replace(/\/$/, ''), withCredentials: true, headers: { 'Content-Type': 'application/json' } })

const request = (promise) => promise.then((response) => response.data).catch((error) => {
	const responseData = error.response?.data
	if (typeof responseData === 'string') {
		error.response.data = { error: responseData.trim().slice(0, 300) || 'The server returned an empty error.' }
	}
	throw error
})
export const loginUser = (credentials) => request(api.post('/auth/login.php', credentials))
export const registerUser = (details) => request(api.post('/auth/register.php', details))
export const updateProfile = (details) => request(api.put('/auth/update-profile.php', details))
export const logoutUser = () => request(api.post('/auth/logout.php'))
export const getSession = () => request(api.get('/auth/session.php'))
export const getMenuItems = ({ categoryId, search } = {}) => request(api.get('/menu/list.php', { params: { category_id: categoryId, search } }))
export const createMenuItem = (item) => request(api.post('/menu/create.php', item))
export const updateMenuItem = (id, item) => request(api.put('/menu/update.php', item, { params: { id } }))
export const deleteMenuItem = (id) => request(api.delete('/menu/delete.php', { params: { id } }))
export const getCategories = () => request(api.get('/categories/list.php'))
export const createCategory = (category) => request(api.post('/categories/create.php', category))
export const updateCategory = (id, category) => request(api.put('/categories/update.php', category, { params: { id } }))
export const deleteCategory = (id) => request(api.delete('/categories/delete.php', { params: { id } }))
export const placeOrder = (payload) => request(api.post('/orders/create.php', payload))
export const getCustomerOrders = (params = {}) => request(api.get('/orders/list.php', { params }))
export const getKitchenOrders = () => request(api.get('/orders/list.php', { params: { status: 'Pending,Preparing' } }))
export const updateOrderStatus = (id, status) => request(api.put('/orders/update-status.php', { status }, { params: { id } }))
export const getAnalytics = () => request(api.get('/admin/analytics.php'))
export const checkTableAvailability = (date, time, partySize) => request(api.get('/reservations/availability.php', { params: { date, time, party_size: partySize } }))
export const submitReservation = (reservationData) => request(api.post('/reservations/create.php', reservationData))
export const getReservations = () => request(api.get('/reservations/list.php'))
export const getStaffReservations = () => request(api.get('/reservations/list.php', { params: { all: 1 } }))
export const updateReservationStatus = (reservationId, status) => request(api.post('/reservations/update-status.php', { id: reservationId, status }))
export const getTableManagement = (date, time) => request(api.get('/tables/manage.php', { params: { date, time } }))
export const updateTable = (id, table) => request(api.put('/tables/manage.php', table, { params: { id } }))
