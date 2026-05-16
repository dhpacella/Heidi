import apiClient from './apiClient';

export const voterService = {
  getVoters: (filters) => apiClient.get('/voters', { params: filters }),
  getVoterById: (id) => apiClient.get(`/voters/${id}`),
  createVoter: (voterData) => apiClient.post('/voters', voterData),
  updateVoter: (id, voterData) => apiClient.put(`/voters/${id}`, voterData),
  deleteVoter: (id) => apiClient.delete(`/voters/${id}`),
  exportVoters: (format, filters) => apiClient.post('/voters/export', { format, filters })
};

export const precinctService = {
  getPrecincts: () => apiClient.get('/precincts'),
  getPrecinctById: (id) => apiClient.get(`/precincts/${id}`),
  getPrioritizedPrecincts: () => apiClient.get('/precincts/prioritize')
};

export const analysisService = {
  getWinNumber: (precinctId) => apiClient.get('/analysis/win-number', { params: { precinctId } }),
  getTurnoutAnalysis: () => apiClient.get('/analysis/turnout'),
  getPersuasionOpportunities: () => apiClient.get('/analysis/persuasion')
};

export const canvassingService = {
  logActivity: (activityData) => apiClient.post('/canvassing/log', activityData),
  getActivityHistory: (voterId) => apiClient.get(`/canvassing/history/${voterId}`)
};

export const superPicksService = {
  getSuperPicks: (filters) => apiClient.get('/super-picks', { params: filters }),
  getCategories: () => apiClient.get('/super-picks/categories'),
  getStats: () => apiClient.get('/super-picks/stats'),
  importVoters: (filePath) => apiClient.post('/super-picks/import', { filePath }),
  exportForCanvassing: (minScore, format, precinct) => 
    apiClient.post('/super-picks/export-for-canvassing', { minScore, format, precinct }, { responseType: 'blob' })
};

export const authService = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (email, password, name) => apiClient.post('/auth/register', { email, password, name })
};

export const campaignService = {
  getStats: () => apiClient.get('/email/stats/overview'),
  getActiveBlasts: (status = 'sending') => apiClient.get('/email/blasts', { params: { status } }),
  getBlastHistory: (limit = 50, offset = 0) =>
    apiClient.get('/email/history', { params: { limit, offset } }),
  getAllBlasts: () => apiClient.get('/email/blasts'),
  getBlastBounces: (blastId) => apiClient.get(`/email/blasts/${blastId}/bounces`)
};

export const templateService = {
  getAll: () => apiClient.get('/email/templates').then(r => r.data),
  create: (name, subject, html_body) => apiClient.post('/email/templates', { name, subject, html_body }).then(r => r.data),
  remove: (id) => apiClient.delete(`/email/templates/${id}`).then(r => r.data),
};

export const smsService = {
  send: (formData) => apiClient.post('/sms/send', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  getHistory: (limit = 20, offset = 0) => apiClient.get(`/sms/history?limit=${limit}&offset=${offset}`).then(r => r.data),
};

export const volunteerService = {
  getAll: () => apiClient.get('/volunteers').then(r => r.data),
  getById: (id) => apiClient.get(`/volunteers/${id}`).then(r => r.data),
  create: (data) => apiClient.post('/volunteers', data).then(r => r.data),
  assign: (id, voterFilters, replaceExisting = false) =>
    apiClient.post(`/volunteers/${id}/assign`, { voterFilters, replaceExisting }).then(r => r.data),
  updateAssignment: (volunteerId, assignmentId, data) =>
    apiClient.patch(`/volunteers/${volunteerId}/assignments/${assignmentId}`, data).then(r => r.data),
  remove: (id) => apiClient.delete(`/volunteers/${id}`).then(r => r.data),
  getLiveGps: () => apiClient.get('/volunteers/gps/live').then(r => r.data)
};
