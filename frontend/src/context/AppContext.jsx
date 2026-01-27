import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { DateTime } from "luxon";
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const location = useLocation();
  const navigate = useNavigate();

  // Initial data fetch for all stations on application load
  
  const fetchStations = async () => {
    let apiUrl = `${state.baseUrl}/stations`;
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
    }
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load station data.' });
    }

  }, [stations, error]);

  // Keep selectedStation in sync with URL label across the app
  useEffect(() => {
    if (!stations || stations.length === 0) return;

    // Extract label from /station/:label
    const match = location.pathname.match(/^\/station\/([^/]+)$/);
    const routeLabel = match ? decodeURIComponent(match[1]) : null;

    if (routeLabel) {
      const matchIndex = stations.findIndex((s) => s.label === routeLabel);
      if (matchIndex >= 0) {
        if (state.selectedStation?.label !== routeLabel) {
          const payload = { ...stations[matchIndex], listId: matchIndex };
          dispatch({ type: 'SELECT_STATION', payload });
        }
      } else {
        // Invalid label: surface error and send to NotFound
        dispatch({ type: 'SET_ERROR', payload: 'Station not found.' });
        navigate('/not-found', { replace: true });
      }
    } else if (!state.selectedStation) {
      // No label in URL and nothing selected: pick first station
      const fallback = { ...stations[0], listId: 0 };
      dispatch({ type: 'SELECT_STATION', payload: fallback });
    }
  // Depend only on routing and station list to avoid thrashing when selectedStation changes locally
  }, [stations, location.pathname, dispatch, navigate]);

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