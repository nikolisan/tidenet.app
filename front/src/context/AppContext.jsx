import React, { createContext, useReducer, useEffect, useContext } from 'react';
import axios from 'axios';

// --- 1. Define Initial State and Contexts ---
const initialState = {
  isLoading: true,
  stations: [], 
  selectedStation: null, 
  dateRange: {
    start: null, 
    end: null,   
  },
  error: null,
};

// Create separate contexts for state and dispatch for optimization 
const AppStateContext = createContext(initialState);
const AppDispatchContext = createContext(() => {});

// --- 2. Define Reducer Function ---
const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_STATIONS':
      return {...state, stations: action.payload, isLoading: false, error: null };
    case 'SELECT_STATION':
      return {...state, selectedStation: action.payload, error: null };
    case 'SET_DATE_RANGE':
      return {...state, dateRange: action.payload, error: null };
    case 'SET_ERROR':
      return {...state, error: action.payload, isLoading: false };
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
};

// --- 3. App Provider Component ---
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initial data fetch for all stations on application load
  useEffect(() => {
    const fetchStations = async () => {
      try {
        // Assume FastAPI runs on port 8000
        const response = await axios.get('http://localhost:8000/api/stations');

        console.log("API Response Data for /api/stations:", response.data);
        const stationArray = Object.values(response.data)
        dispatch({ type: 'SET_STATIONS', payload: stationArray });
        dispatch({ type: 'SELECT_STATION', payload: stationArray[0].label });
      } catch (err) {
        console.error('Error fetching stations:', err);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load station data.' });
      }
    };
    fetchStations();
  }, []); 

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// --- 4. Custom Hooks for State Access ---
export const useAppState = () => useContext(AppStateContext);
export const useAppDispatch = () => useContext(AppDispatchContext);