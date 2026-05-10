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
