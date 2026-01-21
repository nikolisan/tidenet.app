import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { DateTime } from "luxon";
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// --- Initial State and Contexts ---
const baseUrl = import.meta.env.VITE_API_BASE_URL;
const themeLight = import.meta.env.VITE_LIGHT_THEME;
const themeDark = import.meta.env.VITE_DARK_THEME;

const initialState = {
  appTheme: themeLight,
  isLoading: true,
  baseUrl: baseUrl,
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
  
  const fetchStations = async () => {
    let apiUrl = `${state.baseUrl}/api/stations`;
    const response = await axios.get(apiUrl);
    return Object.values(response.data);
  }

  const { data: stations, isLoading, error } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
  });
  
  useEffect( () => {
    if (stations) {
      dispatch({
        type: 'SET_STATIONS',
        payload: stations
      });
      if (stations.length > 0) {
        const selectedStationPayload = { ...stations[0], listId: 0 };
        dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload });
      }
    }
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load station data.' });
    }

  }, [stations, error]);

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