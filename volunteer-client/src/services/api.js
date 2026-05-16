import axios from 'axios';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }).then(r => r.data),
};

export const volunteerService = {
  getAll: () => apiClient.get('/volunteers').then(r => r.data),
  getById: (id) => apiClient.get(`/volunteers/${id}`).then(r => r.data),
  updateAssignment: (volunteerId, assignmentId, data) =>
    apiClient.patch(`/volunteers/${volunteerId}/assignments/${assignmentId}`, data).then(r => r.data),
  logGps: (volunteerId, lat, lng) =>
    apiClient.post(`/volunteers/${volunteerId}/gps`, { latitude: lat, longitude: lng }).then(r => r.data),
};

export default apiClient;
