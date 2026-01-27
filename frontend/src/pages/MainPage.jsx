import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

import { Waves, MapPinned, Info } from 'lucide-react';

// Map imports
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet';
import { AlertBox } from '../components/Alert';
import { StationCardsCollection } from '../components/StationCards';

const themeDark = import.meta.env.VITE_DARK_THEME;


const MapContainerBox = ({ stations = [], hoveredStationId = null, setHoveredStationId }) => {
  const { appTheme } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
    
  const customIcon = useMemo(() => {
    const iconColorClass = 'text-primary'
    
    const customSvgHtml = `
      <div class="${iconColorClass}" style="filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      </div>
    `;

    return new L.divIcon({
      html: customSvgHtml,
      className: 'bg-transparent',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, []);

  const hoveredIcon = useMemo(() => {
    const iconColorClass = 'text-secondary'
    
    const customSvgHtml = `
      <div class="${iconColorClass}" style="filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      </div>
    `;

    return new L.divIcon({
      html: customSvgHtml,
      className: 'bg-transparent',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  const handleMarkerClick = (station, index) => {
    const selectedStationPayload = { ...station, listId: index };
    dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload });
    navigate(`/station/${station.label}`);
  };

  const getTileUrl = (theme) => {
    const cartoDbUrl = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
    
    const style = theme === themeDark? 'dark_nolabels' : 'light_nolabels';
    
    return cartoDbUrl.replace('{style}', style);
  };
  
  const tileUrl = getTileUrl(appTheme);

  return (
    <div className="h-[70vh] relative z-0">
      <MapContainer className="card shadow-xl" key={appTheme} center={[55.1, -3.018]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
          if (stations) {
            stations.map((station, index) => {
              const isHovered = hoveredStationId === station.station_id;
              return(
                <Marker
                  key={station.station_id} 
                  position={[station.lat, station.lon]}
                  eventHandlers={{
                    click: () => handleMarkerClick(station, index),
                    mouseover: () => setHoveredStationId(station.station_id),
                    mouseout: () => setHoveredStationId(null)
                  }}
                  icon={isHovered ? hoveredIcon : customIcon}>

                  <Tooltip>
                    <div className="text-neutral font-bold">{station.label}</div>
                    <div className="text-neutral">Latest reading:<br/>{moment.utc(station.date_time).format('D MMMM YYYY, hh:mm')}</div>
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
  const [hoveredStationId, setHoveredStationId] = useState(null);

  return (
    <Layout>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight">TideNet</h1>
            <p className="text-2xl font-light text-muted-foreground">
                near real-time tide and surge readings
            </p>
          </div>


          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="card border border-base-200 shadow-xl bg-base-100">
                <div className="card-body gap-4 p-4">
                  <div className="flex items-center gap-2">
                    <MapPinned className="w-5 h-5" />
                    <h2 className="card-title text-lg">Map View</h2>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-base-content/50" />
                    <p className="text-sm text-base-content/50">Click a marker to view detailed tide data</p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="flex justify-center items-center h-[70vh]">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                ) : !error ? (
                  <MapContainerBox stations={stations} hoveredStationId={hoveredStationId} setHoveredStationId={setHoveredStationId} />
                ) : 
                  <div className="m-4">
                    <AlertBox type="ERROR" message={error?.response?.data?.detail || error.message || String(error)} />
                  </div>
                }
              </div>
            </div>

            {/* Recent Readings Section */}
            <div className="card border border-base-200 shadow-xl bg-base-100 flex flex-col gap-4">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <Waves className="w-5 h-5" />
                  <h2 className="card-title text-lg">Recent readings</h2>
                </div>
                
                <StationCardsCollection 
                  stations={stations} 
                  hoveredStationId={hoveredStationId} 
                  setHoveredStationId={setHoveredStationId} 
                />
              </div>
            </div>
          </div>

        </div>
    </Layout>
  );
};

export default MainPage;