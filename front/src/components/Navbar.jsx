import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '../context/AppContext';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { stations, selectedStation } = useAppState();
  const [ stationLabel, setStationLabel ] = useState();
  const dispatch = useAppDispatch(); // Get the dispatch function
  const navigate = useNavigate(); // Get the navigation function

  useEffect (() => {
    if (selectedStation) { 
      setStationLabel(selectedStation.label)
    }
  }, [selectedStation])

  const handleStationChange = (event) => {
      const newLabel = event.target.value;
      const stationIndex = stations.findIndex(station => station.label === newLabel);
      const stationToSelect = stations[stationIndex];
      const payload = { 
          ...stationToSelect, 
          listId: stationIndex
      };
      dispatch({ type: 'SELECT_STATION', payload: payload });
      navigate(`/station/${newLabel}`);
  };

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="flex-1  hidden sm:flex">
        <Link to="/" className="btn btn-ghost text-xl">
          RT-Surge
        </Link>
      </div>
      <div className='flex-none flex items-center'>
        {selectedStation && (
          <select
              className="select select-bordered w-full max-w-xs mr-4"
              value={stationLabel} 
              onChange={handleStationChange}
            >
              {stations.map( (station, index) => (
                  <option key={index} value={station.label}>
                      {station.label}
                  </option>
              ))}
          </select>
        )}
        <ThemeToggle /> 
        
        <Link to="/" className="btn btn-square flex-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default Navbar;