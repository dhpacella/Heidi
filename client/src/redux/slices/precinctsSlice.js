import { createSlice } from '@reduxjs/toolkit';

const precinctsSlice = createSlice({
  name: 'precincts',
  initialState: {
    list: [],
    prioritized: [],
    loading: false,
    error: null
  },
  reducers: {
    setPrecincts: (state, action) => {
      state.list = action.payload;
    },
    setPrioritizedPrecincts: (state, action) => {
      state.prioritized = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { setPrecincts, setPrioritizedPrecincts, setLoading, setError } = precinctsSlice.actions;
export default precinctsSlice.reducer;
