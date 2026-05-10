import { createSlice } from '@reduxjs/toolkit';

const votersSlice = createSlice({
  name: 'voters',
  initialState: {
    list: [],
    loading: false,
    error: null,
    filters: {
      precinct: '',
      votedInYears: 3,
      ageRange: '',
      party: ''
    }
  },
  reducers: {
    setVoters: (state, action) => {
      state.list = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    }
  }
});

export const { setVoters, setLoading, setError, setFilters } = votersSlice.actions;
export default votersSlice.reducer;
