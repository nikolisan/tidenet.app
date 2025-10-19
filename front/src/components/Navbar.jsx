import React from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppContext';
import ThemeToggle from './ThemeToggle'; // <--- ADDED IMPORT

const Navbar = () => {
  const { stations, selectedStation } = useAppState();

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="flex-1 hidden sm:flex">
        <Link to="/" className="btn btn-ghost text-xl">
          RT-Surge
        </Link>
      </div>
      <div className='flex-none flex items-center'>
        {/* Select box for station change view [Image 2] */}
        {selectedStation && (
          <select
            className="select select-bordered w-full max-w-xs mr-4"
            defaultValue={selectedStation.label}
            onChange={(e) => {
              // Note: For a proper implementation, this should dispatch an action and navigate
              // This is a simplified placeholder
              const newLabel = e.target.value;
              const newStation = stations.find(s => s.label === newLabel);
              if (newStation) {
                // In a production app, we would use a state update + useEffect to navigate
                window.location.href = `/station/${newLabel}`;
              }
            }}
          >
            {stations.map(station => (
              <option key={station.label} value={station.label}>
                {station.label}
              </option>
            ))}
          </select>
        )}
        <ThemeToggle /> 
        
        <Link to="/" className="btn btn-square">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default Navbar;