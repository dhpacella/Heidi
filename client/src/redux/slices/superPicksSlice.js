import { createSlice } from '@reduxjs/toolkit';

const superPicksSlice = createSlice({
  name: 'superPicks',
  initialState: {
    list: [],
    categories: null,
    stats: null,
    loading: false,
    error: null,
    filters: {
      minScore: 70,
      minConsistency: 0.66,
      precinct: ''
    }
  },
  reducers: {
    setSuperPicks: (state, action) => {
      state.list = action.payload;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    setStats: (state, action) => {
      state.stats = action.payload;
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

export const { 
  setSuperPicks, 
  setCategories, 
  setStats, 
  setLoading, 
  setError, 
  setFilters 
} = superPicksSlice.actions;
export default superPicksSlice.reducer;
