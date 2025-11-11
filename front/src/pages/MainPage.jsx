import { useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
// Map imports
import { MapContainer, TileLayer, useMap, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet';


const MapContainerBox = ({ stations = []}) => {
  const { appTheme } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
    
  const customIcon = useMemo(() => {
    const iconColorClass = 'text-primary'
    
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
      className: 'bg-transparent',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, []);

  const handleMarkerClick = (station, index) => {
    const selectedStationPayload = { ...station, listId: index };
    dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload });
    navigate(`/station/${station.label}`);
  };

  const getTileUrl = (theme) => {
    const cartoDbUrl = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';
    
    const style = theme === 'dark'? 'dark_nolabels' : 'light_nolabels';
    
    return cartoDbUrl.replace('{style}', style);
  };
  
  const tileUrl = getTileUrl(appTheme);

  return (
    <div className="h-[70vh] w-full">
      <MapContainer className="card shadow-xl" key={appTheme} center={[55.1, -3.018]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
          if (stations) {
            stations.map((station, index) => {
              return(
                <Marker
                  key={station.station_id} 
                  position={[station.lat, station.lon]}
                  eventHandlers={{click: () => handleMarkerClick(station, index)}}
                  icon={customIcon}>

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