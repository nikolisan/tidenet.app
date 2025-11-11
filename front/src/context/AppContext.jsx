import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { DateTime } from "luxon";
import axios from 'axios';

// --- Initial State and Contexts ---

const initialState = {
  appTheme: 'light',
  isLoading: true,
  stations: [], 
  selectedStation: null, 
  dateRange: {
    start: DateTime.now().toUTC().minus({months: 1}), 
    end: DateTime.now().toUTC(),   
  },
  error: null,
};

const AppStateContext = createContext(initialState);
const AppDispatchContext = createContext(() => {});

// --- Reducer Function ---
const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_THEME':
      document.querySelector('html').setAttribute('data-theme', action.payload);
      return {...state, appTheme: action.payload};
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

// --- App Provider Component ---
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

        if (stationArray.length > 0) {
          const selectedStationPayload = { ...stationArray[0], listId: 0 };
          dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload  });
        }

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

// --- Custom Hooks for State Access ---
export const useAppState = () => useContext(AppStateContext);
export const useAppDispatch = () => useContext(AppDispatchContext);