import { createSlice } from '@reduxjs/toolkit';

const canvassingSlice = createSlice({
  name: 'canvassing',
  initialState: {
    activities: [],
    loading: false,
    error: null
  },
  reducers: {
    setActivities: (state, action) => {
      state.activities = action.payload;
    },
    addActivity: (state, action) => {
      state.activities.push(action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { setActivities, addActivity, setLoading, setError } = canvassingSlice.actions;
export default canvassingSlice.reducer;
