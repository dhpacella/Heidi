import { configureStore } from '@reduxjs/toolkit';
import votersReducer from './slices/votersSlice';
import precinctsReducer from './slices/precinctsSlice';
import canvassingReducer from './slices/canvassingSlice';
import superPicksReducer from './slices/superPicksSlice';

export default configureStore({
  reducer: {
    voters: votersReducer,
    precincts: precinctsReducer,
    canvassing: canvassingReducer,
    superPicks: superPicksReducer
  }
});
