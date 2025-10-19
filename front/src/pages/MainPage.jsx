import React, { useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

// Map imports
import { MapContainer, TileLayer, useMap, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet';



const useCurrentTheme = () => {
  const [theme, setTheme] = React.useState('nord'); // Initialize with a default

  React.useEffect(() => {
    const htmlElement = document.querySelector('html');
    if (!htmlElement) return;
    
    // Set initial theme on mount
    setTheme(htmlElement.getAttribute('data-theme') || 'nord');

    // MutationObserver monitors the 'data-theme' attribute for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = htmlElement.getAttribute('data-theme');
          setTheme(newTheme);
        }
      });
    });

    observer.observe(htmlElement, { 
      attributes: true, 
      attributeFilter: ['data-theme'] // Only watch the theme attribute
    });

    return () => observer.disconnect();
  }, []); // Runs once on mount

  return theme;
};

const MapContainerBox = ({ stations = []}) => {

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const currentTheme = useCurrentTheme();
    
  const customIcon = useMemo(() => {
    // Determine the desired color class based on the theme
    // We want the icon to be the 'base-content' color for the current theme.
    const iconColorClass = 'text-primary'
    
    // The SVG is wrapped in a <div> with the DaisyUI color class.
    // The SVG uses 'currentColor' to inherit that div's color.
    const customSvgHtml = `
      <div class="${iconColorClass}" style="filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `;

    return new L.divIcon({
      html: customSvgHtml,
      className: 'bg-transparent', // Crucial to remove Leaflet's default white background
      iconSize: [32, 32],
      iconAnchor: [16, 32], // Anchor point to the bottom center of the icon
    });
  }, [currentTheme]);

  const handleMarkerClick = (station) => {
    // 1. Store selected station in global state
    dispatch({ type: 'SELECT_STATION', payload: station });

    // 2. Navigate to the station page using its label
    navigate(`/station/${station.label}`);
  };

  const getTileUrl = (theme) => {
    const cartoDbUrl = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
    
    // Map the DaisyUI theme name to the CartoDB style name
    // dracula -> dark_all, nord -> light_all
    const style = theme === 'nord'? 'light_all' : 'dark_all';
    
    return cartoDbUrl.replace('{style}', style);
  };
  
  const tileUrl = getTileUrl(currentTheme);

  return (
    <div className="h-[70vh] w-full card bg-base-200 shadow-xl">
      <MapContainer key={currentTheme} center={[54, -3.018]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
          if (stations) {
            stations.map((station, index) => {
              return(
                <Marker
                  key={station.station_id} 
                  // Position uses lat and lon from your API data
                  position={[station.lat, station.lon]}
                  eventHandlers={{click: () => handleMarkerClick(station)}}
                  icon={customIcon}>

                  <Tooltip>
                    <div className="text-neutral font-bold">{station.label}</div>
                    <div className="text-neutral">Latest reading:<br/>{station.date_time.toString()}</div>
                  </Tooltip>
                </Marker>
              );
            })
          }
        </MapContainer>

    </div>
  )
}

const MainPage = () => {
  const { stations, isLoading, error } = useAppState();

  if (error) {
    return <Layout><div className="alert alert-error">{error}</div></Layout>;
  }
  return (
    <Layout>
        {isLoading? (
          <div className="flex justify-center items-center h-96">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <MapContainerBox stations={stations} />
        )}
    </Layout>
  );
};

export default MainPage;