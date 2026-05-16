import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import votersReducer from './slices/votersSlice';
import precinctsReducer from './slices/precinctsSlice';
import canvassingReducer from './slices/canvassingSlice';
import superPicksReducer from './slices/superPicksSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    voters: votersReducer,
    precincts: precinctsReducer,
    canvassing: canvassingReducer,
    superPicks: superPicksReducer
  }
});
